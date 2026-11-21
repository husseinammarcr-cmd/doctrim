import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { openPdfJs, renderPage } from '../../lib/pdf/pdfjs'

/** Margins in millimetres. Applied uniformly to every page. */
export type CropMarginsMm = { top: number; right: number; bottom: number; left: number }

type Props = {
  bytes: Uint8Array
  margins: CropMarginsMm
  onChange: (m: CropMarginsMm) => void
}

type Mode = 'move' | 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'
type Dims = { w: number; h: number } // millimetres

const MIN_AREA = 10 // mm — never crop smaller than this

function clampMargins(m: CropMarginsMm, dims: Dims): CropMarginsMm {
  const out = {
    top: Math.max(0, Number(m.top) || 0),
    right: Math.max(0, Number(m.right) || 0),
    bottom: Math.max(0, Number(m.bottom) || 0),
    left: Math.max(0, Number(m.left) || 0),
  }
  const maxW = Math.max(MIN_AREA, dims.w - MIN_AREA)
  const maxH = Math.max(MIN_AREA, dims.h - MIN_AREA)
  if (out.left + out.right > maxW) {
    const s = maxW / (out.left + out.right)
    out.left *= s
    out.right *= s
  }
  if (out.top + out.bottom > maxH) {
    const s = maxH / (out.top + out.bottom)
    out.top *= s
    out.bottom *= s
  }
  return out
}

const HANDLES: { mode: Mode; x: string; y: string; cursor: string }[] = [
  { mode: 'nw', x: '0%', y: '0%', cursor: 'nwse-resize' },
  { mode: 'n', x: '50%', y: '0%', cursor: 'ns-resize' },
  { mode: 'ne', x: '100%', y: '0%', cursor: 'nesw-resize' },
  { mode: 'e', x: '100%', y: '50%', cursor: 'ew-resize' },
  { mode: 'se', x: '100%', y: '100%', cursor: 'nwse-resize' },
  { mode: 's', x: '50%', y: '100%', cursor: 'ns-resize' },
  { mode: 'sw', x: '0%', y: '100%', cursor: 'nesw-resize' },
  { mode: 'w', x: '0%', y: '50%', cursor: 'ew-resize' },
]

export default function CropEditor({ bytes, margins, onChange }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ mode: Mode; x: number; y: number; start: CropMarginsMm } | null>(null)
  const [dims, setDims] = useState<Dims>({ w: 297, h: 210 })
  const [dispW, setDispW] = useState(420)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!bytes || bytes.length === 0) return
    setError('')
    setReady(false)
    let cancelled = false
    ;(async () => {
      try {
        const doc = await openPdfJs(bytes)
        const page = await doc.getPage(1)
        const base = page.getViewport({ scale: 1, rotation: 0 })
        const ptToMm = 25.4 / 72
        const wMm = base.width * ptToMm
        const hMm = base.height * ptToMm
        const targetW = Math.max(240, Math.min(480, wrapRef.current?.clientWidth || 420))
        const scale = targetW / base.width
        const canvas = await renderPage(doc, 1, scale, 0)
        if (cancelled) {
          await doc.destroy()
          return
        }
        canvas.style.width = `${targetW}px`
        canvas.style.height = 'auto'
        canvas.style.display = 'block'
        if (canvasHostRef.current) {
          canvasHostRef.current.replaceChildren(canvas)
        }
        setDims({ w: wMm, h: hMm })
        setDispW(targetW)
        setReady(true)
        await doc.destroy()
      } catch (e) {
        if (!cancelled) setError(`Could not render this PDF for cropping. ${(e as Error)?.message || ''}`)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [bytes])

  const scale = dispW / dims.w // px per mm
  const dispH = dims.h * scale
  const safe = clampMargins(margins, dims)
  const x = safe.left * scale
  const y = safe.top * scale
  const w = (dims.w - safe.left - safe.right) * scale
  const h = (dims.h - safe.top - safe.bottom) * scale

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const mode = (e.target as HTMLElement).dataset.mode as Mode | undefined
    if (!mode) return
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* synthetic events have no active pointer — capture is best-effort */
    }
    dragRef.current = { mode, x: e.clientX, y: e.clientY, start: { ...safe } }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d) return
    const dx = (e.clientX - d.x) / scale
    const dy = (e.clientY - d.y) / scale
    const m = { ...d.start }
    const maxLeft = dims.w - d.start.right - MIN_AREA
    const maxTop = dims.h - d.start.bottom - MIN_AREA

    if (d.mode === 'move') {
      const ox = Math.max(-d.start.left, Math.min(dx, d.start.right))
      const oy = Math.max(-d.start.top, Math.min(dy, d.start.bottom))
      m.left += ox
      m.right -= ox
      m.top += oy
      m.bottom -= oy
    } else {
      if (d.mode.includes('n')) m.top = Math.max(0, Math.min(d.start.top + dy, maxTop))
      if (d.mode.includes('s')) m.bottom = Math.max(0, Math.min(d.start.bottom - dy, dims.h - d.start.top - MIN_AREA))
      if (d.mode.includes('w')) m.left = Math.max(0, Math.min(d.start.left + dx, maxLeft))
      if (d.mode.includes('e')) m.right = Math.max(0, Math.min(d.start.right - dx, dims.w - d.start.left - MIN_AREA))
    }
    const next = clampMargins(m, dims)
    onChange({
      top: +next.top.toFixed(1),
      right: +next.right.toFixed(1),
      bottom: +next.bottom.toFixed(1),
      left: +next.left.toFixed(1),
    })
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  return (
    <div>
      <p className="mb-3 text-[13px] text-ink-muted">
        Drag the handles to crop. The same margins are applied to every page.
      </p>
      <div
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative mx-auto overflow-hidden rounded-lg border border-line bg-white shadow-inner"
        style={{ width: dispW, height: ready || error ? dispH : 420, touchAction: 'none' }}
      >
        <div ref={canvasHostRef} className="absolute inset-0 select-none" />

        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-surface p-6 text-center text-[14px] text-accent-red">{error}</div>
        ) : !ready ? (
          <div className="absolute inset-0 flex items-center justify-center bg-surface text-[14px] text-ink-muted">Loading preview…</div>
        ) : (
          <>
            <svg
              className="pointer-events-none absolute inset-0"
              width={dispW}
              height={dispH}
              viewBox={`0 0 ${dispW} ${dispH}`}
            >
              <path
                fill="rgba(15,23,42,0.58)"
                fillRule="evenodd"
                d={`M0 0 H${dispW} V${dispH} H0 Z M${x} ${y} H${x + w} V${y + h} H${x} Z`}
              />
            </svg>

            <div
              data-mode="move"
              className="absolute cursor-move border-2 border-brand"
              style={{ left: x, top: y, width: w, height: h, boxShadow: '0 0 0 1px rgba(255,255,255,.9)' }}
            >
              {HANDLES.map((hd) => (
                <div
                  key={hd.mode}
                  data-mode={hd.mode}
                  className="absolute h-3.5 w-3.5 rounded-full border-2 border-white bg-brand shadow"
                  style={{ left: hd.x, top: hd.y, transform: 'translate(-50%, -50%)', cursor: hd.cursor }}
                />
              ))}
              <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-brand px-2 py-0.5 text-[11px] font-semibold text-white shadow">
                {(dims.w - safe.left - safe.right).toFixed(0)} × {(dims.h - safe.top - safe.bottom).toFixed(0)} mm
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
