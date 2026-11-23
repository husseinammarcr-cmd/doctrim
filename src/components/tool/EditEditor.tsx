import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  Copy,
  Loader2,
  Lock,
  ShieldCheck,
  TextCursorInput,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import { openPdfJs, renderPage, type PdfJsDoc } from '../../lib/pdf/pdfjs'
import { initMetrics, layoutText, textHeight, fitTextWidth } from '../../lib/pdf/edit/metrics'
import {
  extractTextBlocks,
  type SourceBlock,
} from '../../lib/pdf/edit/textlayer'
import { exportEditedPdf } from '../../lib/pdf/edit/export'
import { rewriteText } from '../../lib/editText'
import {
  FONT_STACK,
  cssFont,
  newShape,
  newTextItem,
  normalizeRect,
  rectsOverlap,
  uid,
  type EditPage,
  type ImageItem,
  type InkItem,
  type Item,
  type ItemsMap,
  type ShapeItem,
  type ShapeKind,
  type TextItem,
  type ToolId,
} from '../../lib/pdf/edit/types'
import { saveBlob } from '../../lib/download'
import Toolbar from './editor/Toolbar'
import PageRail from './editor/PageRail'
import PropertiesPanel from './editor/PropertiesPanel'
import SignatureDialog from './editor/SignatureDialog'

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
type Patch = Record<string, unknown>

interface DraftStyle {
  color: string
  size: number
  family: TextItem['family']
  bold: boolean
  italic: boolean
  strokeWidth: number
}

type EditState =
  | { kind: 'draft'; item: TextItem; value: string; snapshot: ItemsMap; original: string }
  | { kind: 'item'; item: TextItem; value: string; snapshot: ItemsMap; original: string }
  | { kind: 'block'; block: SourceBlock; value: string; snapshot: ItemsMap; original: string }

const DRAFT_W = 240
const HANDLE_CURSOR: Record<Handle, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
}

const clone = <T,>(v: T): T =>
  typeof structuredClone === 'function' ? structuredClone(v) : (JSON.parse(JSON.stringify(v)) as T)

function normalizeItem(it: Item): Item {
  if (it.type === 'text') {
    const w = Math.max(12, it.w)
    return { ...it, w, h: textHeight({ ...it, w }) }
  }
  return { ...it, w: Math.max(1, it.w), h: Math.max(1, it.h) }
}

function overlapRatio(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  const r = rectsOverlap(a, b)
  if (!r) return 0
  const x0 = Math.max(a.x, b.x)
  const y0 = Math.max(a.y, b.y)
  const x1 = Math.min(a.x + a.w, b.x + b.w)
  const y1 = Math.min(a.y + a.h, b.y + b.h)
  const area = Math.max(0, x1 - x0) * Math.max(0, y1 - y0)
  return area / Math.max(1, a.w * a.h)
}

async function imageFileToPng(file: File): Promise<{ dataUrl: string; aspect: number }> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const fr = new FileReader()
    fr.onload = () => res(String(fr.result))
    fr.onerror = rej
    fr.readAsDataURL(file)
  })
  const img = new Image()
  img.src = dataUrl
  await img.decode().catch(() => undefined)
  const max = 2200
  const ratio = Math.min(1, max / Math.max(img.width || 1, img.height || 1))
  const w = Math.max(1, Math.round((img.width || 1) * ratio))
  const h = Math.max(1, Math.round((img.height || 1) * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  return { dataUrl: canvas.toDataURL('image/png'), aspect: h / w }
}

export default function EditEditor({ bytes, fileName }: { bytes: Uint8Array; fileName: string }) {
  // The document itself can change under us: rewriting existing text rebuilds
  // the page content stream on the server and hands back a new file.
  const [sourceBytes, setSourceBytes] = useState(bytes)
  useEffect(() => setSourceBytes(bytes), [bytes])

  const docRef = useRef<PdfJsDoc | null>(null)
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const pageBoxRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const imgInputRef = useRef<HTMLInputElement>(null)

  const itemsRef = useRef<ItemsMap>({})
  const pastRef = useRef<ItemsMap[]>([])
  const futureRef = useRef<ItemsMap[]>([])
  const blocksRef = useRef<Record<number, SourceBlock[]>>({})
  const patchClock = useRef(0)
  const editClosing = useRef(false)
  const editOpened = useRef(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingPos = useRef<{ x: number; y: number } | null>(null)

  const [, forceRender] = useReducer((n: number) => n + 1, 0)
  const [histState, setHistState] = useState({ past: 0, future: 0 })
  const [pages, setPages] = useState<EditPage[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [ready, setReady] = useState(false)
  const [opening, setOpening] = useState(true)
  const [rendering, setRendering] = useState(true)
  const [blocksByPage, setBlocksByPage] = useState<Record<number, SourceBlock[]>>({})
  const [hostWidth, setHostWidth] = useState(720)
  const [zoom, setZoom] = useState<number | 'fit'>('fit')
  const [tool, setTool] = useState<ToolId>('select')
  const [shapeKind, setShapeKind] = useState<ShapeKind>('rect')
  const [selected, setSelected] = useState<string | null>(null)
  const [rewriting, setRewriting] = useState(false)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [style, setStyle] = useState<DraftStyle>({
    color: '#111827',
    size: 16,
    family: 'helvetica',
    bold: false,
    italic: false,
    strokeWidth: 2,
  })
  const [draftShape, setDraftShape] = useState<{ kind: ShapeKind | 'highlight' | 'redact'; rect: ReturnType<typeof normalizeRect> } | null>(null)
  const [draftInk, setDraftInk] = useState<[number, number][] | null>(null)
  const [guides, setGuides] = useState<{ dir: 'v' | 'h'; pos: number }[]>([])
  const [flattenRedactions, setFlattenRedactions] = useState(true)
  const [exporting, setExporting] = useState<null | { ratio: number; label: string }>(null)
  const [showSign, setShowSign] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const page = pages[pageIndex]
  const pageItems = page ? itemsRef.current[page.id] || [] : []
  const selectedItem = pageItems.find((i) => i.id === selected) || null

  const usableWidth = hostWidth > 80 ? hostWidth : 720
  const fitScale = page ? Math.min(1.5, Math.max(0.2, (usableWidth - 24) / page.width)) : 1
  const scale = zoom === 'fit' ? fitScale : zoom

  /* ------------------------------------------------------------------ */
  /* history                                                             */
  /* ------------------------------------------------------------------ */
  const syncHist = () => setHistState({ past: pastRef.current.length, future: futureRef.current.length })

  const pushSnapshot = useCallback((snap: ItemsMap) => {
    pastRef.current.push(snap)
    if (pastRef.current.length > 60) pastRef.current.shift()
    futureRef.current = []
    syncHist()
  }, [])

  const applyItems = useCallback((next: ItemsMap, record: boolean) => {
    if (record) pushSnapshot(clone(itemsRef.current))
    itemsRef.current = next
    forceRender()
  }, [pushSnapshot])

  const undo = useCallback(() => {
    if (editing) return
    const prev = pastRef.current.pop()
    if (!prev) return
    futureRef.current.push(clone(itemsRef.current))
    itemsRef.current = prev
    setSelected(null)
    forceRender()
    syncHist()
  }, [editing])

  const redo = useCallback(() => {
    if (editing) return
    const next = futureRef.current.pop()
    if (!next) return
    pastRef.current.push(clone(itemsRef.current))
    itemsRef.current = next
    setSelected(null)
    forceRender()
    syncHist()
  }, [editing])

  /* ------------------------------------------------------------------ */
  /* load document                                                       */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setOpening(true)
      setError('')
      try {
        await initMetrics()
        const doc = await openPdfJs(sourceBytes)
        if (cancelled) {
          void doc.destroy()
          return
        }
        docRef.current = doc
        const meta: EditPage[] = []
        for (let i = 1; i <= doc.numPages; i++) {
          const p = await doc.getPage(i)
          const vp = p.getViewport({ scale: 1 })
          meta.push({ id: `page-${i}`, srcIndex: i - 1, width: vp.width, height: vp.height })
        }
        if (cancelled) return
        setPages(meta)
        setReady(true)
      } catch (e: any) {
        const name = e?.name || ''
        if (name === 'PasswordException') {
          setError('This PDF is password-protected. Unlock it first with the Unlock PDF tool, then edit it here.')
        } else {
          setError(e?.message || 'Could not open this PDF.')
        }
      } finally {
        if (!cancelled) setOpening(false)
      }
    })()
    return () => {
      cancelled = true
      void docRef.current?.destroy()
      docRef.current = null
    }
  }, [sourceBytes])

  // stage width observer
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setHostWidth(el.clientWidth))
    ro.observe(el)
    setHostWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [ready])

  /* ------------------------------------------------------------------ */
  /* render the current page + extract its text                          */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!ready || !page) return
    let cancelled = false
    setRendering(true)
    ;(async () => {
      const doc = docRef.current
      if (!doc) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const renderScale = Math.max(0.2, Math.min(4, scale * dpr))
      const canvas = await renderPage(doc, page.srcIndex + 1, renderScale)
      if (cancelled) return
      canvas.style.width = `${Math.round(page.width * scale)}px`
      canvas.style.height = `${Math.round(page.height * scale)}px`
      canvas.style.display = 'block'
      canvasHostRef.current?.replaceChildren(canvas)
      setRendering(false)

      if (!blocksRef.current[page.srcIndex]) {
        const blocks = await extractTextBlocks(doc, page.srcIndex + 1, canvas)
        if (!cancelled) {
          blocksRef.current = { ...blocksRef.current, [page.srcIndex]: blocks }
          setBlocksByPage({ ...blocksRef.current })
        }
      }
    })().catch((e) => {
      if (!cancelled) {
        setError(e?.message || 'Could not render this page.')
        setRendering(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [ready, page, scale])

  useEffect(() => {
    if (!ready) return
    setRendering(true)
  }, [pageIndex, ready])

  /* ------------------------------------------------------------------ */
  /* helpers                                                             */
  /* ------------------------------------------------------------------ */
  const toPt = useCallback(
    (clientX: number, clientY: number) => {
      const el = pageBoxRef.current
      if (!el) return { x: 0, y: 0 }
      const r = el.getBoundingClientRect()
      return { x: (clientX - r.left) / scale, y: (clientY - r.top) / scale }
    },
    [scale],
  )

  const clampPt = useCallback(
    (p: { x: number; y: number }) => {
      if (!page) return p
      return { x: Math.min(page.width, Math.max(0, p.x)), y: Math.min(page.height, Math.max(0, p.y)) }
    },
    [page],
  )

  const updatePageItems = useCallback(
    (fn: (list: Item[]) => Item[], record: boolean) => {
      if (!page) return
      const next = {
        ...itemsRef.current,
        [page.id]: fn(itemsRef.current[page.id] || []).map(normalizeItem),
      }
      applyItems(next, record)
    },
    [applyItems, page],
  )

  const updateItemLive = useCallback(
    (id: string, patch: Patch) => {
      if (!page) return
      const next = {
        ...itemsRef.current,
        [page.id]: (itemsRef.current[page.id] || []).map((i) =>
          i.id === id ? normalizeItem({ ...i, ...patch } as Item) : i,
        ),
      }
      itemsRef.current = next
      forceRender()
    },
    [page],
  )

  const addItems = useCallback(
    (list: Item[], snapshot?: ItemsMap) => {
      if (!page) return
      pushSnapshot(snapshot || clone(itemsRef.current))
      const next = {
        ...itemsRef.current,
        [page.id]: [...(itemsRef.current[page.id] || []), ...list].map(normalizeItem),
      }
      itemsRef.current = next
      forceRender()
    },
    [page, pushSnapshot],
  )

  const removeItem = useCallback(
    (id: string) => {
      if (!page) return
      const next = {
        ...itemsRef.current,
        [page.id]: (itemsRef.current[page.id] || []).filter((i) => i.id !== id),
      }
      applyItems(next, true)
      setSelected((s) => (s === id ? null : s))
    },
    [applyItems, page],
  )

  /* ------------------------------------------------------------------ */
  /* text editing                                                        */
  /* ------------------------------------------------------------------ */
  const beginDraftText = (x: number, y: number) => {
    if (!page) return
    const size = style.size
    const w = Math.min(DRAFT_W, Math.max(40, page.width - x - 12))
    const item = newTextItem(x, y - size, size, style.color, {
      w,
      family: style.family,
      bold: style.bold,
      italic: style.italic,
    })
    editClosing.current = false
    editOpened.current = Date.now()
    setEditing({ kind: 'draft', item, value: '', snapshot: clone(itemsRef.current), original: '' })
    setSelected(null)
  }

  const beginItemEdit = (item: TextItem) => {
    editClosing.current = false
    editOpened.current = Date.now()
    setEditing({ kind: 'item', item, value: item.text, snapshot: clone(itemsRef.current), original: item.text })
    setSelected(item.id)
  }

  const beginBlockEdit = (block: SourceBlock) => {
    editClosing.current = false
    editOpened.current = Date.now()
    setEditing({ kind: 'block', block, value: block.text, snapshot: clone(itemsRef.current), original: block.text })
    setSelected(null)
  }

  const changeEditValue = (value: string) => {
    if (!editing) return
    if (editing.kind === 'item') {
      updateItemLive(editing.item.id, { text: value })
      setEditing({ ...editing, item: { ...editing.item, text: value }, value })
      return
    }
    setEditing({ ...editing, value })
  }

  const cancelEdit = () => {
    if (!editing) return
    editClosing.current = true
    if (editing.kind === 'item' && editing.value !== editing.original) {
      itemsRef.current = editing.snapshot
      forceRender()
    }
    setEditing(null)
  }

  const commitEdit = () => {
    if (!editing || !page || editClosing.current) return
    editClosing.current = true
    const value = editing.value.replace(/\r\n?/g, '\n')
    if (editing.kind === 'draft') {
      if (value.trim()) {
        const item = normalizeItem({ ...editing.item, text: value } as Item) as TextItem
        addItems([item], editing.snapshot)
        setSelected(item.id)
      }
      setEditing(null)
      return
    }
    if (editing.kind === 'item') {
      if (!value.trim()) {
        const next = { ...itemsRef.current, [page.id]: (itemsRef.current[page.id] || []).filter((i) => i.id !== editing.item.id) }
        applyItems(next, true)
        setSelected(null)
      } else if (value !== editing.original) {
        updateItemLive(editing.item.id, { text: value })
        pushSnapshot(editing.snapshot)
      }
      setEditing(null)
      return
    }
    if (value.trim() === editing.original.trim()) {
      setEditing(null)
      return
    }
    void rewriteBlock(editing.block, value)
    setEditing(null)
  }

  /**
   * Replaces existing text for real: the glyphs are deleted from the page and
   * the new words are drawn in the document's own font, so nothing is hidden
   * under a rectangle and the old text is gone from the file.
   *
   * Any additions already placed on the page are baked into the PDF first, so
   * the rebase does not throw the user's work away.
   */
  const rewriteBlock = async (block: SourceBlock, value: string) => {
    if (!page) return
    const oldLines = block.lines?.length
      ? block.lines
      : [{ x: block.x, y: block.y, w: block.w, h: block.h } as SourceBlock['lines'][number]]
    const typed = value.split('\n')
    const runs = oldLines.map((line, i) => ({
      page: page.srcIndex,
      rect: [line.x - 1, line.y - 1, line.x + line.w + 1, line.y + line.h + 1] as [number, number, number, number],
      text: typed[i] ?? '',
      before: (line as { text?: string }).text ?? '',
    }))
    if (typed.length > oldLines.length) {
      runs[runs.length - 1].text = typed.slice(oldLines.length - 1).join(' ')
    }
    // Only touch the lines the user actually changed: rewriting an identical
    // line would re-draw it for no reason and can shift it by a hair.
    const changed = runs
      .filter((r) => r.text.trim() !== r.before.trim())
      .map(({ page: pg, rect, text }) => ({ page: pg, rect, text: text.trim() ? text : '' }))
    if (!changed.length) {
      setRewriting(false)
      return
    }

    setRewriting(true)
    try {
      const baked = await exportEditedPdf({
        bytes: sourceBytes,
        pages,
        items: itemsRef.current,
        flattenRedactions: false,
        pdfjsDoc: docRef.current,
      })
      const { bytes: out, warnings } = await rewriteText(baked, changed)
      // the rebased document already contains everything that was on the page
      itemsRef.current = {}
      pastRef.current = []
      futureRef.current = []
      setHistState({ past: 0, future: 0 })
      blocksRef.current = {}
      setSelected(null)
      setSourceBytes(out)
      setToast(warnings[0] || 'Text rewritten in the original document')
    } catch (e) {
      setToast(e instanceof Error ? `Could not rewrite the text: ${e.message}` : 'Could not rewrite the text')
    } finally {
      setRewriting(false)
    }
  }

  /* ------------------------------------------------------------------ */
  /* pointer gestures: draw                                              */
  /* ------------------------------------------------------------------ */
  const onStageDown = (e: React.PointerEvent) => {
    if (!page || editing) return
    if (e.button !== 0) return
    const p = toPt(e.clientX, e.clientY)
    if (p.x < 0 || p.y < 0 || p.x > page.width || p.y > page.height) return

    if (tool === 'select' || tool === 'edit-text') {
      setSelected(null)
      return
    }
    if (tool === 'text') {
      beginDraftText(p.x, p.y)
      setTool('select')
      return
    }
    if (tool === 'image') {
      pendingPos.current = p
      imgInputRef.current?.click()
      return
    }
    if (tool === 'sign') {
      pendingPos.current = p
      setShowSign(true)
      return
    }

    e.preventDefault()
    if (tool === 'ink') {
      const points: [number, number][] = [[p.x, p.y]]
      setDraftInk(points)
      const onMove = (ev: PointerEvent) => {
        const q = clampPt(toPt(ev.clientX, ev.clientY))
        const last = points[points.length - 1]
        if (!last || Math.hypot(q.x - last[0], q.y - last[1]) > 0.9 / scale) {
          points.push([q.x, q.y])
          setDraftInk([...points])
        }
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        setDraftInk(null)
        setTool('select')
        if (points.length < 3) return
        const xs = points.map((q) => q[0])
        const ys = points.map((q) => q[1])
        const x = Math.min(...xs)
        const y = Math.min(...ys)
        const w = Math.max(1, Math.max(...xs) - x)
        const h = Math.max(1, Math.max(...ys) - y)
        const item: InkItem = {
          id: uid(),
          type: 'ink',
          x,
          y,
          w,
          h,
          rotation: 0,
          opacity: 1,
          strokes: [points.map(([px, py]) => [(px - x) / w, (py - y) / h] as [number, number])],
          color: style.color,
          width: style.strokeWidth,
        }
        addItems([item])
        setSelected(item.id)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp, { once: true })
      window.addEventListener('pointercancel', onUp, { once: true })
      return
    }

    // rectangle / ellipse / line / arrow / highlight / redact
    const kind = tool as ShapeKind | 'highlight' | 'redact'
    let rect = { x: p.x, y: p.y, w: 0, h: 0 }
    setDraftShape({ kind, rect })
    let moved = false
    const start = p
    const onMove = (ev: PointerEvent) => {
      const q = clampPt(toPt(ev.clientX, ev.clientY))
      rect = normalizeRect(start, q)
      moved = moved || rect.w > 1 || rect.h > 1
      setDraftShape({ kind, rect })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      setDraftShape(null)
      setTool('select')
      if (!moved || rect.w < 2 || rect.h < 2) return
      let item: ShapeItem
      if (kind === 'highlight') {
        item = { ...newShape('rect', rect.x, rect.y, rect.w, rect.h), fill: '#fde047', stroke: null, strokeWidth: 0, opacity: 0.4, purpose: 'highlight' }
      } else if (kind === 'redact') {
        item = { ...newShape('rect', rect.x, rect.y, rect.w, rect.h), fill: '#000000', stroke: null, strokeWidth: 0, redact: true, purpose: 'redact' }
      } else {
        const diag: 1 | -1 = (start.x < rect.x + rect.w / 2 ? 1 : -1) * (start.y < rect.y + rect.h / 2 ? 1 : -1) > 0 ? 1 : -1
        item = {
          ...newShape(kind, rect.x, rect.y, rect.w, rect.h),
          stroke: style.color,
          strokeWidth: style.strokeWidth,
          diag,
        }
      }
      addItems([item])
      setSelected(item.id)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    window.addEventListener('pointercancel', onUp, { once: true })
  }

  /* ------------------------------------------------------------------ */
  /* pointer gestures: move / resize / rotate                            */
  /* ------------------------------------------------------------------ */
  const startMove = (e: React.PointerEvent, item: Item) => {
    if (tool !== 'select') return
    e.stopPropagation()
    e.preventDefault()
    setSelected(item.id)
    if (item.locked) return
    const start = toPt(e.clientX, e.clientY)
    const snapshot = clone(itemsRef.current)
    const ox = item.x
    const oy = item.y
    let moved = false
    const onMove = (ev: PointerEvent) => {
      const q = clampPt(toPt(ev.clientX, ev.clientY))
      const dx = q.x - start.x
      const dy = q.y - start.y
      if (!moved) {
        if (Math.hypot(dx, dy) * scale < 2) return
        moved = true
        pushSnapshot(snapshot)
      }
      let nx = ox + dx
      let ny = oy + dy
      if (!item.rotation) {
        const snap = computeSnap(nx, ny, item, pageItems.filter((i) => i.id !== item.id), page, scale)
        nx = snap.x
        ny = snap.y
        setGuides(snap.guides)
      }
      updateItemLive(item.id, { x: nx, y: ny })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      setGuides([])
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    window.addEventListener('pointercancel', onUp, { once: true })
  }

  const startResize = (e: React.PointerEvent, item: Item, handle: Handle) => {
    e.stopPropagation()
    e.preventDefault()
    if (item.locked) return
    const snapshot = clone(itemsRef.current)
    const rad = (item.rotation * Math.PI) / 180
    const u = { x: Math.cos(rad), y: Math.sin(rad) }
    const v = { x: -Math.sin(rad), y: Math.cos(rad) }
    const center0 = { x: item.x + item.w / 2, y: item.y + item.h / 2 }
    const local = {
      x: handle.includes('w') ? item.w / 2 : handle.includes('e') ? -item.w / 2 : 0,
      y: handle.includes('n') ? item.h / 2 : handle.includes('s') ? -item.h / 2 : 0,
    }
    const anchor = {
      x: center0.x + u.x * local.x + v.x * local.y,
      y: center0.y + u.y * local.x + v.y * local.y,
    }
    const adjustX = handle !== 'n' && handle !== 's'
    const adjustY = handle !== 'e' && handle !== 'w' && item.type !== 'text'
    const minW = item.type === 'text' ? Math.max(12, item.size * 1.5) : 6
    const minH = 4
    let moved = false

    const onMove = (ev: PointerEvent) => {
      const p = toPt(ev.clientX, ev.clientY)
      const rx = p.x - anchor.x
      const ry = p.y - anchor.y
      const lx = rx * u.x + ry * u.y
      const ly = rx * v.x + ry * v.y
      let w = adjustX ? Math.max(minW, Math.abs(lx)) : item.w
      let h = adjustY ? Math.max(minH, Math.abs(ly)) : item.h
      if (ev.shiftKey && adjustX && adjustY) {
        const ratio = item.w / item.h
        if (Math.abs(lx) / Math.abs(ly) > ratio) h = w / ratio
        else w = h * ratio
      }
      const sx = adjustX ? (lx >= 0 ? 1 : -1) : 0
      const sy = adjustY ? (ly >= 0 ? 1 : -1) : 0
      const c = {
        x: anchor.x + u.x * (sx * w / 2) + v.x * (sy * h / 2),
        y: anchor.y + u.y * (sx * w / 2) + v.y * (sy * h / 2),
      }
      if (!moved) {
        if (Math.abs(w - item.w) * scale < 1.5 && Math.abs(h - item.h) * scale < 1.5) return
        moved = true
        pushSnapshot(snapshot)
      }
      updateItemLive(item.id, { x: c.x - w / 2, y: c.y - h / 2, w, h })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    window.addEventListener('pointercancel', onUp, { once: true })
  }

  const startRotate = (e: React.PointerEvent, item: Item) => {
    e.stopPropagation()
    e.preventDefault()
    if (item.locked) return
    const snapshot = clone(itemsRef.current)
    const center = { x: item.x + item.w / 2, y: item.y + item.h / 2 }
    const p = toPt(e.clientX, e.clientY)
    const startAngle = Math.atan2(p.y - center.y, p.x - center.x)
    let moved = false
    const onMove = (ev: PointerEvent) => {
      const q = toPt(ev.clientX, ev.clientY)
      const angle = Math.atan2(q.y - center.y, q.x - center.x)
      let rot = item.rotation + ((angle - startAngle) * 180) / Math.PI
      if (ev.shiftKey) rot = Math.round(rot / 15) * 15
      rot = Math.round(rot * 10) / 10
      if (!moved) {
        if (Math.abs(rot - item.rotation) < 0.5) return
        moved = true
        pushSnapshot(snapshot)
      }
      updateItemLive(item.id, { rotation: rot })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    window.addEventListener('pointercancel', onUp, { once: true })
  }

  /* ------------------------------------------------------------------ */
  /* selection actions                                                   */
  /* ------------------------------------------------------------------ */
  const patchSelected = useCallback(
    (patch: Patch) => {
      if (!selected || !page) return
      const now = Date.now()
      const record = now - patchClock.current > 600
      patchClock.current = now
      const next = {
        ...itemsRef.current,
        [page.id]: (itemsRef.current[page.id] || []).map((i) =>
          i.id === selected ? normalizeItem({ ...i, ...patch } as Item) : i,
        ),
      }
      applyItems(next, record)
      if (editing?.kind === 'item' && editing.item.id === selected) {
        setEditing({ ...editing, item: { ...editing.item, ...patch } as TextItem })
      }
    },
    [applyItems, editing, page, selected],
  )

  const deleteSelected = useCallback(() => {
    if (selected) removeItem(selected)
  }, [removeItem, selected])

  const duplicateSelected = useCallback(() => {
    if (!selected || !selectedItem || !page) return
    const copy = normalizeItem({
      ...clone(selectedItem),
      id: uid(),
      x: selectedItem.x + 12,
      y: selectedItem.y + 12,
    } as Item)
    addItems([copy])
    setSelected(copy.id)
  }, [addItems, page, selected, selectedItem])

  const orderSelected = (dir: 'front' | 'back' | 'up' | 'down') => {
    if (!selected || !page) return
    const list = [...(itemsRef.current[page.id] || [])]
    const idx = list.findIndex((i) => i.id === selected)
    if (idx < 0) return
    const [it] = list.splice(idx, 1)
    if (dir === 'front') list.push(it)
    else if (dir === 'back') list.unshift(it)
    else if (dir === 'up') list.splice(Math.min(list.length, idx + 1), 0, it)
    else list.splice(Math.max(0, idx - 1), 0, it)
    applyItems({ ...itemsRef.current, [page.id]: list }, true)
  }

  const toggleHidden = (id: string) => {
    updatePageItems((list) => list.map((i) => (i.id === id ? { ...i, hidden: !i.hidden } : i)), true)
  }

  const toggleLock = (id: string) => {
    updatePageItems((list) => list.map((i) => (i.id === id ? { ...i, locked: !i.locked } : i)), true)
  }

  const fitWidth = () => {
    if (!selectedItem || selectedItem.type !== 'text' || !page) return
    patchSelected({ w: fitTextWidth(selectedItem, page.width - selectedItem.x) })
  }

  const replaceImage = () => {
    if (!selectedItem || selectedItem.type !== 'image') return
    pendingPos.current = null
    imgInputRef.current?.click()
  }

  const insertImage = async (dataUrl: string, aspect: number, at?: { x: number; y: number }) => {
    if (!page) return
    const w = Math.min(page.width * 0.35, 260)
    const h = w * aspect
    const center = at || { x: page.width / 2, y: page.height / 2 }
    const item: ImageItem = {
      id: uid(),
      type: 'image',
      x: center.x - w / 2,
      y: center.y - h / 2,
      w,
      h,
      rotation: 0,
      opacity: 1,
      dataUrl,
    }
    // if an image is selected we are replacing, not adding
    if (selectedItem && selectedItem.type === 'image') {
      patchSelected({ dataUrl })
      return
    }
    addItems([item])
    setSelected(item.id)
    setTool('select')
  }

  const onPickImage = async (file: File) => {
    try {
      const { dataUrl, aspect } = await imageFileToPng(file)
      await insertImage(dataUrl, aspect, pendingPos.current || undefined)
    } catch (e: any) {
      setError(e?.message || 'Could not read that image.')
    } finally {
      pendingPos.current = null
    }
  }

  const addSignature = (dataUrl: string, aspect: number) => {
    void insertImage(dataUrl, aspect, pendingPos.current || { x: (page?.width || 0) / 2, y: (page?.height || 0) * 0.72 })
    pendingPos.current = null
    setTool('select')
  }

  /* ------------------------------------------------------------------ */
  /* zoom + keyboard                                                     */
  /* ------------------------------------------------------------------ */
  const setZoomStep = (dir: 1 | -1) => {
    const next = Math.min(3, Math.max(0.25, Math.round((scale + dir * 0.15) * 100) / 100))
    setZoom(next)
  }

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      setZoom((z) => {
        const cur = z === 'fit' ? fitScale : z
        return Math.min(3, Math.max(0.25, Math.round((cur - Math.sign(e.deltaY) * 0.1) * 100) / 100))
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [fitScale])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void onExport()
        return
      }
      if (typing) return

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
        return
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        duplicateSelected()
        return
      }
      if (mod && e.key.toLowerCase() === 'a') return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selected) {
          e.preventDefault()
          deleteSelected()
        }
        return
      }
      if (e.key === 'Escape') {
        if (editing) cancelEdit()
        else {
          setSelected(null)
          setTool('select')
          setShowSign(false)
          setShowShortcuts(false)
        }
        return
      }
      if (e.key === 'Enter' && selectedItem?.type === 'text' && !editing) {
        e.preventDefault()
        beginItemEdit(selectedItem)
        return
      }
      if (selectedItem && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && !selectedItem.locked) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        patchSelected({ x: selectedItem.x + dx, y: selectedItem.y + dy })
        return
      }
      if (mod) return
      const key = e.key.toLowerCase()
      if (key === 'v') setTool('select')
      else if (key === 'e') setTool('edit-text')
      else if (key === 't') setTool('text')
      else if (key === 'i') setTool('image')
      else if (key === 'd') setTool('ink')
      else if (key === 'h') setTool('highlight')
      else if (key === 'r') setTool('redact')
      else if (key === 's') setShowSign(true)
      else if (key === '?') setShowShortcuts(true)
      else if (key === '+' || key === '=') setZoomStep(1)
      else if (key === '-') setZoomStep(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const count = Object.values(itemsRef.current).reduce((n, l) => n + l.filter((i) => i.type !== 'cover').length, 0)
      if (count > 0 && !exporting) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [exporting])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(id)
  }, [toast])

  /* ------------------------------------------------------------------ */
  /* export                                                              */
  /* ------------------------------------------------------------------ */
  const onExport = async () => {
    if (!ready || !page || exporting) return
    setError('')
    setExporting({ ratio: 0, label: 'Preparing…' })
    try {
      if (editing) commitEdit()
      await new Promise((r) => setTimeout(r, 30))
      const out = await exportEditedPdf({
        bytes: sourceBytes,
        pages,
        items: itemsRef.current,
        flattenRedactions,
        pdfjsDoc: docRef.current,
        onProgress: (ratio, label) => setExporting({ ratio, label }),
      })
      const name = fileName.replace(/\.pdf$/i, '') + '-edited.pdf'
      await saveBlob(new Blob([out.slice()], { type: 'application/pdf' }), name, 'application/pdf')
      setToast('Edited PDF saved to your device')
    } catch (e: any) {
      setError(e?.message || 'Could not export the PDF.')
    } finally {
      setExporting(null)
    }
  }

  /* ------------------------------------------------------------------ */
  /* derived                                                             */
  /* ------------------------------------------------------------------ */
  const totalEdits = Object.values(itemsRef.current).reduce(
    (n, l) => n + l.filter((i) => i.type !== 'cover').length,
    0,
  )
  const editedPages = new Set<number>()
  pages.forEach((p) => {
    if ((itemsRef.current[p.id] || []).length) editedPages.add(p.srcIndex)
  })

  const currentBlocks = page ? blocksByPage[page.srcIndex] || [] : []
  const blocksLoaded = page ? blocksByPage[page.srcIndex] !== undefined : false
  const editingBlock = editing?.kind === 'block' ? editing.block : null
  const editingItem = editing && editing.kind !== 'block' ? editing.item : null
  const editGeometry = editingBlock
    ? { x: editingBlock.x, y: editingBlock.y, w: editingBlock.w, h: editingBlock.h, text: editingBlock }
    : editingItem
      ? { x: editingItem.x, y: editingItem.y, w: editingItem.w, h: editingItem.h, text: editingItem }
      : null
  const editorSource: TextItem | null = editingBlock
    ? {
        ...newTextItem(editingBlock.x, editingBlock.y, editingBlock.size, editingBlock.color, {
          family: editingBlock.family,
          bold: editingBlock.bold,
          italic: editingBlock.italic,
          lineHeight: editingBlock.lineHeight,
          w: editingBlock.w,
          text: editing?.value ?? '',
          align: editingBlock.dir === 'rtl' ? 'right' : 'left',
        }),
      }
    : editingItem
  const editorLayout = editorSource ? layoutText(editorSource) : null
  const editorTextStyle = editorSource
    ? {
        fontFamily: FONT_STACK[editorSource.family],
        fontSize: editorSource.size * scale,
        fontWeight: editorSource.bold ? 700 : 400,
        fontStyle: editorSource.italic ? 'italic' : 'normal',
        lineHeight: editorSource.lineHeight,
        color: editorSource.color,
        textAlign: editorSource.align,
        background: editingBlock ? editingBlock.bg : 'rgba(255,255,255,0.96)',
      }
    : undefined

  /* ------------------------------------------------------------------ */
  /* render                                                              */
  /* ------------------------------------------------------------------ */
  if (opening) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-ink-muted">
        <Loader2 size={26} className="animate-spin text-brand" />
        <p className="text-[14px] font-semibold">Opening your PDF…</p>
      </div>
    )
  }

  if (error && !ready) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center">
        <p className="text-[14px] font-semibold text-red-800">{error}</p>
        <p className="mt-1 text-[13px] text-red-700">Try another file, or use the Unlock PDF tool for protected documents.</p>
      </div>
    )
  }

  if (!page) return null

  const toolHint =
    tool === 'select'
      ? 'Drag to move · double-click text to edit'
      : tool === 'text'
        ? 'Click on the page to place a text box'
        : tool === 'image'
          ? 'Click where the image should go'
          : tool === 'edit-text'
            ? 'Click any text to rewrite it'
            : tool === 'ink'
              ? 'Draw with the mouse or a finger'
              : tool === 'highlight'
                ? 'Drag across text to highlight it'
                : tool === 'redact'
                  ? 'Drag a box to black out sensitive content'
                  : 'Drag on the page to draw'

  return (
    <div className="relative">
      <Toolbar
        tool={tool}
        setTool={(t) => {
          setTool(t)
          if (t !== 'select') setSelected(null)
        }}
        shapeKind={shapeKind}
        setShapeKind={setShapeKind}
        onUndo={undo}
        onRedo={redo}
        canUndo={histState.past > 0}
        canRedo={histState.future > 0}
        zoom={scale}
        onZoomIn={() => setZoomStep(1)}
        onZoomOut={() => setZoomStep(-1)}
        onZoomFit={() => setZoom('fit')}
        pageIndex={pageIndex}
        numPages={pages.length}
        onPrevPage={() => {
          setPageIndex((i) => Math.max(0, i - 1))
          setSelected(null)
          setEditing(null)
        }}
        onNextPage={() => {
          setPageIndex((i) => Math.min(pages.length - 1, i + 1))
          setSelected(null)
          setEditing(null)
        }}
        onExport={() => void onExport()}
        exporting={exporting}
        onSign={() => {
          pendingPos.current = null
          setShowSign(true)
        }}
        onShortcuts={() => setShowShortcuts(true)}
        editCount={totalEdits}
      />

      {exporting && (
        <div className="mt-2 overflow-hidden rounded-full bg-surface">
          <div className="h-1 rounded-full bg-brand transition-all" style={{ width: `${Math.max(4, exporting.ratio * 100)}%` }} />
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[86px_minmax(0,1fr)_300px]">
        <PageRail
          doc={docRef.current}
          pages={pages}
          current={pageIndex}
          editedPages={editedPages}
          onSelect={(i) => {
            if (i === pageIndex) return
            if (editing) commitEdit()
            setPageIndex(i)
            setSelected(null)
          }}
        />

        <div className="min-w-0">
          <div ref={stageRef} className="min-w-0 rounded-lg border border-line bg-[#eceff4] p-2 sm:p-3">
            <div className="flex w-full min-w-0 justify-center overflow-auto" style={{ maxHeight: 'calc(100vh - 210px)' }}>
              <div
                ref={pageBoxRef}
                data-page-box=""
                className="relative shrink-0 bg-white shadow-[0_2px_12px_rgba(15,23,42,.12)]"
                style={{ width: page.width * scale, height: page.height * scale, touchAction: 'none' }}
              >
                <div ref={canvasHostRef} className="absolute inset-0 overflow-hidden" />

                {rendering && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                    <Loader2 size={22} className="animate-spin text-brand" />
                  </div>
                )}

                {!rendering && (
                  <div
                    data-pdf-stage=""
                    className="absolute inset-0 z-10"
                    onPointerDown={onStageDown}
                    onDragOver={(e) => {
                      if (e.dataTransfer.types.includes('Files')) e.preventDefault()
                    }}
                    onDrop={(e) => {
                      const file = e.dataTransfer.files?.[0]
                      if (!file || !file.type.startsWith('image/')) return
                      e.preventDefault()
                      const p = toPt(e.clientX, e.clientY)
                      void imageFileToPng(file).then(({ dataUrl, aspect }) => insertImage(dataUrl, aspect, p))
                    }}
                    style={{
                      cursor:
                        tool === 'select'
                          ? 'default'
                          : tool === 'edit-text'
                            ? 'text'
                            : tool === 'ink'
                              ? 'crosshair'
                              : 'crosshair',
                    }}
                  >
                    {/* existing PDF text hit areas */}
                    {(tool === 'select' || tool === 'edit-text') &&
                      !editing &&
                      currentBlocks.map((b) => {
                        const covered = pageItems.some(
                          (i) =>
                            !i.hidden &&
                            ((i.type === 'cover' && overlapRatio(i, b) > 0.55) ||
                              (i.type === 'shape' && i.redact && overlapRatio(i, b) > 0.5)),
                        )
                        if (covered) return null
                        return (
                          <div
                            key={b.id}
                            onPointerDown={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              beginBlockEdit(b)
                            }}
                            title="Click to edit this text"
                            className="group absolute cursor-text rounded-[2px] hover:bg-brand/10 hover:ring-1 hover:ring-brand/50"
                            style={{
                              left: b.x * scale - 2,
                              top: b.y * scale - 1,
                              width: b.w * scale + 4,
                              height: b.h * scale + 2,
                            }}
                          />
                        )
                      })}

                    {/* added items */}
                    {pageItems.map((it) =>
                      it.hidden || (editing && editing.kind === 'item' && editing.item.id === it.id) ? null : (
                        <ItemView
                          key={it.id}
                          item={it}
                          scale={scale}
                          selected={selected === it.id}
                          onPointerDown={(e) => startMove(e, it)}
                          onDoubleClick={() => it.type === 'text' && beginItemEdit(it)}
                        />
                      ),
                    )}

                    {/* pending drawing preview */}
                    {draftShape && (
                      <ShapePreview kind={draftShape.kind} rect={draftShape.rect} scale={scale} color={style.color} width={style.strokeWidth} />
                    )}
                    {draftInk && draftInk.length > 1 && (
                      <svg className="pointer-events-none absolute inset-0" width={page.width * scale} height={page.height * scale}>
                        <polyline
                          points={draftInk.map(([x, y]) => `${x * scale},${y * scale}`).join(' ')}
                          fill="none"
                          stroke={style.color}
                          strokeWidth={style.strokeWidth * scale}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}

                    {/* alignment guides */}
                    {guides.map((g, i) => (
                      <div
                        key={`${g.dir}-${i}`}
                        className="pointer-events-none absolute bg-brand/70"
                        style={
                          g.dir === 'v'
                            ? { left: g.pos * scale, top: 0, width: 1, height: '100%' }
                            : { top: g.pos * scale, left: 0, height: 1, width: '100%' }
                        }
                      />
                    ))}

                    {/* selection */}
                    {selectedItem && !selectedItem.hidden && !editing && (
                      <Selection
                        item={selectedItem}
                        scale={scale}
                        onResize={startResize}
                        onRotate={startRotate}
                        onDuplicate={duplicateSelected}
                        onDelete={deleteSelected}
                        onEditText={() => selectedItem.type === 'text' && beginItemEdit(selectedItem)}
                      />
                    )}

                    {/* inline text editor */}
                    {editing && editGeometry && editorTextStyle && (
                      <div
                        className="absolute z-30"
                        style={{
                          left: editGeometry.x * scale - 3,
                          top: editGeometry.y * scale - 3,
                          width: Math.max(60, editGeometry.w * scale + 6),
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <textarea
                          ref={textareaRef}
                          autoFocus
                          value={editing.value}
                          onChange={(e) => changeEditValue(e.target.value)}
                          onBlur={() => {
                            // The click that created this editor can still be
                            // settling when it mounts; keep focus for a moment
                            // instead of committing an empty box immediately.
                            if (Date.now() - editOpened.current < 400) {
                              window.setTimeout(() => textareaRef.current?.focus(), 0)
                              return
                            }
                            commitEdit()
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault()
                              cancelEdit()
                            } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault()
                              commitEdit()
                            }
                          }}
                          rows={Math.max(1, editorLayout?.lines.length || 1)}
                          spellCheck={false}
                          className="w-full resize-none overflow-hidden rounded-[2px] border-[1.5px] border-brand px-1 py-0.5 shadow-[0_8px_24px_rgba(0,85,255,.18)] outline-none"
                          style={{
                            ...editorTextStyle,
                            height: Math.max(
                              Math.max(1, editorLayout?.lines.length || 1) *
                                (editorSource?.size || style.size) *
                                (editorSource?.lineHeight || 1.25) *
                                scale +
                                12,
                              editing?.kind === 'block' ? editing.block.h * scale + 8 : 0,
                            ),
                          }}
                        />
                        <div className="absolute -bottom-9 left-0 z-40 flex items-center gap-1 rounded-md border border-line bg-white p-1 shadow-lift">
                          <button
                            type="button"
                            onPointerDown={(e) => {
                              e.preventDefault()
                              commitEdit()
                            }}
                            className="rounded bg-brand px-2.5 py-1 text-[11px] font-bold text-white"
                          >
                            Apply
                          </button>
                          <button
                            type="button"
                            onPointerDown={(e) => {
                              e.preventDefault()
                              cancelEdit()
                            }}
                            className="rounded px-2 py-1 text-[11px] font-semibold text-ink-muted hover:bg-surface"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[12px] text-ink-muted">
            <span className="inline-flex items-center gap-1 font-semibold text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> {toolHint}
            </span>
            {!rendering && blocksLoaded && currentBlocks.length === 0 && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
                No text layer on this page — it may be a scan. Add text on top, or run the OCR tool.
              </span>
            )}
            <span className="ml-auto inline-flex items-center gap-1">
              <ShieldCheck size={13} /> Additions stay in your browser · text rewrites run on our server
            </span>
            {totalEdits > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm('Remove every edit on every page?')) return
                  pushSnapshot(clone(itemsRef.current))
                  itemsRef.current = {}
                  setSelected(null)
                  forceRender()
                }}
                className="font-semibold text-ink-muted underline-offset-2 hover:text-accent-red hover:underline"
              >
                Reset all
              </button>
            )}
          </div>

          {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-[13px] text-accent-red">{error}</p>}
        </div>

        <PropertiesPanel
          item={selectedItem}
          page={page}
          pageItems={pageItems}
          tool={tool}
          onPatch={patchSelected}
          onDelete={deleteSelected}
          onDuplicate={duplicateSelected}
          onSelect={setSelected}
          onToggleHidden={toggleHidden}
          onToggleLock={toggleLock}
          onOrder={orderSelected}
          onFitWidth={fitWidth}
          onEditText={(id) => {
            const it = pageItems.find((i) => i.id === id)
            if (it?.type === 'text') beginItemEdit(it)
          }}
          onReplaceImage={replaceImage}
          onAddSignature={() => {
            pendingPos.current = null
            setShowSign(true)
          }}
          onTool={(t) => setTool(t)}
          style={style}
          onStyle={(patch) => setStyle((s) => ({ ...s, ...patch }))}
          flattenRedactions={flattenRedactions}
          onFlattenChange={setFlattenRedactions}
          hasRedaction={pageItems.some((i) => i.type === 'shape' && i.redact)}
        />
      </div>

      <input
        ref={imgInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void onPickImage(f)
          e.target.value = ''
        }}
      />

      <SignatureDialog open={showSign} onClose={() => setShowSign(false)} onApply={addSignature} />

      {showShortcuts && <ShortcutsDialog onClose={() => setShowShortcuts(false)} />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white shadow-lift">
          {toast}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------- */
/* item rendering                                                        */
/* -------------------------------------------------------------------- */

function ItemView({
  item,
  scale,
  selected,
  onPointerDown,
  onDoubleClick,
}: {
  item: Item
  scale: number
  selected: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onDoubleClick: () => void
}) {
  const transform = `rotate(${item.rotation}deg)`
  const common = {
    className: `absolute ${item.locked ? 'cursor-default' : 'cursor-move'}`,
    style: {
      left: item.x * scale,
      top: item.y * scale,
      width: Math.max(2, item.w * scale),
      height: Math.max(2, item.h * scale),
      transform,
      transformOrigin: 'center',
      opacity: item.opacity,
    } as React.CSSProperties,
    onPointerDown,
    onDoubleClick,
  }

  if (item.type === 'text') {
    const layout = layoutText(item)
    return (
      <div {...common} style={{ ...common.style, color: item.color, fontFamily: cssFont(item).split('px ')[1], fontSize: item.size * scale, fontWeight: item.bold ? 700 : 400, fontStyle: item.italic ? 'italic' : 'normal', lineHeight: item.lineHeight, textAlign: item.align, background: item.background || undefined }}>
        {layout.lines.map((line, i) => (
          <div key={i} style={{ height: item.lineHeight * item.size * scale, whiteSpace: 'pre', overflow: 'visible' }}>
            {line || ' '}
          </div>
        ))}
      </div>
    )
  }

  if (item.type === 'image') {
    return <img {...common} src={item.dataUrl} alt="" draggable={false} style={common.style} />
  }

  if (item.type === 'cover') {
    return <div {...common} style={{ ...common.style, background: item.color }} />
  }

  if (item.type === 'ink') {
    return (
      <div {...common} style={common.style}>
        <svg width="100%" height="100%" viewBox={`0 0 ${Math.max(1, item.w)} ${Math.max(1, item.h)}`} preserveAspectRatio="none" className="overflow-visible">
          {item.strokes.map((stroke, si) => (
            <polyline
              key={si}
              points={stroke.map(([x, y]) => `${x * item.w},${y * item.h}`).join(' ')}
              fill="none"
              stroke={item.color}
              strokeWidth={item.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      </div>
    )
  }

  // shapes
  if (item.kind === 'rect') {
    return (
      <div
        {...common}
        style={{
          ...common.style,
          background: item.fill || 'transparent',
          border: item.stroke ? `${Math.max(1, item.strokeWidth * scale)}px ${item.dash ? 'dashed' : 'solid'} ${item.stroke}` : undefined,
        }}
      />
    )
  }
  if (item.kind === 'ellipse') {
    return (
      <div
        {...common}
        style={{
          ...common.style,
          background: item.fill || 'transparent',
          border: item.stroke ? `${Math.max(1, item.strokeWidth * scale)}px ${item.dash ? 'dashed' : 'solid'} ${item.stroke}` : undefined,
          borderRadius: '50%',
        }}
      />
    )
  }
  const diag = item.diag === 1 ? 1 : -1
  const w = item.w * scale
  const h = item.h * scale
  const x1 = 0
  const y1 = diag === 1 ? 0 : h
  const x2 = w
  const y2 = diag === 1 ? h : 0
  const head = Math.max(6, item.strokeWidth * 4.2 * scale)
  const ang = Math.atan2(y2 - y1, x2 - x1)
  return (
    <div {...common} style={common.style}>
      <svg width="100%" height="100%" viewBox={`0 0 ${Math.max(1, w)} ${Math.max(1, h)}`} className="overflow-visible" style={{ overflow: 'visible' }}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={item.stroke || '#111'} strokeWidth={Math.max(1, item.strokeWidth * scale)} strokeLinecap="round" strokeDasharray={item.dash ? '6 4' : undefined} />
        {item.kind === 'arrow' && (
          <polygon
            points={`${x2},${y2} ${x2 - head * Math.cos(ang - 0.42)},${y2 - head * Math.sin(ang - 0.42)} ${x2 - head * Math.cos(ang + 0.42)},${y2 - head * Math.sin(ang + 0.42)}`}
            fill={item.stroke || '#111'}
          />
        )}
      </svg>
    </div>
  )
}

function ShapePreview({
  kind,
  rect,
  scale,
  color,
  width,
}: {
  kind: ShapeKind | 'highlight' | 'redact'
  rect: { x: number; y: number; w: number; h: number }
  scale: number
  color: string
  width: number
}) {
  const base: React.CSSProperties = {
    position: 'absolute',
    left: rect.x * scale,
    top: rect.y * scale,
    width: rect.w * scale,
    height: rect.h * scale,
    pointerEvents: 'none',
  }
  if (kind === 'highlight') return <div style={{ ...base, background: '#fde047', opacity: 0.45 }} />
  if (kind === 'redact') return <div style={{ ...base, background: '#000', opacity: 0.85 }} />
  if (kind === 'ellipse')
    return <div style={{ ...base, border: `${Math.max(1, width * scale)}px solid ${color}`, borderRadius: '50%' }} />
  if (kind === 'rect') return <div style={{ ...base, border: `${Math.max(1, width * scale)}px dashed ${color}` }} />
  return (
    <svg style={{ ...base, overflow: 'visible' }} width={rect.w * scale} height={rect.h * scale}>
      <line
        x1={0}
        y1={rect.h * scale}
        x2={rect.w * scale}
        y2={0}
        stroke={color}
        strokeWidth={Math.max(1, width * scale)}
        strokeDasharray="4 3"
      />
    </svg>
  )
}

function Selection({
  item,
  scale,
  onResize,
  onRotate,
  onDuplicate,
  onDelete,
  onEditText,
}: {
  item: Item
  scale: number
  onResize: (e: React.PointerEvent, item: Item, h: Handle) => void
  onRotate: (e: React.PointerEvent, item: Item) => void
  onDuplicate: () => void
  onDelete: () => void
  onEditText: () => void
}) {
  const handles: { h: Handle; left: string; top: string }[] = [
    { h: 'nw', left: '0%', top: '0%' },
    { h: 'n', left: '50%', top: '0%' },
    { h: 'ne', left: '100%', top: '0%' },
    { h: 'e', left: '100%', top: '50%' },
    { h: 'se', left: '100%', top: '100%' },
    { h: 's', left: '50%', top: '100%' },
    { h: 'sw', left: '0%', top: '100%' },
    { h: 'w', left: '0%', top: '50%' },
  ]
  const visibleHandles = item.type === 'text' ? handles.filter((x) => x.h === 'e' || x.h === 'w') : handles
  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{
        left: item.x * scale,
        top: item.y * scale,
        width: Math.max(2, item.w * scale),
        height: Math.max(2, item.h * scale),
        transform: `rotate(${item.rotation}deg)`,
        transformOrigin: 'center',
      }}
    >
      <div className="absolute inset-0 border border-brand" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,.7)' }} />

      <div
        className="pointer-events-auto absolute left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-md border border-brand/30 bg-white p-0.5 shadow-lift"
        style={{ top: 'calc(100% + 12px)' }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {item.type === 'text' && (
          <button type="button" onClick={onEditText} title="Edit text" className="rounded p-1 text-ink-soft hover:bg-surface">
            <TextCursorInput size={13} />
          </button>
        )}
        <button type="button" onClick={onDuplicate} title="Duplicate" className="rounded p-1 text-ink-soft hover:bg-surface">
          <Copy size={13} />
        </button>
        <button type="button" onClick={onDelete} title="Delete" className="rounded p-1 text-accent-red hover:bg-red-50">
          <Trash2 size={13} />
        </button>
        <span className="mx-0.5 flex items-center gap-1 whitespace-nowrap rounded px-1 text-[10px] font-bold text-ink-muted">
          {item.locked && <Lock size={11} />}
          {Math.round(item.w)} × {Math.round(item.h)}
        </span>
      </div>

      {!item.locked &&
        visibleHandles.map(({ h, left, top }) => (
          <div
            key={h}
            onPointerDown={(e) => onResize(e, item, h)}
            className="pointer-events-auto absolute h-2.5 w-2.5 rounded-[2px] border border-brand bg-white shadow-sm"
            style={{ left, top, transform: 'translate(-50%, -50%)', cursor: HANDLE_CURSOR[h] }}
          />
        ))}

      {!item.locked && (
        <div
          onPointerDown={(e) => onRotate(e, item)}
          title="Rotate (hold Shift to snap)"
          className="pointer-events-auto absolute left-1/2 flex h-4 w-4 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border border-brand bg-white shadow-sm"
          style={{ top: -26 }}
        >
          <span className="block h-1.5 w-1.5 rounded-full bg-brand" />
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------- */
/* misc                                                                  */
/* -------------------------------------------------------------------- */

function computeSnap(
  nx: number,
  ny: number,
  item: Item,
  others: Item[],
  page: EditPage,
  scale: number,
) {
  const threshold = 6 / Math.max(0.2, scale)
  const edgesX = [nx, nx + item.w / 2, nx + item.w]
  const edgesY = [ny, ny + item.h / 2, ny + item.h]
  const targetsX = new Set<number>([0, page.width / 2, page.width])
  const targetsY = new Set<number>([0, page.height / 2, page.height])
  for (const o of others) {
    if (o.hidden) continue
    targetsX.add(o.x)
    targetsX.add(o.x + o.w / 2)
    targetsX.add(o.x + o.w)
    targetsY.add(o.y)
    targetsY.add(o.y + o.h / 2)
    targetsY.add(o.y + o.h)
  }
  let bestX: { delta: number; guide: number } | null = null
  for (const edge of edgesX) {
    for (const t of targetsX) {
      const d = t - edge
      if (Math.abs(d) <= threshold && (!bestX || Math.abs(d) < Math.abs(bestX.delta))) bestX = { delta: d, guide: t }
    }
  }
  let bestY: { delta: number; guide: number } | null = null
  for (const edge of edgesY) {
    for (const t of targetsY) {
      const d = t - edge
      if (Math.abs(d) <= threshold && (!bestY || Math.abs(d) < Math.abs(bestY.delta))) bestY = { delta: d, guide: t }
    }
  }
  return {
    x: nx + (bestX?.delta || 0),
    y: ny + (bestY?.delta || 0),
    guides: [
      ...(bestX ? [{ dir: 'v' as const, pos: bestX.guide }] : []),
      ...(bestY ? [{ dir: 'h' as const, pos: bestY.guide }] : []),
    ],
  }
}

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const rows = [
    ['V', 'Select tool'],
    ['E', 'Edit existing text'],
    ['T', 'Add text'],
    ['I', 'Add image'],
    ['D', 'Draw freehand'],
    ['H', 'Highlight'],
    ['R', 'Redact'],
    ['S', 'Signature'],
    ['Enter', 'Edit selected text'],
    ['Delete', 'Delete selection'],
    ['Ctrl/⌘ Z', 'Undo'],
    ['Ctrl/⌘ ⇧ Z', 'Redo'],
    ['Ctrl/⌘ D', 'Duplicate'],
    ['Ctrl/⌘ scroll', 'Zoom'],
    ['Arrows', 'Nudge 1 pt (⇧ = 10 pt)'],
    ['Ctrl/⌘ S', 'Download'],
    ['Esc', 'Deselect / cancel'],
  ]
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h3 className="text-[15px] font-bold text-ink">Keyboard shortcuts</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-ink-muted hover:bg-surface">
            <X size={17} />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-0.5 px-4 py-3 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-2 py-1 text-[12px]">
              <span className="text-ink-muted">{v}</span>
              <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 text-[11px] font-bold text-ink-soft">{k}</kbd>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 border-t border-line bg-surface/50 px-4 py-2 text-[11px] text-ink-muted">
          <Undo2 size={12} /> Tip: double-click text on the page to edit it.
        </div>
      </div>
    </div>
  )
}
