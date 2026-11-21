import { RotateCw, Trash2, ChevronLeft, ChevronRight, Check } from 'lucide-react'

export interface PageItem {
  srcIndex: number
  rotation: number
  included: boolean
  thumb: string
}

export default function PageGrid({
  pages,
  mode,
  onToggle,
  onRotate,
  onMove,
  onRemove,
}: {
  pages: PageItem[]
  mode: 'organize' | 'select' | 'rotate'
  onToggle?: (i: number) => void
  onRotate?: (i: number, delta: number) => void
  onMove?: (i: number, dir: -1 | 1) => void
  onRemove?: (i: number) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {pages.map((p, i) => {
        const active = p.included
        return (
          <div
            key={`${p.srcIndex}-${i}`}
            className={`card relative overflow-hidden p-2 transition ${
              mode === 'select' ? 'cursor-pointer' : ''
            } ${active ? 'border-brand' : 'opacity-50'}`}
            onClick={mode === 'select' ? () => onToggle?.(i) : undefined}
          >
            <div className="flex h-36 items-center justify-center overflow-hidden rounded bg-surface">
              <img
                src={p.thumb}
                alt={`Page ${p.srcIndex + 1}`}
                className="max-h-full max-w-full object-contain transition-transform"
                style={{ transform: `rotate(${p.rotation}deg)` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-ink-muted">Page {p.srcIndex + 1}</span>
              {mode === 'select' && (
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    active ? 'border-brand bg-brand text-white' : 'border-line bg-white text-transparent'
                  }`}
                >
                  <Check size={12} />
                </span>
              )}
            </div>

            {/* controls */}
            {(mode === 'organize' || mode === 'rotate') && (
              <div className="mt-1 flex items-center justify-center gap-1">
                {mode === 'organize' && (
                  <>
                    <button onClick={() => onMove?.(i, -1)} disabled={i === 0} className="rounded p-1 text-ink-muted hover:bg-surface disabled:opacity-30" aria-label="Move left">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => onMove?.(i, 1)} disabled={i === pages.length - 1} className="rounded p-1 text-ink-muted hover:bg-surface disabled:opacity-30" aria-label="Move right">
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
                <button onClick={() => onRotate?.(i, 90)} className="rounded p-1 text-ink-muted hover:bg-surface" aria-label="Rotate">
                  <RotateCw size={16} />
                </button>
                {mode === 'organize' && (
                  <button onClick={() => onRemove?.(i)} className="rounded p-1 text-accent-red hover:bg-surface" aria-label="Remove page">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
