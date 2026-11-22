import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  BringToFront,
  Copy,
  Eye,
  EyeOff,
  Italic,
  Link2,
  Lock,
  LockOpen,
  PenLine,
  SendToBack,
  Signature,
  Square,
  Trash2,
  Type as TypeIcon,
  Image as ImageIcon,
  SlidersHorizontal,
  TextCursorInput,
  Palette,
  Layers,
} from 'lucide-react'
import {
  COLORS,
  FONT_LABEL,
  elementLabel,
  type EditPage,
  type ImageItem,
  type Item,
  type ShapeItem,
  type TextItem,
  type ToolId,
} from '../../../lib/pdf/edit/types'

type Patch = Record<string, unknown>

interface Props {
  item: Item | null
  page: EditPage
  pageItems: Item[]
  tool: ToolId
  onPatch: (patch: Patch) => void
  onDelete: () => void
  onDuplicate: () => void
  onSelect: (id: string | null) => void
  onToggleHidden: (id: string) => void
  onToggleLock: (id: string) => void
  onOrder: (dir: 'front' | 'back' | 'up' | 'down') => void
  onFitWidth: () => void
  onEditText: (id: string) => void
  onReplaceImage: () => void
  onAddSignature: () => void
  onTool: (t: ToolId) => void
  style: { color: string; size: number; family: TextItem['family']; bold: boolean; italic: boolean; strokeWidth: number }
  onStyle: (patch: Partial<Props['style']>) => void
  flattenRedactions: boolean
  onFlattenChange: (v: boolean) => void
  hasRedaction: boolean
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">{children}</p>
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1.5">{children}</div>
}

function IconBtn({
  active,
  onClick,
  title,
  children,
  danger,
}: {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={!!active}
      className={`inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded border px-1.5 text-[12px] font-semibold transition-colors ${
        active
          ? 'border-brand bg-brand-light text-brand'
          : danger
            ? 'border-line text-accent-red hover:bg-red-50'
            : 'border-line text-ink-soft hover:bg-surface'
      }`}
    >
      {children}
    </button>
  )
}

function ColorRow({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Colour ${c}`}
          className={`h-5 w-5 rounded-full border ${value.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-brand ring-offset-1' : 'border-line'}`}
          style={{ background: c }}
        />
      ))}
      <label className="relative h-5 w-5 cursor-pointer overflow-hidden rounded-full border border-line" title="Custom colour">
        <span
          className="block h-full w-full"
          style={{ background: 'conic-gradient(#ef4444,#eab308,#22c55e,#06b6d4,#6366f1,#ec4899,#ef4444)' }}
        />
        <input
          type="color"
          value={value.startsWith('#') ? value : '#111827'}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}

function NumberBox({
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (v: number) => void
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  return (
    <div className="flex h-8 items-stretch overflow-hidden rounded border border-line">
      <button type="button" className="w-6 text-[13px] text-ink-muted hover:bg-surface" onClick={() => onChange(clamp(value - step))}>
        −
      </button>
      <input
        type="number"
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
        className="w-12 border-x border-line bg-white px-1 text-center text-[12px] tabular-nums outline-none"
      />
      <span className="flex items-center px-1 text-[10px] font-semibold text-ink-muted">{suffix}</span>
      <button type="button" className="w-6 text-[13px] text-ink-muted hover:bg-surface" onClick={() => onChange(clamp(value + step))}>
        +
      </button>
    </div>
  )
}

export default function PropertiesPanel(props: Props) {
  const { item, page, pageItems } = props

  const text = item?.type === 'text' ? (item as TextItem) : null
  const image = item?.type === 'image' ? (item as ImageItem) : null
  const shape = item?.type === 'shape' ? (item as ShapeItem) : null
  const isRedact = !!shape?.redact
  const hasFlatten = props.hasRedaction

  return (
    <aside className="space-y-3">
      <div className="rounded-lg border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line bg-surface/60 px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-ink">
            <SlidersHorizontal size={13} /> Properties
          </span>
          {item && (
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={props.onDuplicate} title="Duplicate (Ctrl+D)" className="rounded p-1 text-ink-muted hover:bg-white hover:text-ink">
                <Copy size={14} />
              </button>
              <button type="button" onClick={props.onDelete} title="Delete" className="rounded p-1 text-accent-red hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4 px-3 py-3">
          {!item && (
            <div className="space-y-3">
              <p className="text-[13px] leading-relaxed text-ink-muted">
                Click any existing text to rewrite it, or pick a tool and start drawing on the page.
              </p>
              <div className="rounded-md bg-surface/70 px-2.5 py-2 text-[11px] font-semibold text-ink-muted">
                Page size · {Math.round(page.width)} × {Math.round(page.height)} pt
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { t: 'edit-text' as ToolId, icon: TextCursorInput, label: 'Edit text' },
                  { t: 'text' as ToolId, icon: TypeIcon, label: 'Add text' },
                  { t: 'highlight' as ToolId, icon: PenLine, label: 'Highlight' },
                  { t: 'sign' as ToolId, icon: Signature, label: 'Sign' },
                ].map(({ t, icon: Icon, label }) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => (t === 'sign' ? props.onAddSignature() : props.onTool(t))}
                    className="btn-ghost h-9 justify-start px-2 text-[12px]"
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
              <div className="rounded-md bg-surface/70 px-2.5 py-2 text-[12px] leading-relaxed text-ink-muted">
                <b className="text-ink-soft">Tip:</b> double-click any added text to edit it. Drag the handles to resize, or
                press Delete to remove a selection.
              </div>

              {props.tool !== 'select' && props.tool !== 'edit-text' && (
                <div className="space-y-3 rounded-md border border-line px-2.5 py-2.5">
                  <Label>New {props.tool === 'text' ? 'text' : props.tool === 'ink' ? 'drawing' : 'item'} style</Label>
                  <ColorRow value={props.style.color} onChange={(c) => props.onStyle({ color: c })} />
                  {(props.tool === 'text' || props.tool === 'sign') && (
                    <div className="flex items-center gap-1.5">
                      <NumberBox value={props.style.size} min={6} max={120} suffix="pt" onChange={(v) => props.onStyle({ size: v })} />
                      <IconBtn active={props.style.bold} onClick={() => props.onStyle({ bold: !props.style.bold })} title="Bold">
                        <Bold size={14} />
                      </IconBtn>
                      <IconBtn active={props.style.italic} onClick={() => props.onStyle({ italic: !props.style.italic })} title="Italic">
                        <Italic size={14} />
                      </IconBtn>
                    </div>
                  )}
                  {props.tool !== 'text' && props.tool !== 'sign' && (
                    <NumberBox
                      value={props.style.strokeWidth}
                      min={0.5}
                      max={40}
                      step={0.5}
                      suffix="pt"
                      onChange={(v) => props.onStyle({ strokeWidth: v })}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {item && (
            <>
              <div className="flex items-center gap-2 rounded-md bg-surface/70 px-2 py-1.5">
                {text && <TypeIcon size={14} className="text-brand" />}
                {image && <ImageIcon size={14} className="text-brand" />}
                {shape && <Square size={14} className="text-brand" />}
                {item.type === 'ink' && <PenLine size={14} className="text-brand" />}
                {item.type === 'cover' && <Square size={14} className="text-brand" />}
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink">{elementLabel(item)}</span>
                <button type="button" onClick={() => props.onToggleLock(item.id)} title={item.locked ? 'Unlock' : 'Lock'} className="rounded p-1 text-ink-muted hover:bg-white">
                  {item.locked ? <Lock size={13} /> : <LockOpen size={13} />}
                </button>
              </div>

              {text && (
                <>
                  <div>
                    <Label>Font</Label>
                    <select
                      value={text.family}
                      onChange={(e) => props.onPatch({ family: e.target.value })}
                      className="h-8 w-full rounded border border-line bg-white px-2 text-[12px] font-semibold text-ink"
                    >
                      {Object.entries(FONT_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Style</Label>
                    <Row>
                      <NumberBox value={text.size} min={4} max={200} suffix="pt" onChange={(v) => props.onPatch({ size: v })} />
                      <IconBtn active={text.bold} onClick={() => props.onPatch({ bold: !text.bold })} title="Bold">
                        <Bold size={14} />
                      </IconBtn>
                      <IconBtn active={text.italic} onClick={() => props.onPatch({ italic: !text.italic })} title="Italic">
                        <Italic size={14} />
                      </IconBtn>
                    </Row>
                  </div>

                  <div>
                    <Label>Colour</Label>
                    <ColorRow value={text.color} onChange={(c) => props.onPatch({ color: c })} />
                  </div>

                  <div>
                    <Label>Alignment</Label>
                    <Row>
                      {[
                        { v: 'left', icon: AlignLeft },
                        { v: 'center', icon: AlignCenter },
                        { v: 'right', icon: AlignRight },
                      ].map(({ v, icon: Icon }) => (
                        <IconBtn key={v} active={text.align === v} onClick={() => props.onPatch({ align: v })} title={`Align ${v}`}>
                          <Icon size={14} />
                        </IconBtn>
                      ))}
                      <IconBtn onClick={props.onFitWidth} title="Fit width to text">
                        <Link2 size={14} />
                      </IconBtn>
                    </Row>
                  </div>

                  <div>
                    <Label>Line height</Label>
                    <NumberBox value={text.lineHeight} min={0.9} max={2.6} step={0.05} onChange={(v) => props.onPatch({ lineHeight: v })} />
                  </div>

                  <div>
                    <Label>Highlight behind text</Label>
                    <Row>
                      {['', '#fff3a3', '#dbeafe', '#dcfce7', '#fee2e2'].map((c) => (
                        <button
                          key={c || 'none'}
                          type="button"
                          onClick={() => props.onPatch({ background: c || null })}
                          title={c ? `Background ${c}` : 'No background'}
                          className={`h-6 w-6 rounded border ${
                            (text.background || '') === c ? 'ring-2 ring-brand ring-offset-1' : ''
                          }`}
                          style={{ background: c || 'repeating-linear-gradient(45deg,#fff,#fff 3px,#eee 3px,#eee 6px)' }}
                        />
                      ))}
                    </Row>
                  </div>

                  <button type="button" onClick={() => props.onEditText(text.id)} className="btn-ghost h-9 w-full text-[12px]">
                    <TextCursorInput size={14} /> Edit text
                  </button>
                </>
              )}

              {image && (
                <>
                  <button type="button" onClick={props.onReplaceImage} className="btn-ghost h-9 w-full text-[12px]">
                    <ImageIcon size={14} /> Replace image
                  </button>
                  <div className="rounded-md bg-surface/70 px-2 py-1.5 text-[11px] text-ink-muted">
                    Drag the corner handles to resize — hold <b>Shift</b> to keep the aspect ratio.
                  </div>
                </>
              )}

              {shape && (
                <>
                  <div>
                    <Label>Shape</Label>
                    <div className="grid grid-cols-4 gap-1">
                      {(['rect', 'ellipse', 'line', 'arrow'] as const).map((k) => (
                        <IconBtn key={k} active={shape.kind === k} onClick={() => props.onPatch({ kind: k, purpose: undefined, redact: false })} title={k}>
                          {k === 'rect' ? '▭' : k === 'ellipse' ? '◯' : k === 'line' ? '╱' : '↗'}
                        </IconBtn>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Colour</Label>
                    <ColorRow value={shape.stroke || '#111827'} onChange={(c) => props.onPatch({ stroke: c })} />
                  </div>
                  <div>
                    <Label>Thickness</Label>
                    <NumberBox value={shape.strokeWidth} min={0.5} max={40} step={0.5} suffix="pt" onChange={(v) => props.onPatch({ strokeWidth: v })} />
                  </div>
                  <div>
                    <Label>Fill</Label>
                    <Row>
                      <ColorRow value={shape.fill || '#ffffff'} onChange={(c) => props.onPatch({ fill: c, redact: false })} />
                      <IconBtn active={!shape.fill} onClick={() => props.onPatch({ fill: null })} title="No fill">
                        ✕
                      </IconBtn>
                    </Row>
                  </div>
                  {shape.kind === 'rect' && (
                    <label className="flex items-center gap-2 text-[12px] font-semibold text-ink-soft">
                      <input type="checkbox" checked={!!shape.dash} onChange={(e) => props.onPatch({ dash: e.target.checked })} className="accent-brand" />
                      Dashed outline
                    </label>
                  )}
                  {isRedact && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] leading-relaxed text-red-900">
                      <b>Redaction:</b> the page is flattened on export, so the text underneath cannot be copied or recovered.
                    </div>
                  )}
                </>
              )}

              {item.type === 'ink' && (
                <>
                  <div>
                    <Label>Ink colour</Label>
                    <ColorRow value={item.color} onChange={(c) => props.onPatch({ color: c })} />
                  </div>
                  <div>
                    <Label>Brush size</Label>
                    <NumberBox value={item.width} min={0.5} max={30} step={0.5} suffix="pt" onChange={(v) => props.onPatch({ width: v })} />
                  </div>
                </>
              )}

              {!isRedact && item.type !== 'cover' && (
                <>
                  <div>
                    <Label>Opacity</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={5}
                        max={100}
                        value={Math.round(item.opacity * 100)}
                        onChange={(e) => props.onPatch({ opacity: Number(e.target.value) / 100 })}
                        className="h-1.5 flex-1 accent-brand"
                      />
                      <span className="w-8 text-right text-[11px] font-semibold tabular-nums text-ink-muted">
                        {Math.round(item.opacity * 100)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label>Rotation</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        value={Math.round(item.rotation)}
                        onChange={(e) => props.onPatch({ rotation: Number(e.target.value) })}
                        className="h-1.5 flex-1 accent-brand"
                      />
                      <button type="button" onClick={() => props.onPatch({ rotation: 0 })} className="text-[11px] font-semibold text-ink-muted hover:text-brand">
                        reset
                      </button>
                    </div>
                  </div>
                </>
              )}

              {item.type !== 'cover' && (
                <div>
                  <Label>Arrange</Label>
                  <Row>
                    <IconBtn onClick={() => props.onOrder('front')} title="Bring to front">
                      <BringToFront size={14} />
                    </IconBtn>
                    <IconBtn onClick={() => props.onOrder('up')} title="Bring forward">
                      <ArrowUp size={14} />
                    </IconBtn>
                    <IconBtn onClick={() => props.onOrder('down')} title="Send backward">
                      <ArrowDown size={14} />
                    </IconBtn>
                    <IconBtn onClick={() => props.onOrder('back')} title="Send to back">
                      <SendToBack size={14} />
                    </IconBtn>
                  </Row>
                </div>
              )}
            </>
          )}

          {hasFlatten && (
            <label className="flex items-start gap-2 rounded-md border border-line bg-surface/60 px-2.5 py-2 text-[11px] leading-relaxed text-ink-soft">
              <input type="checkbox" checked={props.flattenRedactions} onChange={(e) => props.onFlattenChange(e.target.checked)} className="mt-0.5 accent-brand" />
              <span>
                <b>Flatten pages with redactions.</b> Removes the hidden text underneath; pages become images.
              </span>
            </label>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white">
        <div className="flex items-center gap-1.5 border-b border-line bg-surface/60 px-3 py-2">
          <Layers size={13} className="text-ink-muted" />
          <span className="text-[12px] font-bold text-ink">Layers on this page</span>
          <span className="ml-auto text-[11px] font-semibold text-ink-muted">{pageItems.length}</span>
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {pageItems.length === 0 && <p className="px-2 py-4 text-center text-[12px] text-ink-muted">Nothing added yet.</p>}
          {[...pageItems].reverse().map((it) => (
            <div
              key={it.id}
              className={`group flex items-center gap-1 rounded px-1.5 py-1 ${
                item?.id === it.id ? 'bg-brand-light' : 'hover:bg-surface'
              }`}
            >
              <button type="button" onClick={() => props.onSelect(it.id)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                {it.type === 'text' && <TypeIcon size={12} className="shrink-0 text-ink-muted" />}
                {it.type === 'image' && <ImageIcon size={12} className="shrink-0 text-ink-muted" />}
                {it.type === 'shape' && <Square size={12} className="shrink-0 text-ink-muted" />}
                {it.type === 'ink' && <PenLine size={12} className="shrink-0 text-ink-muted" />}
                {it.type === 'cover' && <Palette size={12} className="shrink-0 text-ink-muted" />}
                <span className={`truncate text-[12px] ${it.hidden ? 'text-ink-muted line-through' : 'text-ink-soft'}`}>{elementLabel(it)}</span>
              </button>
              <button type="button" onClick={() => props.onToggleHidden(it.id)} title={it.hidden ? 'Show' : 'Hide'} className="rounded p-0.5 text-ink-muted opacity-0 group-hover:opacity-100">
                {it.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
              <button type="button" onClick={() => props.onToggleLock(it.id)} title={it.locked ? 'Unlock' : 'Lock'} className={`rounded p-0.5 ${it.locked ? 'text-brand' : 'text-ink-muted opacity-0 group-hover:opacity-100'}`}>
                <Lock size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
