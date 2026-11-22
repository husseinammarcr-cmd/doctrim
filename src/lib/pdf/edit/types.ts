/**
 * Data model for the in-browser PDF editor.
 *
 * Geometry convention: every item lives on a page in *displayed* PDF points
 * (72 dpi), origin top-left, x to the right, y down. pdf.js viewports and the
 * editor canvas both use that space. The exporter converts to PDF user space
 * (bottom-left origin) when flattening onto the page.
 */

export type FontFamily = 'helvetica' | 'times' | 'courier'
export type TextAlign = 'left' | 'center' | 'right'
export type ShapeKind = 'rect' | 'ellipse' | 'line' | 'arrow'

export interface ItemBase {
  id: string
  x: number
  y: number
  w: number
  h: number
  /** clockwise rotation in degrees around the item centre */
  rotation: number
  /** 0..1 */
  opacity: number
  hidden?: boolean
  locked?: boolean
}

export interface TextItem extends ItemBase {
  type: 'text'
  text: string
  size: number
  family: FontFamily
  bold: boolean
  italic: boolean
  color: string
  align: TextAlign
  /** line height multiplier */
  lineHeight: number
  background?: string | null
}

export interface ImageItem extends ItemBase {
  type: 'image'
  dataUrl: string
  name?: string
}

export interface ShapeItem extends ItemBase {
  type: 'shape'
  kind: ShapeKind
  stroke: string | null
  strokeWidth: number
  fill: string | null
  radius?: number
  dash?: boolean
  /** blackout box: exported with the page flattened so nothing hides under it */
  redact?: boolean
  /** for lines/arrows: 1 = top-left→bottom-right, -1 = bottom-left→top-right */
  diag?: 1 | -1
  /** semantic tag used for labels and redaction export */
  purpose?: 'highlight' | 'redact'
}

export interface InkItem extends ItemBase {
  type: 'ink'
  /** strokes normalised to the item box: 0..1 on both axes */
  strokes: [number, number][][]
  color: string
  width: number
}

/** An opaque patch that covers what was underneath (replaced source text). */
export interface CoverItem extends ItemBase {
  type: 'cover'
  color: string
}

export type Item = TextItem | ImageItem | ShapeItem | InkItem | CoverItem

export type ItemsMap = Record<string, Item[]>

export interface EditPage {
  id: string
  /** 0-based index in the source document */
  srcIndex: number
  width: number
  height: number
}

export type ToolId =
  | 'select'
  | 'edit-text'
  | 'text'
  | 'image'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'ink'
  | 'highlight'
  | 'redact'
  | 'sign'

export const FONT_STACK: Record<FontFamily, string> = {
  helvetica: 'Helvetica, Arial, "Helvetica Neue", "Liberation Sans", sans-serif',
  times: '"Times New Roman", Times, "Liberation Serif", serif',
  courier: '"Courier New", Courier, "Liberation Mono", monospace',
}

export const FONT_LABEL: Record<FontFamily, string> = {
  helvetica: 'Sans (Helvetica)',
  times: 'Serif (Times)',
  courier: 'Mono (Courier)',
}

/** Vertical metrics of the substitutes browsers use for the standard 14 fonts. */
export const FONT_METRICS: Record<FontFamily, { ascent: number; descent: number }> = {
  helvetica: { ascent: 0.905, descent: 0.212 }, // Arial / Helvetica
  times: { ascent: 0.891, descent: 0.216 }, // Times New Roman
  courier: { ascent: 0.833, descent: 0.3 }, // Courier New
}

export const COLORS = [
  '#111827',
  '#e11d48',
  '#2563eb',
  '#16a34a',
  '#f59e0b',
  '#7c3aed',
  '#0f766e',
  '#fde047',
  '#ffffff',
]

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3)

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function hexToRgb01(hex: string) {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h || '000000', 16)
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  }
}

export function luminance(hex: string) {
  const { r, g, b } = hexToRgb01(hex)
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

export const SIGNATURE_KEY = 'doctrim.edit.signature.v1'

export function cssFont(item: Pick<TextItem, 'family' | 'bold' | 'italic' | 'size'>, sizeOverride?: number) {
  return `${item.italic ? 'italic ' : ''}${item.bold ? '700' : '400'} ${
    sizeOverride ?? item.size
  }px ${FONT_STACK[item.family]}`
}

/** True when every glyph can be encoded with the PDF standard fonts (WinAnsi). */
export function isWinAnsi(text: string) {
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0
    if (c === 9 || c === 10 || c === 13) continue
    if (c < 32) return false
    if (c > 255) return false
    if (c >= 0x80 && c <= 0x9f) return false
  }
  return true
}

const RTL_RE = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc]/

export function detectDir(text: string): 'rtl' | 'ltr' {
  return RTL_RE.test(text) ? 'rtl' : 'ltr'
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export function normalizeRect(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  }
}

export function rectsOverlap(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function itemRect(item: Item): Rect {
  return { x: item.x, y: item.y, w: item.w, h: item.h }
}

export const TEXT_PADDING = 2

/** Baseline offset inside a line box, matching how the browser lays out text. */
export function baselineOffset(item: Pick<TextItem, 'family' | 'size' | 'lineHeight'>, lineIndex = 0) {
  const m = FONT_METRICS[item.family]
  const lineBox = item.lineHeight * item.size
  const half = (lineBox - (m.ascent + m.descent) * item.size) / 2
  return lineIndex * lineBox + half + m.ascent * item.size
}

export function newTextItem(x: number, y: number, size: number, color: string, extra: Partial<TextItem> = {}): TextItem {
  return {
    id: uid(),
    type: 'text',
    x,
    y,
    w: Math.max(size * 8, 60),
    h: size * 1.25,
    rotation: 0,
    opacity: 1,
    text: '',
    size,
    family: 'helvetica',
    bold: false,
    italic: false,
    color,
    align: 'left',
    lineHeight: 1.25,
    ...extra,
  }
}

export function newShape(kind: ShapeKind, x: number, y: number, w: number, h: number): ShapeItem {
  return {
    id: uid(),
    type: 'shape',
    kind,
    x,
    y,
    w,
    h,
    rotation: 0,
    opacity: 1,
    stroke: '#e11d48',
    strokeWidth: 2,
    fill: null,
    radius: 0,
    dash: false,
  }
}

export function elementLabel(item: Item): string {
  switch (item.type) {
    case 'text':
      return item.text.trim().slice(0, 32) || 'Text box'
    case 'image':
      return item.name || 'Image'
    case 'ink':
      return 'Drawing'
    case 'cover':
      return 'Covered area'
    case 'shape':
      if (item.purpose === 'highlight') return 'Highlight'
      if (item.purpose === 'redact') return 'Redaction'
      return {
        rect: 'Rectangle',
        ellipse: 'Ellipse',
        line: 'Line',
        arrow: 'Arrow',
      }[item.kind]
  }
}

export function elementIcon(item: Item): 'text' | 'image' | 'shape' | 'ink' | 'cover' {
  if (item.type === 'text') return 'text'
  if (item.type === 'image') return 'image'
  if (item.type === 'ink') return 'ink'
  if (item.type === 'cover') return 'cover'
  return 'shape'
}
