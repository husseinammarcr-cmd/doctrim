import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Eraser, Loader2, PenLine, Type as TypeIcon, Upload, X } from 'lucide-react'
import { SIGNATURE_KEY } from '../../../lib/pdf/edit/types'

type Tab = 'draw' | 'type' | 'upload'

const TYPE_FONTS = [
  { id: 'script', label: 'Script', css: '"Segoe Script", "Brush Script MT", "Snell Roundhand", cursive' },
  { id: 'serif', label: 'Elegant', css: 'Georgia, "Times New Roman", serif' },
  { id: 'sans', label: 'Modern', css: 'Helvetica, Arial, sans-serif' },
]

const INK_COLORS = ['#111827', '#1e3a8a', '#0f766e', '#7f1d1d']

function cropCanvas(source: HTMLCanvasElement) {
  const ctx = source.getContext('2d')!
  const { width, height } = source
  const data = ctx.getImageData(0, 0, width, height).data
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  let found = false
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 12) {
        found = true
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (!found) return null
  const pad = 6
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(width - 1, maxX + pad)
  maxY = Math.min(height - 1, maxY + pad)
  const out = document.createElement('canvas')
  out.width = maxX - minX + 1
  out.height = maxY - minY + 1
  out.getContext('2d')!.drawImage(source, minX, minY, out.width, out.height, 0, 0, out.width, out.height)
  return out
}

export default function SignatureDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean
  onClose: () => void
  onApply: (dataUrl: string, aspect: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [tab, setTab] = useState<Tab>('draw')
  const [ink, setInk] = useState(INK_COLORS[0])
  const [typed, setTyped] = useState('')
  const [font, setFont] = useState(TYPE_FONTS[0].id)
  const [saved, setSaved] = useState<string | null>(null)
  const [hasInk, setHasInk] = useState(false)
  const [busy, setBusy] = useState(false)

  const fontCss = TYPE_FONTS.find((f) => f.id === font)?.css || TYPE_FONTS[0].css

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
  }, [])

  useEffect(() => {
    if (!open) return
    setSaved(localStorage.getItem(SIGNATURE_KEY))
    setHasInk(false)
    setTab('draw')
    setTyped('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = 1280
    canvas.height = 440
    clear()
  }, [open, clear])

  // typed signature preview
  useEffect(() => {
    if (!open || tab !== 'type') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!typed.trim()) {
      setHasInk(false)
      return
    }
    ctx.fillStyle = ink
    ctx.textBaseline = 'middle'
    let size = 190
    ctx.font = `${size}px ${fontCss}`
    const maxWidth = canvas.width - 80
    while (ctx.measureText(typed).width > maxWidth && size > 40) {
      size -= 6
      ctx.font = `${size}px ${fontCss}`
    }
    ctx.textAlign = 'center'
    ctx.fillText(typed, canvas.width / 2, canvas.height / 2)
    setHasInk(true)
  }, [typed, font, ink, tab, open, fontCss])

  const pos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    }
  }

  const start = (e: React.PointerEvent) => {
    if (tab !== 'draw') return
    drawing.current = true
    const ctx = canvasRef.current!.getContext('2d')!
    const p = pos(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 5
    ctx.strokeStyle = ink
    canvasRef.current!.setPointerCapture(e.pointerId)
  }

  const move = (e: React.PointerEvent) => {
    if (!drawing.current || tab !== 'draw') return
    const ctx = canvasRef.current!.getContext('2d')!
    const p = pos(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    if (!hasInk) setHasInk(true)
  }

  const end = () => {
    drawing.current = false
  }

  const apply = async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasInk) return
    setBusy(true)
    try {
      const cropped = cropCanvas(canvas)
      if (!cropped) return
      const dataUrl = cropped.toDataURL('image/png')
      localStorage.setItem(SIGNATURE_KEY, dataUrl)
      onApply(dataUrl, cropped.height / cropped.width)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const useSaved = () => {
    if (!saved) return
    const img = new Image()
    img.onload = () => onApply(saved, img.height / img.width)
    img.src = saved
    onClose()
  }

  const upload = async (file: File) => {
    const dataUrl = await new Promise<string>((res, rej) => {
      const fr = new FileReader()
      fr.onload = () => res(String(fr.result))
      fr.onerror = rej
      fr.readAsDataURL(file)
    })
    const img = new Image()
    img.src = dataUrl
    await img.decode().catch(() => undefined)
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const scale = Math.min((canvas.width - 60) / img.width, (canvas.height - 60) / img.height, 1)
    const w = img.width * scale
    const h = img.height * scale
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
    setHasInk(true)
    setTab('draw')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label="Add signature">
      <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h3 className="text-[16px] font-bold text-ink">Add your signature</h3>
          <button type="button" onClick={onClose} className="rounded p-1.5 text-ink-muted hover:bg-surface" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="flex gap-1 rounded-lg bg-surface p-1">
            {[
              { id: 'draw' as const, icon: PenLine, label: 'Draw' },
              { id: 'type' as const, icon: TypeIcon, label: 'Type' },
              { id: 'upload' as const, icon: Upload, label: 'Upload' },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id)
                  if (id === 'draw') clear()
                  if (id !== 'type') setTyped('')
                }}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold ${
                  tab === id ? 'bg-white text-brand shadow-sm' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          {tab === 'type' && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Type your name"
                autoFocus
                className="min-w-0 flex-1 rounded border border-line px-3 py-2 text-[14px] outline-none focus:border-brand"
              />
              <select
                value={font}
                onChange={(e) => setFont(e.target.value)}
                className="rounded border border-line px-2 py-2 text-[13px]"
              >
                {TYPE_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={`mt-3 rounded-lg border ${tab === 'draw' ? 'border-dashed border-brand/40 bg-brand-lighter/40' : 'border-line bg-surface/40'}`}>
            <canvas
              ref={canvasRef}
              className={`h-[170px] w-full touch-none ${tab === 'draw' ? 'cursor-crosshair' : 'cursor-default'}`}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerLeave={end}
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              {INK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setInk(c)}
                  aria-label={`Ink colour ${c}`}
                  className={`h-5 w-5 rounded-full border border-line ${ink === c ? 'ring-2 ring-brand ring-offset-1' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <button type="button" onClick={clear} className="btn-ghost h-8 px-2.5 text-[12px]">
              <Eraser size={13} /> Clear
            </button>
            {saved && (
              <button type="button" onClick={useSaved} className="btn-outline h-8 px-2.5 text-[12px]">
                Use saved signature
              </button>
            )}
            <label className="btn-ghost h-8 cursor-pointer px-2.5 text-[12px]">
              <Upload size={13} /> Upload PNG
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void upload(f)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-line bg-surface/50 px-5 py-3">
          <button type="button" onClick={onClose} className="btn-ghost h-9 px-4 text-[13px]">
            Cancel
          </button>
          <button type="button" onClick={apply} disabled={!hasInk || busy} className="btn-primary h-9 px-4 text-[13px] disabled:opacity-50">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Place signature
          </button>
        </div>
      </div>
    </div>
  )
}
