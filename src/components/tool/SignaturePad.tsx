import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'

export default function SignaturePad({ onChange }: { onChange: (png: Uint8Array | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current!
    canvas.width = 600
    canvas.height = 220
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1A1A1A'
  }, [])

  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvasRef.current!.width,
      y: ((e.clientY - rect.top) / rect.height) * canvasRef.current!.height,
    }
  }

  const emit = () => {
    const canvas = canvasRef.current!
    canvas.toBlob((blob) => {
      if (!blob) return onChange(null)
      blob.arrayBuffer().then((buf) => onChange(new Uint8Array(buf)))
    }, 'image/png')
  }

  const start = (e: React.PointerEvent) => {
    drawing.current = true
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = pos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    canvasRef.current!.setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasInk(true)
  }
  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    emit()
  }

  const clear = () => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
    onChange(null)
  }

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <canvas
          ref={canvasRef}
          className="h-[160px] w-full touch-none cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[13px] text-ink-muted">Draw your signature above</p>
        <button onClick={clear} className="btn-ghost px-3 py-1.5 text-[13px]">
          <Eraser size={14} /> Clear
        </button>
      </div>
      {!hasInk && <p className="sr-only">Signature is empty</p>}
    </div>
  )
}
