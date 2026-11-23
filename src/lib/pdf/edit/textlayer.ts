import * as pdfjsLib from 'pdfjs-dist'
import type { PdfJsDoc } from '../pdfjs'
import {
  detectDir,
  uid,
  type CoverItem,
  type FontFamily,
  type Item,
  type TextItem,
  FONT_METRICS,
  clamp,
} from './types'

/**
 * Extracts the existing text of a page as editable blocks (paragraph-ish
 * groups of lines) with real geometry, font information and — sampled from the
 * rendered canvas — the text colour and the page background colour. Replacing a
 * block means covering its bbox with the sampled background and drawing the new
 * text on top.
 */

export interface SourceLine {
  text: string
  x: number
  y: number
  w: number
  h: number
  baseline: number
  size: number
  family: FontFamily
  bold: boolean
  italic: boolean
}

export interface SourceBlock {
  id: string
  pageIndex: number
  x: number
  y: number
  w: number
  h: number
  baseline: number
  text: string
  size: number
  family: FontFamily
  bold: boolean
  italic: boolean
  color: string
  bg: string
  lineCount: number
  lineHeight: number
  dir: 'ltr' | 'rtl'
  /** Per-line geometry, used by the true text-rewrite path. */
  lines: SourceLine[]
}

function familyFromFont(name: string, generic = ''): FontFamily {
  const s = `${name} ${generic}`.toLowerCase()
  if (/courier|mono|consol|menlo/.test(s)) return 'courier'
  if (/times|serif|georgia|garamond|minion|bookman|roman|caslon|baskerville/.test(s) && !/sans/.test(s)) return 'times'
  return 'helvetica'
}

interface RawGlyph {
  str: string
  left: number
  right: number
  baseline: number
  top: number
  height: number
  family: FontFamily
  bold: boolean
  italic: boolean
  width: number
}

export async function extractTextBlocks(doc: PdfJsDoc, pageNumber: number, canvas?: HTMLCanvasElement): Promise<SourceBlock[]> {
  const page = await doc.getPage(pageNumber)
  try {
    const viewport = page.getViewport({ scale: 1 })
    const tc = (await page.getTextContent()) as any
    const styles: Record<string, { fontFamily?: string; ascent?: number; descent?: number }> = tc.styles || {}
    const glyphs: RawGlyph[] = []

    for (const it of tc.items as any[]) {
      if (!it || typeof it.str !== 'string' || !it.str.trim()) continue
      const tx = (pdfjsLib as any).Util.transform(viewport.transform, it.transform)
      const width = Math.hypot(tx[2], tx[3])
      if (!isFinite(width) || width <= 0) continue
      const style = styles[it.fontName] || {}
      const ascent = style.ascent && style.ascent > 0 ? style.ascent : 0.8
      const descent = style.descent && style.descent > 0 ? style.descent : 0.2
      const asc = ascent / (ascent + descent)
      const left = tx[4]
      const baseline = tx[5]
      const fontSize = Math.abs(it.height || width) || heightFromTransform(tx)
      const glyphW = Math.abs(it.width || 0) || width
      const fontName = String(it.fontName || '')
      const generic = style.fontFamily || ''
      const family = familyFromFont(fontName, generic)
      const bold = /bold|black|heavy|semibold|demi|extrabold/i.test(`${fontName} ${generic}`)
      const italic = /italic|oblique/i.test(`${fontName} ${generic}`)
      glyphs.push({
        str: it.str,
        left,
        right: left + glyphW,
        baseline,
        top: baseline - fontSize * asc,
        height: fontSize,
        family,
        bold,
        italic,
        width: glyphW,
      })
    }

    if (glyphs.length === 0) return []

    // ---- group glyphs into visual lines -----------------------------------
    glyphs.sort((a, b) => b.baseline - a.baseline || a.left - b.left)
    const lines: RawGlyph[][] = []
    for (const g of glyphs) {
      const line = lines.find((l) => {
        const ref = l[0]
        const tol = Math.max(1.5, Math.min(ref.height, g.height) * 0.32)
        return Math.abs(ref.baseline - g.baseline) <= tol && Math.abs(ref.height - g.height) <= Math.max(2, ref.height * 0.35)
      })
      if (line) line.push(g)
      else lines.push([g])
    }

    const merged: SourceLine[] = []
    for (const group of lines) {
      group.sort((a, b) => a.left - b.left)
      let text = ''
      let prevRight = -Infinity
      for (const g of group) {
        if (text && g.left - prevRight > Math.min(g.height, 14) * 0.18 && !/\s$/.test(text) && !/^\s/.test(g.str)) {
          text += ' '
        }
        text += g.str
        prevRight = Math.max(prevRight, g.right)
      }
      if (!text.trim()) continue
      const left = Math.min(...group.map((g) => g.left))
      const right = Math.max(...group.map((g) => g.right))
      const base = group[0]
      merged.push({
        text: text.replace(/\u00ad/g, '').trimEnd(),
        x: left,
        y: Math.min(...group.map((g) => g.top)),
        w: Math.max(1, right - left),
        h: Math.max(...group.map((g) => g.top + g.height)) - Math.min(...group.map((g) => g.top)),
        baseline: base.baseline,
        size: Math.max(4, base.height),
        family: base.family,
        bold: base.bold,
        italic: base.italic,
      })
    }

    merged.sort((a, b) => a.y - b.y || a.x - b.x)

    // ---- merge lines into paragraph blocks --------------------------------
    const blocks: SourceBlock[] = []
    for (const line of merged) {
      const prev = blocks[blocks.length - 1]
      const canJoin =
        prev &&
        Math.abs(prev.size - line.size) <= Math.max(1.2, prev.size * 0.12) &&
        prev.family === line.family &&
        prev.bold === line.bold &&
        prev.italic === line.italic &&
        line.y - (prev.y + prev.h) <= Math.max(3.5, prev.size * 0.8) &&
        line.y - (prev.y + prev.h) > -prev.h * 0.6 &&
        (Math.abs(line.x - prev.x) <= Math.max(4, line.size * 0.8) ||
          Math.abs(line.x + line.w - (prev.x + prev.w)) <= Math.max(4, line.size * 0.8) ||
          Math.abs(line.x + line.w / 2 - (prev.x + prev.w / 2)) <= Math.max(4, line.size * 0.8)) &&
        !(prev.x + prev.w < line.x || line.x + line.w < prev.x)

      if (canJoin) {
        const right = Math.max(prev.x + prev.w, line.x + line.w)
        const bottom = Math.max(prev.y + prev.h, line.y + line.h)
        prev.text += `\n${line.text}`
        prev.w = right - prev.x
        prev.h = bottom - prev.y
        prev.lineCount += 1
        prev.dir = detectDir(prev.text)
        prev.lines.push(line)
      } else {
        blocks.push({
          id: uid(),
          pageIndex: pageNumber,
          x: line.x,
          y: line.y,
          w: line.w,
          h: line.h,
          baseline: line.baseline,
          text: line.text,
          size: line.size,
          family: line.family,
          bold: line.bold,
          italic: line.italic,
          color: '#111827',
          bg: '#ffffff',
          lineCount: 1,
          lineHeight: 1.25,
          dir: detectDir(line.text),
          lines: [line],
        })
      }
    }

    for (const b of blocks) {
      const spread = b.lineCount > 1 ? b.h / b.lineCount : b.size * 1.25
      b.lineHeight = clamp(spread / b.size, 1.05, 2.4)
      if (canvas) {
        const sampled = sampleBlockColors(canvas, b, canvas.width / viewport.width)
        b.color = sampled.color
        b.bg = sampled.bg
      }
    }

    return blocks
  } finally {
    page.cleanup()
  }
}

function heightFromTransform(tx: number[]): number {
  return Math.hypot(tx[1], tx[3]) || 12
}

function parseHex(hex: string) {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function toHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`
}

/** Sample background + ink colour of a text block from the rendered page. */
export function sampleBlockColors(
  canvas: HTMLCanvasElement,
  block: { x: number; y: number; w: number; h: number },
  scale = 1,
) {
  const fallback = { color: '#111827', bg: '#ffffff' }
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return fallback
    const px = (x: number) => Math.round(x * scale)
    const py = (y: number) => Math.round(y * scale)
    const x0 = clamp(px(block.x) - 3, 0, canvas.width - 1)
    const x1 = clamp(px(block.x + block.w) + 3, 0, canvas.width - 1)
    const y0 = clamp(py(block.y) - 3, 0, canvas.height - 1)
    const y1 = clamp(py(block.y + block.h) + 3, 0, canvas.height - 1)
    if (x1 - x0 < 2 || y1 - y0 < 2) return fallback

    const data = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data
    const iw = x1 - x0
    const ih = y1 - y0

    // background = most common colour on the outer 2px ring
    const hist = new Map<string, number>()
    const add = (idx: number) => {
      const key = toHex(data[idx], data[idx + 1], data[idx + 2])
      hist.set(key, (hist.get(key) || 0) + 1)
    }
    for (let x = 0; x < iw; x++) {
      for (const y of [0, 1, ih - 2, ih - 1]) if (y >= 0 && y < ih) add((y * iw + x) * 4)
    }
    for (let y = 0; y < ih; y++) {
      for (const x of [0, 1, iw - 2, iw - 1]) if (x >= 0 && x < iw) add((y * iw + x) * 4)
    }
    let bg = '#ffffff'
    let bgCount = -1
    for (const [k, v] of hist) {
      if (v > bgCount) {
        bg = k
        bgCount = v
      }
    }

    // ink = average of pixels farthest from the background
    const bgRgb = parseHex(bg)
    let sum = { r: 0, g: 0, b: 0 }
    let count = 0
    let bestDist = 0
    const samples: { r: number; g: number; b: number; d: number }[] = []
    for (let y = Math.floor(ih * 0.15); y < ih * 0.9; y += Math.max(1, Math.round(ih / 40))) {
      for (let x = Math.floor(iw * 0.02); x < iw * 0.98; x += Math.max(1, Math.round(iw / 160))) {
        const i = (y * iw + x) * 4
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const d = Math.abs(r - bgRgb.r) + Math.abs(g - bgRgb.g) + Math.abs(b - bgRgb.b)
        if (d > bestDist) bestDist = d
        if (d > 90) samples.push({ r, g, b, d })
      }
    }
    const strong = samples.filter((s) => s.d > bestDist * 0.55)
    for (const s of strong.slice(0, 800)) {
      sum = { r: sum.r + s.r, g: sum.g + s.g, b: sum.b + s.b }
      count++
    }
    if (count < 6) return { color: '#111827', bg }
    return { color: toHex(sum.r / count, sum.g / count, sum.b / count), bg }
  } catch {
    return fallback
  }
}

/**
 * Turn a source block into editor items: a cover patch matching the page
 * background, followed by the edited text drawn on top of it.
 */
export function blockReplacement(block: SourceBlock, newText: string): Item[] {
  const cover: CoverItem = {
    id: uid(),
    type: 'cover',
    x: block.x - 2,
    y: block.y - 1,
    w: block.w + 4,
    h: block.h + 2,
    rotation: 0,
    opacity: 1,
    color: block.bg,
  }
  const trimmed = newText.replace(/\r\n?/g, '\n')
  if (!trimmed.trim()) return [cover]

  const m = FONT_METRICS[block.family]
  const lineBox = block.size * block.lineHeight
  const half = (lineBox - (m.ascent + m.descent) * block.size) / 2
  const y = block.baseline - half - m.ascent * block.size
  const text: TextItem = {
    id: uid(),
    type: 'text',
    x: block.x,
    y,
    w: Math.max(block.w + 6, block.size * 2),
    h: Math.max(block.h, lineBox),
    rotation: 0,
    opacity: 1,
    text: trimmed,
    size: block.size,
    family: block.family,
    bold: block.bold,
    italic: block.italic,
    color: block.color,
    align: block.dir === 'rtl' ? 'right' : 'left',
    lineHeight: block.lineHeight,
  }
  return [cover, text]
}
