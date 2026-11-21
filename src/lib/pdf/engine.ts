import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import { openPdfJs, renderPage, canvasToBlob } from './pdfjs'
import { saveBytes } from '../download'

export type Bytes = Uint8Array

export async function fileToBytes(file: File | Blob): Promise<Bytes> {
  const buf = await file.arrayBuffer()
  return new Uint8Array(buf)
}

async function load(bytes: Bytes): Promise<PDFDocument> {
  return PDFDocument.load(bytes, { ignoreEncryption: true })
}

/* ---------------- Merge ---------------- */
export async function mergePdfs(files: Bytes[]): Promise<Bytes> {
  const out = await PDFDocument.create()
  for (const f of files) {
    const src = await load(f)
    const pages = await out.copyPages(src, src.getPageIndices())
    pages.forEach((p) => out.addPage(p))
  }
  return out.save()
}

/* ---------------- Extract / delete / reorder ---------------- */
export async function extractPages(bytes: Bytes, indices: number[]): Promise<Bytes> {
  const src = await load(bytes)
  const out = await PDFDocument.create()
  const pages = await out.copyPages(src, indices)
  pages.forEach((p) => out.addPage(p))
  return out.save()
}

export async function deletePages(bytes: Bytes, remove: number[]): Promise<Bytes> {
  const src = await load(bytes)
  const keep = src.getPageIndices().filter((i) => !remove.includes(i))
  return extractPages(bytes, keep)
}

export async function reorderPages(bytes: Bytes, order: number[]): Promise<Bytes> {
  return extractPages(bytes, order)
}

/** Unified organize/delete/extract/rotate: ordered list of source pages + absolute rotation. */
export async function applyPageOps(
  bytes: Bytes,
  ops: { srcIndex: number; rotation: number }[],
): Promise<Bytes> {
  const src = await load(bytes)
  const out = await PDFDocument.create()
  const pages = await out.copyPages(src, ops.map((o) => o.srcIndex))
  pages.forEach((p, i) => {
    p.setRotation(degrees(((ops[i].rotation % 360) + 360) % 360))
    out.addPage(p)
  })
  return out.save()
}

/** Read each page's existing rotation (degrees). */
export async function pageRotations(bytes: Bytes): Promise<number[]> {
  const doc = await load(bytes)
  return doc.getPages().map((p) => p.getRotation().angle)
}

/* ---------------- Rotate ---------------- */
export async function rotatePdf(bytes: Bytes, angle: number, indices?: number[]): Promise<Bytes> {
  const doc = await load(bytes)
  const targets = indices ?? doc.getPageIndices()
  for (const i of targets) {
    const page = doc.getPage(i)
    const current = page.getRotation().angle
    page.setRotation(degrees((current + angle) % 360))
  }
  return doc.save()
}

/* ---------------- Images -> PDF ---------------- */
export interface ImageInput {
  bytes: Bytes
  type: string
}
export async function imagesToPdf(
  images: ImageInput[],
  opts: { pageSize: 'fit' | 'a4'; margin: number } = { pageSize: 'fit', margin: 0 },
): Promise<Bytes> {
  const out = await PDFDocument.create()
  const A4 = { w: 595.28, h: 841.89 }
  for (const img of images) {
    const isPng = /png/i.test(img.type)
    const embedded = isPng ? await out.embedPng(img.bytes) : await out.embedJpg(img.bytes)
    const iw = embedded.width
    const ih = embedded.height
    if (opts.pageSize === 'fit') {
      const page = out.addPage([iw + opts.margin * 2, ih + opts.margin * 2])
      page.drawImage(embedded, { x: opts.margin, y: opts.margin, width: iw, height: ih })
    } else {
      const page = out.addPage([A4.w, A4.h])
      const availW = A4.w - opts.margin * 2
      const availH = A4.h - opts.margin * 2
      const scale = Math.min(availW / iw, availH / ih)
      const w = iw * scale
      const h = ih * scale
      page.drawImage(embedded, {
        x: (A4.w - w) / 2,
        y: (A4.h - h) / 2,
        width: w,
        height: h,
      })
    }
  }
  return out.save()
}

/* ---------------- PDF -> images ---------------- */
export interface RenderedImage {
  name: string
  blob: Blob
  dataUrl: string
}
export async function pdfToImages(
  bytes: Bytes,
  format: 'jpeg' | 'png',
  scale = 2,
  baseName = 'page',
): Promise<RenderedImage[]> {
  const doc = await openPdfJs(bytes)
  const results: RenderedImage[] = []
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
  const ext = format === 'jpeg' ? 'jpg' : 'png'
  for (let i = 1; i <= doc.numPages; i++) {
    const canvas = await renderPage(doc, i, scale)
    const blob = await canvasToBlob(canvas, mime, format === 'jpeg' ? 0.92 : undefined)
    const dataUrl = canvas.toDataURL(mime, format === 'jpeg' ? 0.92 : undefined)
    results.push({ name: `${baseName}-${i}.${ext}`, blob, dataUrl })
  }
  await doc.destroy()
  return results
}

/* ---------------- Compress ---------------- */
export type CompressLevel = 'basic' | 'recommended' | 'extreme'
export async function compressPdf(bytes: Bytes, level: CompressLevel): Promise<Bytes> {
  // lossless-ish re-save with object streams (preserves text/vector)
  const basicDoc = await load(bytes)
  const basic = await basicDoc.save({ useObjectStreams: true })
  if (level === 'basic') {
    return basic.length < bytes.length ? basic : bytes
  }
  // rasterize pages to JPEG (helps image-heavy / scanned PDFs)
  const scale = level === 'recommended' ? 1.5 : 1.0
  const quality = level === 'recommended' ? 0.72 : 0.5
  const doc = await openPdfJs(bytes)
  const out = await PDFDocument.create()
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const vp = page.getViewport({ scale: 1 })
    const canvas = await renderPage(doc, i, scale)
    const blob = await canvasToBlob(canvas, 'image/jpeg', quality)
    const jpgBytes = new Uint8Array(await blob.arrayBuffer())
    const embedded = await out.embedJpg(jpgBytes)
    const p = out.addPage([vp.width, vp.height])
    p.drawImage(embedded, { x: 0, y: 0, width: vp.width, height: vp.height })
    page.cleanup()
  }
  await doc.destroy()
  const raster = await out.save()
  // never inflate: keep the smallest of original / basic / rasterized
  return [bytes, basic, raster].reduce((a, b) => (b.length < a.length ? b : a))
}

/* ---------------- Watermark ---------------- */
export async function watermarkPdf(
  bytes: Bytes,
  text: string,
  opts: { opacity: number; size: number; diagonal: boolean; color: [number, number, number] },
): Promise<Bytes> {
  const doc = await load(bytes)
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize()
    const textWidth = font.widthOfTextAtSize(text, opts.size)
    const x = (width - textWidth) / 2
    const y = height / 2
    page.drawText(text, {
      x: opts.diagonal ? x : x,
      y,
      size: opts.size,
      font,
      color: rgb(opts.color[0], opts.color[1], opts.color[2]),
      opacity: opts.opacity,
      rotate: opts.diagonal ? degrees(45) : degrees(0),
    })
  }
  return doc.save()
}

/* ---------------- Number pages ---------------- */
export async function numberPages(
  bytes: Bytes,
  opts: { position: 'bottom-center' | 'bottom-right' | 'top-center'; size: number; start: number },
): Promise<Bytes> {
  const doc = await load(bytes)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  pages.forEach((page, idx) => {
    const { width, height } = page.getSize()
    const label = String(opts.start + idx)
    const tw = font.widthOfTextAtSize(label, opts.size)
    let x = (width - tw) / 2
    let y = 24
    if (opts.position === 'bottom-right') x = width - tw - 32
    if (opts.position === 'top-center') y = height - opts.size - 20
    page.drawText(label, { x, y, size: opts.size, font, color: rgb(0.1, 0.1, 0.1) })
  })
  return doc.save()
}

/* ---------------- Sign (place signature image) ---------------- */
export async function signPdf(
  bytes: Bytes,
  signaturePng: Bytes,
  placement: { pageIndex: number; x: number; y: number; width: number },
): Promise<Bytes> {
  const doc = await load(bytes)
  const png = await doc.embedPng(signaturePng)
  const page = doc.getPage(placement.pageIndex)
  const ratio = png.height / png.width
  page.drawImage(png, {
    x: placement.x,
    y: placement.y,
    width: placement.width,
    height: placement.width * ratio,
  })
  return doc.save()
}

/* ---------------- helpers ---------------- */
export function downloadBytes(bytes: Bytes, filename: string, mime = 'application/pdf') {
  saveBytes(bytes, filename, mime)
}

export function formatSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}
