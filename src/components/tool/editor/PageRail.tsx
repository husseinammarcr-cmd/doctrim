import { useEffect, useRef, useState } from 'react'
import { FileText } from 'lucide-react'
import { thumbnail, type PdfJsDoc } from '../../../lib/pdf/pdfjs'
import { Loader2 } from 'lucide-react'

interface PageRailProps {
  doc: PdfJsDoc | null
  pages: { id: string; srcIndex: number; width: number; height: number }[]
  current: number
  editedPages: Set<number>
  onSelect: (index: number) => void
}

function Thumb({
  doc,
  index,
  width,
  height,
  active,
  edited,
  onClick,
}: {
  doc: PdfJsDoc | null
  index: number
  width: number
  height: number
  active: boolean
  edited: boolean
  onClick: () => void
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [visible, setVisible] = useState(index < 4)
  const holder = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (visible || !holder.current) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible(true)
      },
      { rootMargin: '400px' },
    )
    io.observe(holder.current)
    return () => io.disconnect()
  }, [visible])

  useEffect(() => {
    let cancelled = false
    if (!visible || !doc || src) return
    ;(async () => {
      try {
        const url = await thumbnail(doc, index + 1, 150)
        if (!cancelled) setSrc(url)
      } catch {
        /* thumbnail failures are non-fatal */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [visible, doc, index, src])

  return (
    <button
      ref={holder}
      type="button"
      onClick={onClick}
      className={`group relative block w-full overflow-hidden rounded-md border-2 bg-white text-left transition-all ${
        active ? 'border-brand shadow-[0_0_0_3px_rgba(0,85,255,.12)]' : 'border-transparent hover:border-brand/30'
      }`}
      style={{ aspectRatio: `${width} / ${height}` }}
      title={`Page ${index + 1}`}
      aria-current={active ? 'page' : undefined}
    >
      {src ? (
        <img src={src} alt={`Page ${index + 1}`} className="h-full w-full object-contain" draggable={false} />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-ink-muted">
          {visible ? <Loader2 size={12} className="animate-spin opacity-50" /> : <FileText size={12} className="opacity-40" />}
        </span>
      )}
      <span
        className={`absolute bottom-0.5 right-0.5 rounded px-1 text-[10px] font-bold leading-4 ${
          active ? 'bg-brand text-white' : 'bg-white/90 text-ink-muted'
        }`}
      >
        {index + 1}
      </span>
      {edited && <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-accent-orange" title="Edited" />}
    </button>
  )
}

export default function PageRail({ doc, pages, current, editedPages, onSelect }: PageRailProps) {
  return (
    <div className="lg:sticky lg:top-[72px]">
      <p className="mb-2 hidden text-[11px] font-bold uppercase tracking-wide text-ink-muted lg:block">Pages</p>
      <div className="flex gap-2 overflow-x-auto pb-2 lg:max-h-[calc(100vh-180px)] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0">
        {pages.map((p, i) => (
          <div key={p.id} className="w-[84px] shrink-0 lg:w-auto">
            <Thumb
              doc={doc}
              index={p.srcIndex}
              width={p.width}
              height={p.height}
              active={i === current}
              edited={editedPages.has(p.srcIndex)}
              onClick={() => onSelect(i)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
