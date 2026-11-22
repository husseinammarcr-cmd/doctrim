import { useEffect, useRef, useState } from 'react'
import {
  AlignJustify,
  ArrowRight,
  ChevronDown,
  Download,
  ImagePlus,
  Keyboard,
  Loader2,
  Minus,
  MousePointer2,
  PenLine,
  Redo2,
  Circle,
  RotateCcw,
  RotateCw,
  Signature,
  Square,
  Highlighter,
  TextCursorInput,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { ToolId } from '../../../lib/pdf/edit/types'

export interface ToolbarProps {
  tool: ToolId
  setTool: (t: ToolId) => void
  shapeKind: 'rect' | 'ellipse' | 'line' | 'arrow'
  setShapeKind: (k: 'rect' | 'ellipse' | 'line' | 'arrow') => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomFit: () => void
  pageIndex: number
  numPages: number
  onPrevPage: () => void
  onNextPage: () => void
  onExport: () => void
  exporting: null | { ratio: number; label: string }
  onSign: () => void
  onShortcuts: () => void
  editCount: number
}

const TOOL_HINT: Record<ToolId, string> = {
  select: 'Select and move (V)',
  'edit-text': 'Edit existing text (E)',
  text: 'Add text (T)',
  image: 'Add image (I)',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  line: 'Line',
  arrow: 'Arrow',
  ink: 'Draw freehand (D)',
  highlight: 'Highlight (H)',
  redact: 'Redact / blackout (R)',
  sign: 'Signature (S)',
}

function ToolButton({
  active,
  icon: Icon,
  label,
  hint,
  onClick,
  tone = 'default',
}: {
  active?: boolean
  icon: any
  label: string
  hint: string
  onClick: () => void
  tone?: 'default' | 'danger'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      aria-label={hint}
      aria-pressed={active}
      className={`group inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold transition-colors ${
        active
          ? tone === 'danger'
            ? 'bg-accent-red text-white'
            : 'bg-brand text-white shadow-sm'
          : tone === 'danger'
            ? 'text-accent-red hover:bg-red-50'
            : 'text-ink-soft hover:bg-surface'
      }`}
    >
      <Icon size={16} strokeWidth={2.1} />
      <span className="sr-only">{label}</span>
    </button>
  )
}

export default function Toolbar(props: ToolbarProps) {
  const [shapeOpen, setShapeOpen] = useState(false)
  const shapeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!shapeOpen) return
    const onDown = (e: MouseEvent) => {
      if (!shapeRef.current?.contains(e.target as Node)) setShapeOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [shapeOpen])

  const shapeActive = ['rect', 'ellipse', 'line', 'arrow'].includes(props.tool)
  const ShapeIcon = { rect: Square, ellipse: Circle, line: Minus, arrow: ArrowRight }[props.shapeKind]

  return (
    <div className="sticky top-0 z-30 rounded-lg border border-line bg-white/95 px-2 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,.05)] backdrop-blur">
      <div className="flex flex-wrap items-center gap-1">
        <ToolButton
          active={props.tool === 'select'}
          icon={MousePointer2}
          label="Select"
          hint={TOOL_HINT.select}
          onClick={() => props.setTool('select')}
        />
        <ToolButton
          active={props.tool === 'edit-text'}
          icon={TextCursorInput}
          label="Edit text"
          hint={TOOL_HINT['edit-text']}
          onClick={() => props.setTool('edit-text')}
        />
        <ToolButton
          active={props.tool === 'text'}
          icon={Type}
          label="Add text"
          hint={TOOL_HINT.text}
          onClick={() => props.setTool('text')}
        />
        <ToolButton
          active={props.tool === 'image'}
          icon={ImagePlus}
          label="Image"
          hint={TOOL_HINT.image}
          onClick={() => props.setTool('image')}
        />

        <div className="relative" ref={shapeRef}>
          <button
            type="button"
            onClick={() => setShapeOpen((o) => !o)}
            title="Shapes"
            aria-label="Shapes"
            className={`inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-[13px] font-semibold transition-colors ${
              shapeActive ? 'bg-brand text-white' : 'text-ink-soft hover:bg-surface'
            }`}
          >
            <ShapeIcon size={16} strokeWidth={2.1} />
            <ChevronDown size={12} className="opacity-80" />
          </button>
          {shapeOpen && (
            <div className="absolute left-0 top-10 z-40 w-44 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lift">
              {[
                { k: 'rect' as const, icon: Square, label: 'Rectangle' },
                { k: 'ellipse' as const, icon: Circle, label: 'Ellipse' },
                { k: 'line' as const, icon: Minus, label: 'Line' },
                { k: 'arrow' as const, icon: ArrowRight, label: 'Arrow' },
              ].map(({ k, icon: Icon, label }) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    props.setShapeKind(k)
                    props.setTool(k)
                    setShapeOpen(false)
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-semibold hover:bg-surface ${
                    props.tool === k ? 'text-brand' : 'text-ink-soft'
                  }`}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <ToolButton
          active={props.tool === 'ink'}
          icon={PenLine}
          label="Draw"
          hint={TOOL_HINT.ink}
          onClick={() => props.setTool('ink')}
        />
        <ToolButton
          active={props.tool === 'highlight'}
          icon={Highlighter}
          label="Highlight"
          hint={TOOL_HINT.highlight}
          onClick={() => props.setTool('highlight')}
        />
        <ToolButton
          active={props.tool === 'redact'}
          icon={Square}
          label="Redact"
          hint={TOOL_HINT.redact}
          tone="danger"
          onClick={() => props.setTool('redact')}
        />
        <ToolButton
          active={props.tool === 'sign'}
          icon={Signature}
          label="Sign"
          hint={TOOL_HINT.sign}
          onClick={props.onSign}
        />

        <span className="mx-1 hidden h-6 w-px bg-line sm:block" />

        <button
          type="button"
          onClick={props.onUndo}
          disabled={!props.canUndo}
          title="Undo (Ctrl/⌘ Z)"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-surface disabled:opacity-30"
        >
          <Undo2 size={17} />
        </button>
        <button
          type="button"
          onClick={props.onRedo}
          disabled={!props.canRedo}
          title="Redo (Ctrl/⌘ Shift Z)"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-soft hover:bg-surface disabled:opacity-30"
        >
          <Redo2 size={17} />
        </button>

        <span className="mx-1 hidden h-6 w-px bg-line sm:block" />

        <div className="flex items-center gap-0.5 rounded-md bg-surface/80 px-1">
          <button
            type="button"
            onClick={props.onZoomOut}
            title="Zoom out"
            className="inline-flex h-8 w-8 items-center justify-center rounded text-ink-soft hover:bg-white"
          >
            <ZoomOut size={15} />
          </button>
          <button
            type="button"
            onClick={props.onZoomFit}
            title="Fit to width"
            className="inline-flex h-8 items-center gap-1 rounded px-1.5 text-[12px] font-bold tabular-nums text-ink-soft hover:bg-white"
          >
            <AlignJustify size={13} />
            {Math.round(props.zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={props.onZoomIn}
            title="Zoom in"
            className="inline-flex h-8 w-8 items-center justify-center rounded text-ink-soft hover:bg-white"
          >
            <ZoomIn size={15} />
          </button>
        </div>

        <div className="flex items-center gap-0.5 text-[12px] font-semibold text-ink-muted">
          <button
            type="button"
            onClick={props.onPrevPage}
            disabled={props.pageIndex <= 0}
            title="Previous page"
            className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-surface disabled:opacity-30"
          >
            <RotateCcw size={15} className="hidden" />
            <ChevronDown size={16} className="rotate-90" />
          </button>
          <span className="min-w-[64px] text-center tabular-nums">
            {props.pageIndex + 1} / {props.numPages}
          </span>
          <button
            type="button"
            onClick={props.onNextPage}
            disabled={props.pageIndex >= props.numPages - 1}
            title="Next page"
            className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-surface disabled:opacity-30"
          >
            <ChevronDown size={16} className="-rotate-90" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={props.onShortcuts}
            title="Keyboard shortcuts"
            className="hidden h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface lg:inline-flex"
          >
            <Keyboard size={17} />
          </button>
          <span className="hidden text-[12px] font-semibold text-ink-muted sm:inline">
            {props.editCount} edit{props.editCount === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={props.onExport}
            disabled={!!props.exporting}
            className="btn-primary h-9 px-4 text-[13px] disabled:opacity-60"
          >
            {props.exporting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                {Math.round(props.exporting.ratio * 100)}%
              </>
            ) : (
              <>
                <Download size={15} /> Download
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
