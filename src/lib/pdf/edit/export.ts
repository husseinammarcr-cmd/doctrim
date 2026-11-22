import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib'
import { canvasToBlob, renderPage, type PdfJsDoc } from '../pdfjs'
import { STANDARD_FONT, fontKey, layoutText } from './metrics'
import {
  baselineOffset,
  detectDir,
  hexToRgb01,
  isWinAnsi,
  type EditPage,
  type ImageItem,
  type InkItem,
  type Item,
  type ItemsMap,
  type ShapeItem,
  type TextItem,
} from './types'

/**
 * Flattens the editor state onto the original PDF.
 *
 * Two code paths:
 *  - the fast path edits the original document in place, preserving forms,
 *    bookmarks, annotations, metadata and the page tree;
 *  - when a page must be flattened (redaction / rotated page with edits) a new
 *    document is assembled and those pages are rasterised at 200 dpi first, so
 *    hidden text under a blackout cannot be recovered.
 */

export interface ExportInput {
  bytes: Uint8Array
  pages: EditPage[]
  items: ItemsMap
  flattenRedactions: boolean
  pdfjsDoc?: PdfJsDoc | null
  onProgress?: (ratio: number, label: string) => void
}

const FLATTEN_DPI = 200
const RAD = Math.PI / 180

interface CanvasBox {
  /** crop-box origin in PDF user space */
  cx: number
  cy: number
  /** crop-box height */
  ch: number
}

function rotatePoint(x: number, y: number, cx: number, cy: number, deg: number) {
  if (!deg) return { x, y }
  const a = deg * RAD
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const dx = x - cx
  const dy = y - cy
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos }
}

function pageBox(page: PDFPage): CanvasBox {
  const crop = page.getCropBox()
  return { cx: crop.x, cy: crop.y, ch: crop.height }
}

/** display (top-left, y down) -> PDF (bottom-left, y up) */
function toPdf(x: number, y: number, box: CanvasBox) {
  return { x: box.cx + x, y: box.cy + box.ch - y }
}

function dataUrlBytes(dataUrl: string) {
  const b64 = dataUrl.split(',')[1] || ''
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function rasteriseText(item: TextItem): Promise<string> {
  const scale = 4
  const layout = layoutText(item)
  const pad = 2
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil((item.w + pad * 2) * scale))
  canvas.height = Math.max(1, Math.ceil((item.h + pad * 2) * scale))
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.translate(pad, pad)
  ctx.font = `${item.italic ? 'italic ' : ''}${item.bold ? '700' : '400'} ${item.size}px ${
    { helvetica: 'Helvetica, Arial, sans-serif', times: '"Times New Roman", Times, serif', courier: '"Courier New", Courier, monospace' }[
      item.family
    ]
  }`
  ctx.fillStyle = item.color
  ctx.textBaseline = 'alphabetic'
  ctx.direction = detectDir(item.text) === 'rtl' ? 'rtl' : 'ltr'
  ctx.textAlign = item.align === 'center' ? 'center' : item.align === 'right' ? 'right' : 'left'
  layout.lines.forEach((line, i) => {
    const x = item.align === 'center' ? item.w / 2 : item.align === 'right' ? item.w : 0
    ctx.fillText(line, x, baselineOffset(item, i))
  })
  return canvas.toDataURL('image/png')
}

async function drawText(page: PDFPage, item: TextItem, box: CanvasBox, getFont: (key: ReturnType<typeof fontKey>) => Promise<PDFFont>) {
  const H = box.ch
  const cx = item.x + item.w / 2
  const cy = item.y + item.h / 2

  if (item.background) {
    const p = rotatePoint(item.x, item.y + item.h, cx, cy, item.rotation)
    const anchor = toPdf(p.x, p.y, box)
    page.drawRectangle({
      x: anchor.x,
      y: anchor.y,
      width: item.w,
      height: item.h,
      color: rgb(...Object.values(hexToRgb01(item.background)) as [number, number, number]),
      opacity: item.opacity,
      rotate: degrees(-item.rotation),
    })
  }

  if (!isWinAnsi(item.text)) {
    // Complex scripts (Arabic, Hebrew, Cyrillic, CJK…) are shaped by the
    // browser and embedded as a high-resolution transparent image, which
    // keeps the visual result correct even without a PDF shaping engine.
    const png = await rasteriseText(item)
    const bytes = dataUrlBytes(png)
    const img = await page.doc.embedPng(bytes)
    const bottomLeft = rotatePoint(item.x, item.y + item.h, cx, cy, item.rotation)
    const a = toPdf(bottomLeft.x, bottomLeft.y, box)
    page.drawImage(img, {
      x: a.x,
      y: a.y,
      width: item.w,
      height: item.h,
      rotate: degrees(-item.rotation),
      opacity: item.opacity,
    })
    return
  }

  const font = await getFont(fontKey(item.family, item.bold, item.italic))
  const layout = layoutText(item)
  for (let i = 0; i < layout.lines.length; i++) {
    const line = layout.lines[i]
    if (!line) continue
    const lw = font.widthOfTextAtSize(line, item.size)
    const dx = item.align === 'center' ? (item.w - lw) / 2 : item.align === 'right' ? item.w - lw : 0
    const bx = item.x + dx
    const by = item.y + baselineOffset(item, i)
    const p = rotatePoint(bx, by, cx, cy, item.rotation)
    const anchor = toPdf(p.x, p.y, box)
    page.drawText(line, {
      x: anchor.x,
      y: anchor.y,
      size: item.size,
      font,
      color: rgb(...Object.values(hexToRgb01(item.color)) as [number, number, number]),
      opacity: item.opacity,
      rotate: degrees(-item.rotation),
    })
  }
}

function drawShape(page: PDFPage, item: ShapeItem, box: CanvasBox) {
  const cx = item.x + item.w / 2
  const cy = item.y + item.h / 2
  const opacity = item.opacity
  const stroke = item.stroke ? rgb(...Object.values(hexToRgb01(item.stroke)) as [number, number, number]) : undefined
  const fill = item.fill ? rgb(...Object.values(hexToRgb01(item.fill)) as [number, number, number]) : undefined
  const dash = item.dash ? { borderDashArray: [4, 3] as number[] } : {}

  if (item.kind === 'rect') {
    const p = rotatePoint(item.x, item.y + item.h, cx, cy, item.rotation)
    const anchor = toPdf(p.x, p.y, box)
    page.drawRectangle({
      x: anchor.x,
      y: anchor.y,
      width: Math.max(0.5, item.w),
      height: Math.max(0.5, item.h),
      color: fill,
      opacity: fill ? opacity : undefined,
      borderColor: stroke,
      borderOpacity: stroke ? opacity : undefined,
      borderWidth: stroke ? item.strokeWidth : undefined,
      rotate: degrees(-item.rotation),
      ...dash,
    })
    return
  }

  if (item.kind === 'ellipse') {
    const c = toPdf(cx, cy, box)
    page.drawEllipse({
      x: c.x,
      y: c.y,
      xScale: item.w / 2,
      yScale: item.h / 2,
      color: fill,
      opacity: fill ? opacity : undefined,
      borderColor: stroke,
      borderOpacity: stroke ? opacity : undefined,
      borderWidth: stroke ? item.strokeWidth : undefined,
      rotate: degrees(-item.rotation),
      ...dash,
    })
    return
  }

  // line / arrow
  const startY = item.diag === 1 ? 0 : item.h
  const endY = item.diag === 1 ? item.h : 0
  const a = rotatePoint(item.x, item.y + startY, cx, cy, item.rotation)
  const b = rotatePoint(item.x + item.w, item.y + endY, cx, cy, item.rotation)
  const start = toPdf(a.x, a.y, box)
  const end = toPdf(b.x, b.y, box)
  page.drawLine({
    start,
    end,
    thickness: item.strokeWidth,
    color: stroke || rgb(0, 0, 0),
    opacity,
    lineCap: 0,
    ...(item.dash ? { dashArray: [4, 3] } : {}),
  })

  if (item.kind === 'arrow') {
    const ang = Math.atan2(end.y - start.y, end.x - start.x)
    const len = Math.max(9, item.strokeWidth * 5.2)
    const h1 = { x: end.x - len * Math.cos(ang - 0.42), y: end.y - len * Math.sin(ang - 0.42) }
    const h2 = { x: end.x - len * Math.cos(ang + 0.42), y: end.y - len * Math.sin(ang + 0.42) }
    // SVG paths use a y-down coordinate system anchored at the page box corner
    const top = box.cy + box.ch
    const d = (p: { x: number; y: number }) => `${(p.x - box.cx).toFixed(2)} ${(top - p.y).toFixed(2)}`
    page.drawSvgPath(
      `M ${d(end)} L ${d(h1)} L ${d(h2)} Z`,
      {
        x: box.cx,
        y: top,
        color: stroke || rgb(0, 0, 0),
        opacity,
        borderColor: stroke || rgb(0, 0, 0),
        borderWidth: 0.5,
      },
    )
  }
}

function drawInk(page: PDFPage, item: InkItem, box: CanvasBox) {
  const cx = item.x + item.w / 2
  const cy = item.y + item.h / 2
  const color = rgb(...Object.values(hexToRgb01(item.color)) as [number, number, number])
  for (const stroke of item.strokes) {
    if (stroke.length < 2) continue
    const pts = stroke.map(([nx, ny]) => {
      const p = rotatePoint(item.x + nx * item.w, item.y + ny * item.h, cx, cy, item.rotation)
      return p
    })
    // one path per stroke, so lifting the pen between words stays visually clean
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
    page.drawSvgPath(d, {
      x: box.cx,
      y: box.cy + box.ch,
      borderColor: color,
      borderWidth: item.width,
      borderOpacity: item.opacity,
      borderLineCap: 1,
    })
  }
}

async function drawItem(
  page: PDFPage,
  item: Item,
  box: CanvasBox,
  getFont: (key: ReturnType<typeof fontKey>) => Promise<PDFFont>,
  images: Map<string, PDFImage>,
  pdf: PDFDocument,
) {
  const opacity = item.opacity
  switch (item.type) {
    case 'text':
      await drawText(page, item, box, getFont)
      break
    case 'cover': {
      const c = toPdf(item.x, item.y + item.h, box)
      page.drawRectangle({
        x: c.x,
        y: c.y,
        width: item.w,
        height: item.h,
        color: rgb(...Object.values(hexToRgb01(item.color)) as [number, number, number]),
      })
      break
    }
    case 'shape':
      drawShape(page, item, box)
      break
    case 'ink':
      drawInk(page, item, box)
      break
    case 'image': {
      let img = images.get(item.dataUrl)
      if (!img) {
        const bytes = dataUrlBytes(item.dataUrl)
        img = item.dataUrl.startsWith('data:image/jpeg') || item.dataUrl.startsWith('data:image/jpg')
          ? await pdf.embedJpg(bytes)
          : await pdf.embedPng(bytes)
        images.set(item.dataUrl, img)
      }
      const cx = item.x + item.w / 2
      const cy = item.y + item.h / 2
      const bottomLeft = rotatePoint(item.x, item.y + item.h, cx, cy, item.rotation)
      const a = toPdf(bottomLeft.x, bottomLeft.y, box)
      page.drawImage(img, {
        x: a.x,
        y: a.y,
        width: item.w,
        height: item.h,
        rotate: degrees(-item.rotation),
        opacity,
      })
      break
    }
  }
}

function needsFlatten(list: Item[], flattenRedactions: boolean, rotated: boolean) {
  if (list.length === 0) return false
  if (rotated) return true
  if (!flattenRedactions) return false
  return list.some((i) => i.type === 'shape' && i.redact)
}

export async function exportEditedPdf(input: ExportInput): Promise<Uint8Array> {
  const { bytes, pages, items, flattenRedactions, pdfjsDoc, onProgress } = input
  const visible = (list: Item[]) => list.filter((i) => !i.hidden)

  onProgress?.(0.04, 'Opening document…')
  const src = await PDFDocument.load(bytes, { updateMetadata: false })
  const srcPages = src.getPages()
  if (srcPages.length !== pages.length) {
    throw new Error('This PDF changed while editing — reload the file and try again.')
  }

  // Pages that must be rasterised: redactions (so covered text is really gone)
  // and rotated pages that carry edits (their display space ≠ PDF user space).
  const flattenPages = new Set<number>()
  for (const p of pages) {
    const list = visible(items[p.id] || [])
    if (!list.length) continue
    const rotation = ((srcPages[p.srcIndex].getRotation().angle % 360) + 360) % 360
    if (needsFlatten(list, flattenRedactions, rotation !== 0)) flattenPages.add(p.srcIndex)
  }

  if (flattenPages.size === 0) {
    // ---- fast path: edit in place, preserve forms, outlines & annotations --
    const doc = src
    const fonts = new Map<string, PDFFont>()
    const getFont = async (key: ReturnType<typeof fontKey>) => {
      let f = fonts.get(key)
      if (!f) {
        f = await doc.embedFont(STANDARD_FONT[key])
        fonts.set(key, f)
      }
      return f
    }
    const images = new Map<string, PDFImage>()
    let done = 0
    for (const meta of pages) {
      const page = doc.getPages()[meta.srcIndex]
      const list = visible(items[meta.id] || [])
      if (list.length && page) {
        const box = pageBox(page)
        for (const it of list) await drawItem(page, it, box, getFont, images, doc)
      }
      done++
      onProgress?.(0.05 + (done / pages.length) * 0.88, `Applying edits to page ${done} of ${pages.length}`)
    }
    doc.setProducer('DocTrim PDF Editor')
    doc.setModificationDate(new Date())
    onProgress?.(0.96, 'Saving…')
    const out = await doc.save({ useObjectStreams: true })
    onProgress?.(1, 'Done')
    return out
  }

  // ---- rebuild path: rasterise the pages that must be flattened -----------
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, src.getPageIndices())
  copied.forEach((p) => out.addPage(p))

  const fonts = new Map<string, PDFFont>()
  const getFont = async (key: ReturnType<typeof fontKey>) => {
    let f = fonts.get(key)
    if (!f) {
      f = await out.embedFont(STANDARD_FONT[key])
      fonts.set(key, f)
    }
    return f
  }
  const images = new Map<string, PDFImage>()

  let done = 0
  for (const meta of pages) {
    const list = visible(items[meta.id] || [])
    const idx = meta.srcIndex
    if (flattenPages.has(idx)) {
      onProgress?.(0.1 + (done / pages.length) * 0.7, `Rasterising page ${idx + 1}…`)
      let pngBytes: Uint8Array | null = null
      if (pdfjsDoc) {
        const canvas = await renderPage(pdfjsDoc, idx + 1, FLATTEN_DPI / 72)
        const blob = await canvasToBlob(canvas, 'image/png')
        pngBytes = new Uint8Array(await blob.arrayBuffer())
      }
      // replace the copied page; insertPage keeps the page order stable
      out.removePage(idx)
      const page = out.insertPage(idx, [meta.width, meta.height])
      if (pngBytes) {
        const img = await out.embedPng(pngBytes)
        page.drawImage(img, { x: 0, y: 0, width: meta.width, height: meta.height })
      } else {
        page.drawRectangle({ x: 0, y: 0, width: meta.width, height: meta.height, color: rgb(1, 1, 1) })
      }
      const box = pageBox(page)
      for (const it of list) await drawItem(page, it, box, getFont, images, out)
    } else {
      const page = out.getPages()[idx]
      if (page) {
        const box = pageBox(page)
        for (const it of list) await drawItem(page, it, box, getFont, images, out)
      }
    }
    done++
    onProgress?.(0.1 + (done / pages.length) * 0.82, `Applying edits to page ${done} of ${pages.length}`)
  }

  out.setProducer('DocTrim PDF Editor')
  out.setModificationDate(new Date())
  onProgress?.(0.96, 'Saving…')
  const result = await out.save({ useObjectStreams: true })
  onProgress?.(1, 'Done')
  return result
}
