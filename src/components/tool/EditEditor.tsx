import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronLeft, ChevronRight, Download, Image as ImageIcon, Loader2, MousePointer2,
  PenLine, Square, Trash2, Type, Undo2,
} from 'lucide-react'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { openPdfJs, renderPage, type PdfJsDoc } from '../../lib/pdf/pdfjs'
import { saveBlob } from '../../lib/download'

/**
 * In-browser PDF editor: put text, images, shapes and freehand ink on any page
 * and export a flattened PDF. Everything stays on the device — no upload.
 *
 * Item coordinates are stored in PDF points with a top-left origin; the export
 * converts to pdf-lib's bottom-left origin per page.
 */

type Base = { id: string }
type TextItem = Base & { type: 'text'; x: number; y: number; text: string; size: number; color: string }
type ImageItem = Base & { type: 'image'; x: number; y: number; w: number; h: number; dataUrl: string }
type RectItem = Base & { type: 'rect'; x: number; y: number; w: number; h: number; color: string; thickness: number }
type InkItem = Base & { type: 'ink'; points: [number, number][]; color: string; thickness: number }
type Item = TextItem | ImageItem | RectItem | InkItem

type Mode = 'select' | 'text' | 'image' | 'rect' | 'ink'

const uid = () => Math.random().toString(36).slice(2, 10)

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

const COLORS = ['#111827', '#e11d48', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed']

export default function EditEditor({ bytes, fileName }: { bytes: Uint8Array; fileName: string }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const docRef = useRef<PdfJsDoc | null>(null)
  const dragRef = useRef<{ id: string; startX: number; startY: number; ox: number; oy: number } | null>(null)
  const drawRef = useRef<{ x: number; y: number } | null>(null)

  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [pxPerPt, setPxPerPt] = useState(1)
  const [pageSize, setPageSize] = useState({ w: 612, h: 792 })
  const [items, setItems] = useState<Record<number, Item[]>>({})
  const [mode, setMode] = useState<Mode>('select')
  const [selected, setSelected] = useState<string | null>(null)
  const [color, setColor] = useState(COLORS[0])
  const [fontSize, setFontSize] = useState(16)
  const [thickness, setThickness] = useState(2)
  const [history, setHistory] = useState<Record<number, Item[]>[]>([])
  const [pendingInk, setPendingInk] = useState<[number, number][] | null>(null)
  const [pendingRect, setPendingRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const imgInputRef = useRef<HTMLInputElement>(null)

  const pushHistory = useCallback((next: Record<number, Item[]>) => {
    setHistory((h) => [...h.slice(-40), next])
  }, [])

  const commit = useCallback(
    (pageNo: number, next: Item[]) => {
      setItems((prev) => {
        const snapshot = { ...prev }
        pushHistory(snapshot)
        return { ...prev, [pageNo]: next }
      })
    },
    [pushHistory],
  )

  const pageItems = items[page] || []

  // ---- render current page -------------------------------------------------
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        if (!docRef.current) docRef.current = await openPdfJs(bytes)
        const doc = docRef.current
        if (!cancelled) setNumPages(doc.numPages)
        const p = await doc.getPage(page)
        const base = p.getViewport({ scale: 1 })
        const hostW = hostRef.current?.clientWidth || 700
        const targetW = Math.max(280, Math.min(860, hostW - 24))
        const scale = targetW / base.width
        const canvas = await renderPage(doc, page, scale, 0)
        if (cancelled) return
        canvas.style.width = '100%'
        canvas.style.height = 'auto'
        canvas.style.display = 'block'
        // append into a dedicated host that React never renders children into
        if (canvasHostRef.current) canvasHostRef.current.replaceChildren(canvas)
        setPxPerPt(targetW / base.width)
        setPageSize({ w: base.width, h: base.height })
        setLoading(false)
      } catch (e: any) {
        setError(e?.message || 'Could not open this PDF')
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [bytes, page])

  useEffect(() => () => { void docRef.current?.destroy() }, [])

  const toPt = useCallback(
    (clientX: number, clientY: number) => {
      const el = hostRef.current
      if (!el) return { x: 0, y: 0 }
      const r = el.getBoundingClientRect()
      return { x: (clientX - r.left) / pxPerPt, y: (clientY - r.top) / pxPerPt }
    },
    [pxPerPt],
  )

  // ---- toolbar actions -----------------------------------------------------
  const addText = (clientX: number, clientY: number) => {
    const { x, y } = toPt(clientX, clientY)
    const item: TextItem = { id: uid(), type: 'text', x, y, text: 'Text', size: fontSize, color }
    commit(page, [...pageItems, item])
    setSelected(item.id)
    setMode('select')
  }

  const addImageFile = async (file: File) => {
    const dataUrl = await new Promise<string>((res, rej) => {
      const fr = new FileReader()
      fr.onload = () => res(String(fr.result))
      fr.onerror = rej
      fr.readAsDataURL(file)
    })
    const img = new Image()
    img.src = dataUrl
    await img.decode().catch(() => undefined)
    const maxW = pageSize.w * 0.4
    const ratio = img.width && img.height ? img.height / img.width : 1
    const w = Math.min(maxW, img.width || maxW)
    const h = w * ratio
    const item: ImageItem = {
      id: uid(), type: 'image',
      x: (pageSize.w - w) / 2, y: (pageSize.h - h) / 2, w, h, dataUrl,
    }
    commit(page, [...pageItems, item])
    setSelected(item.id)
  }

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h
      const prev = h[h.length - 1]
      setItems(prev)
      return h.slice(0, -1)
    })
    setSelected(null)
  }

  const removeSelected = () => {
    if (!selected) return
    commit(page, pageItems.filter((i) => i.id !== selected))
    setSelected(null)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault()
        removeSelected()
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ---- pointer handling on the overlay ------------------------------------
  const onOverlayDown = (e: React.PointerEvent) => {
    if (mode === 'select') {
      setSelected(null)
      return
    }
    if (mode === 'text') {
      addText(e.clientX, e.clientY)
      return
    }
    if (mode === 'image') {
      imgInputRef.current?.click()
      return
    }
    const p = toPt(e.clientX, e.clientY)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    if (mode === 'rect') {
      drawRef.current = p
      setPendingRect({ x: p.x, y: p.y, w: 0, h: 0 })
    } else if (mode === 'ink') {
      drawRef.current = p
      setPendingInk([[p.x, p.y]])
    }
  }

  const onOverlayMove = (e: React.PointerEvent) => {
    if (!drawRef.current) return
    const p = toPt(e.clientX, e.clientY)
    if (mode === 'rect' && pendingRect) {
      setPendingRect({
        x: Math.min(drawRef.current.x, p.x),
        y: Math.min(drawRef.current.y, p.y),
        w: Math.abs(p.x - drawRef.current.x),
        h: Math.abs(p.y - drawRef.current.y),
      })
    } else if (mode === 'ink' && pendingInk) {
      setPendingInk([...pendingInk, [p.x, p.y]])
    }
  }

  const onOverlayUp = () => {
    if (mode === 'rect' && pendingRect && pendingRect.w > 3 && pendingRect.h > 3) {
      const item: RectItem = { id: uid(), type: 'rect', ...pendingRect, color, thickness }
      commit(page, [...pageItems, item])
      setSelected(item.id)
    }
    if (mode === 'ink' && pendingInk && pendingInk.length > 2) {
      const item: InkItem = { id: uid(), type: 'ink', points: pendingInk, color, thickness }
      commit(page, [...pageItems, item])
    }
    setPendingRect(null)
    setPendingInk(null)
    drawRef.current = null
    if (mode !== 'select') setMode('select')
  }

  const startDrag = (e: React.PointerEvent, item: TextItem | ImageItem | RectItem) => {
    if (mode !== 'select') return
    e.stopPropagation()
    setSelected(item.id)
    const p = toPt(e.clientX, e.clientY)
    dragRef.current = { id: item.id, startX: p.x, startY: p.y, ox: item.x, oy: item.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onDragMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const p = toPt(e.clientX, e.clientY)
    const nx = Math.max(0, Math.min(pageSize.w, d.ox + (p.x - d.startX)))
    const ny = Math.max(0, Math.min(pageSize.h, d.oy + (p.y - d.startY)))
    setItems((prev) => ({
      ...prev,
      [page]: (prev[page] || []).map((i) => (i.id === d.id ? { ...i, x: nx, y: ny } : i)),
    }))
  }

  const endDrag = () => {
    if (dragRef.current) {
      dragRef.current = null
      commit(page, items[page] || [])
    }
  }

  // ---- export --------------------------------------------------------------
  const exportPdf = async () => {
    setSaving(true)
    setError('')
    try {
      const pdf = await PDFDocument.load(bytes.slice())
      const font = await pdf.embedFont(StandardFonts.Helvetica)
      const pages = pdf.getPages()
      for (let i = 0; i < pages.length; i++) {
        const list = items[i + 1]
        if (!list || list.length === 0) continue
        const target = pages[i]
        const H = target.getHeight()
        for (const it of list) {
          if (it.type === 'text') {
            const lines = it.text.split('\n')
            lines.forEach((line, li) => {
              if (!line.trim()) return
              target.drawText(line, {
                x: it.x,
                y: H - it.y - it.size * (0.85 + li * 1.25),
                size: it.size,
                font,
                color: hexToRgb(it.color),
              })
            })
          } else if (it.type === 'image') {
            const b64 = it.dataUrl.split(',')[1]
            const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
            const img = it.dataUrl.startsWith('data:image/png')
              ? await pdf.embedPng(bin)
              : await pdf.embedJpg(bin)
            target.drawImage(img, { x: it.x, y: H - it.y - it.h, width: it.w, height: it.h })
          } else if (it.type === 'rect') {
            target.drawRectangle({
              x: it.x, y: H - it.y - it.h, width: it.w, height: it.h,
              borderColor: hexToRgb(it.color), borderWidth: it.thickness,
            })
          } else if (it.type === 'ink' && it.points.length > 1) {
            const d = it.points
              .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
              .join(' ')
            target.drawSvgPath(d, {
              x: 0, y: H,
              borderColor: hexToRgb(it.color),
              borderWidth: it.thickness,
            })
          }
        }
      }
      const out = await pdf.save()
      const name = fileName.replace(/\.pdf$/i, '') + '-edited.pdf'
      await saveBlob(new Blob([out.slice()], { type: 'application/pdf' }), name, 'application/pdf')
    } catch (e: any) {
      setError(e?.message || 'Could not export the PDF')
    } finally {
      setSaving(false)
    }
  }

  const tools: { id: Mode; icon: any; label: string }[] = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'image', icon: ImageIcon, label: 'Image' },
    { id: 'rect', icon: Square, label: 'Shape' },
    { id: 'ink', icon: PenLine, label: 'Draw' },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded border border-line bg-white p-2">
        {tools.map((t) => {
          const Icon = t.icon
          const active = mode === t.id
          return (
            <button
              key={t.id}
              onClick={() => (t.id === 'image' ? imgInputRef.current?.click() : setMode(t.id))}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[13px] font-semibold ${
                active ? 'bg-brand text-white' : 'text-ink-soft hover:bg-surface'
              }`}
              title={t.label}
            >
              <Icon size={15} /> {t.label}
            </button>
          )
        })}
        <span className="mx-1 h-5 w-px bg-line" />
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c)
                if (selected) {
                  commit(page, pageItems.map((i) => ('color' in i && i.id === selected ? { ...i, color: c } : i)))
                }
              }}
              className={`h-5 w-5 rounded-full border ${color === c ? 'ring-2 ring-brand ring-offset-1' : 'border-line'}`}
              style={{ background: c }}
              aria-label={`colour ${c}`}
            />
          ))}
        </div>
        <span className="mx-1 h-5 w-px bg-line" />
        {mode === 'text' && (
          <label className="flex items-center gap-1 text-[12px] text-ink-muted">
            Size
            <input
              type="number" min={6} max={72} value={fontSize}
              onChange={(e) => setFontSize(Math.max(6, Math.min(72, Number(e.target.value) || 16)))}
              className="w-14 rounded border border-line px-1.5 py-0.5 text-[12px]"
            />
          </label>
        )}
        {(mode === 'rect' || mode === 'ink') && (
          <label className="flex items-center gap-1 text-[12px] text-ink-muted">
            Width
            <input
              type="number" min={1} max={20} value={thickness}
              onChange={(e) => setThickness(Math.max(1, Math.min(20, Number(e.target.value) || 2)))}
              className="w-14 rounded border border-line px-1.5 py-0.5 text-[12px]"
            />
          </label>
        )}
        <button onClick={undo} disabled={history.length === 0} className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1.5 text-[13px] font-semibold text-ink-soft hover:bg-surface disabled:opacity-40">
          <Undo2 size={15} /> Undo
        </button>
        <button onClick={removeSelected} disabled={!selected} className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-[13px] font-semibold text-accent-red hover:bg-surface disabled:opacity-40">
          <Trash2 size={15} /> Delete
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between text-[13px] text-ink-muted">
        <span>
          {loading ? 'Rendering page…' : `Page ${page} of ${numPages}`}
          {mode !== 'select' && (
            <span className="ml-2 rounded bg-brand-light px-2 py-0.5 font-semibold text-brand">
              {mode === 'text' ? 'Click to place text' : mode === 'rect' ? 'Drag to draw a box' : mode === 'ink' ? 'Drag to draw' : 'Choose an image'}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded p-1 hover:bg-surface disabled:opacity-30"><ChevronLeft size={18} /></button>
          <button onClick={() => setPage((p) => Math.min(numPages || 1, p + 1))} disabled={page >= numPages} className="rounded p-1 hover:bg-surface disabled:opacity-30"><ChevronRight size={18} /></button>
        </span>
      </div>

      <div className="mt-2 flex justify-center">
        <div
          ref={hostRef}
          className="relative w-full max-w-[860px] select-none bg-white shadow-sm"
          style={{ cursor: mode === 'select' ? 'default' : 'crosshair', touchAction: 'none' }}
          onPointerDown={onOverlayDown}
          onPointerMove={(e) => {
            onOverlayMove(e)
            onDragMove(e)
          }}
          onPointerUp={() => {
            onOverlayUp()
            endDrag()
          }}
          onPointerLeave={() => {
            if (drawRef.current) onOverlayUp()
          }}
        >
          {loading && (
            <div className="flex h-40 items-center justify-center text-[14px] text-ink-muted">
              <Loader2 size={18} className="mr-2 animate-spin" /> Loading preview…
            </div>
          )}

          {/* canvas lives here — React never renders children into this node */}
          <div ref={canvasHostRef} />
          {!loading && (
            <div className="pointer-events-none absolute inset-0">
              {pageItems.map((it) => {
                const isSel = selected === it.id
                const stylePos = 'x' in it ? { left: it.x * pxPerPt, top: it.y * pxPerPt } : {}
                if (it.type === 'text') {
                  return (
                    <div
                      key={it.id}
                      className="pointer-events-auto absolute cursor-move"
                      style={{ ...stylePos, color: it.color, fontSize: it.size * pxPerPt, lineHeight: 1.25 }}
                      onPointerDown={(e) => startDrag(e, it)}
                    >
                      <span
                        contentEditable
                        suppressContentEditableWarning
                        onPointerDown={(e) => e.stopPropagation()}
                        onBlur={(e) =>
                          commit(page, pageItems.map((i) => (i.id === it.id ? { ...it, text: e.currentTarget.innerText } : i)))
                        }
                        className={`block whitespace-pre-wrap outline-none ${isSel ? 'ring-1 ring-brand' : ''}`}
                        style={{ minWidth: 12, padding: 1 }}
                      >
                        {it.text}
                      </span>
                    </div>
                  )
                }
                if (it.type === 'image') {
                  return (
                    <img
                      key={it.id}
                      src={it.dataUrl}
                      alt=""
                      draggable={false}
                      onPointerDown={(e) => startDrag(e, it)}
                      className={`pointer-events-auto absolute cursor-move ${isSel ? 'ring-2 ring-brand' : ''}`}
                      style={{ ...stylePos, width: it.w * pxPerPt, height: it.h * pxPerPt }}
                    />
                  )
                }
                if (it.type === 'rect') {
                  return (
                    <div
                      key={it.id}
                      onPointerDown={(e) => startDrag(e, it)}
                      className={`pointer-events-auto absolute cursor-move ${isSel ? 'ring-1 ring-brand' : ''}`}
                      style={{
                        ...stylePos,
                        width: it.w * pxPerPt,
                        height: it.h * pxPerPt,
                        border: `${Math.max(1, it.thickness * pxPerPt)}px solid ${it.color}`,
                      }}
                    />
                  )
                }
                const d = it.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0] * pxPerPt} ${p[1] * pxPerPt}`).join(' ')
                return (
                  <svg key={it.id} className="pointer-events-none absolute inset-0 h-full w-full">
                    <path d={d} fill="none" stroke={it.color} strokeWidth={Math.max(1, it.thickness * pxPerPt)} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )
              })}

              {pendingRect && (
                <div
                  className="absolute"
                  style={{
                    left: pendingRect.x * pxPerPt, top: pendingRect.y * pxPerPt,
                    width: pendingRect.w * pxPerPt, height: pendingRect.h * pxPerPt,
                    border: `${Math.max(1, thickness * pxPerPt)}px solid ${color}`,
                  }}
                />
              )}
              {pendingInk && pendingInk.length > 1 && (
                <svg className="absolute inset-0 h-full w-full">
                  <path
                    d={pendingInk.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0] * pxPerPt} ${p[1] * pxPerPt}`).join(' ')}
                    fill="none" stroke={color} strokeWidth={Math.max(1, thickness * pxPerPt)}
                    strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          )}
        </div>
      </div>

      <input
        ref={imgInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void addImageFile(f)
          e.target.value = ''
        }}
      />

      {error && <p className="mt-3 rounded bg-red-50 px-4 py-3 text-[14px] text-accent-red">{error}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button onClick={exportPdf} disabled={saving} className="btn-primary btn-lg disabled:opacity-50">
          {saving ? <><Loader2 size={18} className="animate-spin" /> Preparing…</> : <><Download size={18} /> Download edited PDF</>}
        </button>
        <span className="text-[13px] text-ink-muted">
          {Object.values(items).reduce((n, l) => n + l.length, 0)} element(s) added
        </span>
      </div>
    </div>
  )
}
