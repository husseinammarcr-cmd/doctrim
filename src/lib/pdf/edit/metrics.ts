import { PDFDocument, StandardFonts, type PDFFont } from 'pdf-lib'
import {
  FONT_STACK,
  isWinAnsi,
  type FontFamily,
  type TextItem,
  clamp,
} from './types'

/**
 * Text measuring + wrapping shared by the on-screen renderer and the exporter.
 *
 * Latin text is measured with the real metrics of the standard PDF fonts (built
 * once from an empty pdf-lib document) so line breaks in the preview are
 * byte-identical to the exported PDF. Non-Latin text (Arabic, Cyrillic, CJK…)
 * cannot be encoded in the standard fonts; those runs are measured with a
 * canvas and exported as a high-resolution image, so they are measured there.
 */

export type FontKey =
  | 'helvetica'
  | 'helveticaBold'
  | 'helveticaOblique'
  | 'helveticaBoldOblique'
  | 'times'
  | 'timesBold'
  | 'timesItalic'
  | 'timesBoldItalic'
  | 'courier'
  | 'courierBold'
  | 'courierOblique'
  | 'courierBoldOblique'

export const STANDARD_FONT: Record<FontKey, StandardFonts> = {
  helvetica: StandardFonts.Helvetica,
  helveticaBold: StandardFonts.HelveticaBold,
  helveticaOblique: StandardFonts.HelveticaOblique,
  helveticaBoldOblique: StandardFonts.HelveticaBoldOblique,
  times: StandardFonts.TimesRoman,
  timesBold: StandardFonts.TimesRomanBold,
  timesItalic: StandardFonts.TimesRomanItalic,
  timesBoldItalic: StandardFonts.TimesRomanBoldItalic,
  courier: StandardFonts.Courier,
  courierBold: StandardFonts.CourierBold,
  courierOblique: StandardFonts.CourierOblique,
  courierBoldOblique: StandardFonts.CourierBoldOblique,
}

export function fontKey(family: FontFamily, bold: boolean, italic: boolean): FontKey {
  if (family === 'helvetica') return bold ? (italic ? 'helveticaBoldOblique' : 'helveticaBold') : italic ? 'helveticaOblique' : 'helvetica'
  if (family === 'times') return bold ? (italic ? 'timesBoldItalic' : 'timesBold') : italic ? 'timesItalic' : 'times'
  return bold ? (italic ? 'courierBoldOblique' : 'courierBold') : italic ? 'courierOblique' : 'courier'
}

let metrics: Record<FontKey, PDFFont> | null = null
let metricsPromise: Promise<void> | null = null

export function initMetrics(): Promise<void> {
  if (metrics) return Promise.resolve()
  if (metricsPromise) return metricsPromise
  metricsPromise = (async () => {
    const doc = await PDFDocument.create()
    const out = {} as Record<FontKey, PDFFont>
    await Promise.all(
      (Object.keys(STANDARD_FONT) as FontKey[]).map(async (key) => {
        out[key] = await doc.embedFont(STANDARD_FONT[key])
      }),
    )
    metrics = out
  })()
  return metricsPromise
}

/** Height of a single line box in points. */
export function lineBoxHeight(size: number, lineHeight: number) {
  return size * lineHeight
}

function canvasCtx() {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  return c.getContext('2d')
}

/** Measure one line (no wrapping) in PDF points. */
export function measureLine(text: string, size: number, family: FontFamily, bold: boolean, italic: boolean): number {
  if (!text) return 0
  const key = fontKey(family, bold, italic)
  if (metrics && isWinAnsi(text)) {
    try {
      return metrics[key].widthOfTextAtSize(text, size)
    } catch {
      /* fall through to canvas */
    }
  }
  const ctx = canvasCtx()
  if (ctx) {
    ctx.font = `${italic ? 'italic ' : ''}${bold ? '700' : '400'} ${size}px ${FONT_STACK[family]}`
    return ctx.measureText(text).width
  }
  // last-resort approximation
  return text.length * size * (family === 'courier' ? 0.6 : 0.5)
}

export interface TextLayout {
  lines: string[]
  widths: number[]
  lineHeight: number
  width: number
  height: number
}

/** Wrap text to the item's box width using the same metrics as the export. */
export function layoutText(item: Pick<TextItem, 'text' | 'w' | 'size' | 'family' | 'bold' | 'italic' | 'lineHeight'>): TextLayout {
  const boxW = Math.max(8, item.w)
  const lines: string[] = []
  const widths: number[] = []
  const paragraphs = item.text.replace(/\r\n?/g, '\n').split('\n')

  for (const para of paragraphs) {
    if (!para) {
      lines.push('')
      widths.push(0)
      continue
    }
    const measured = (t: string) => measureLine(t, item.size, item.family, item.bold, item.italic)
    const tokens = para.match(/\S+\s*|\s+/g) || []
    let line = ''
    const wrapLines: string[] = []
    for (const token of tokens) {
      if (measured((line + token).trimEnd()) <= boxW) {
        line += token
        continue
      }
      if (line.trim()) {
        wrapLines.push(line.trimEnd())
        line = ''
      }
      const t = token.trimStart()
      if (!t) continue
      if (measured(t) <= boxW) {
        line = t
        continue
      }
      let chunk = ''
      for (const ch of t) {
        if (chunk && measured(chunk + ch) > boxW) {
          wrapLines.push(chunk)
          chunk = ch
        } else {
          chunk += ch
        }
      }
      line = chunk
    }
    if (line.trim()) wrapLines.push(line.trimEnd())
    if (wrapLines.length === 0) wrapLines.push('')
    for (const l of wrapLines) {
      lines.push(l)
      widths.push(measured(l))
    }
  }

  if (lines.length === 0) lines.push('')
  const lh = item.lineHeight
  const width = Math.max(...widths, 0)
  return {
    lines,
    widths,
    lineHeight: lh,
    width,
    height: Math.max(item.size * lh, lines.length * item.size * lh),
  }
}

/** Auto height for a text box, used when the text or width changes. */
export function textHeight(item: Pick<TextItem, 'text' | 'w' | 'size' | 'family' | 'bold' | 'italic' | 'lineHeight'>) {
  const layout = layoutText(item)
  return Math.max(item.size * item.lineHeight, layout.height) + 2
}

/** Grow the box width so the longest line fits on one line (up to a cap). */
export function fitTextWidth(item: TextItem, maxWidth: number) {
  const longest = Math.max(
    ...item.text.split('\n').map((l) => measureLine(l, item.size, item.family, item.bold, item.italic)),
    0,
  )
  return clamp(longest + 4, item.size * 2, maxWidth)
}

/** Approximate CSS font string used for canvas rasterisation. */
export function canvasFont(item: Pick<TextItem, 'family' | 'bold' | 'italic' | 'size'>, scale = 1) {
  return `${item.italic ? 'italic ' : ''}${item.bold ? '700' : '400'} ${item.size * scale}px ${FONT_STACK[item.family]}`
}
