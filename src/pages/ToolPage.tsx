import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Loader2, RotateCw, ShieldCheck, FileText, RefreshCw, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import Dropzone from '../components/Dropzone'
import ToolIcon from '../components/ToolIcon'
import PageGrid, { type PageItem } from '../components/tool/PageGrid'
import SignaturePad from '../components/tool/SignaturePad'
import CropEditor, { type CropMarginsMm } from '../components/tool/CropEditor'
import { getTool, type Tool } from '../lib/tools'
import { serverConfigured } from '../lib/api'
import ServerToolRunner from '../components/tool/ServerToolRunner'
import EditPdfPage from './EditPdfPage'
import NotFound from './NotFound'
import { openPdfJs, thumbnail } from '../lib/pdf/pdfjs'
import * as E from '../lib/pdf/engine'
import { saveBlob } from '../lib/download'

type Result =
  | { kind: 'pdf'; bytes: Uint8Array; filename: string; before?: number; after?: number }
  | { kind: 'images'; images: E.RenderedImage[]; filename: string }

function parseRanges(input: string, max: number): number[][] {
  const out: number[][] = []
  for (const part of input.split(',')) {
    const p = part.trim()
    if (!p) continue
    const m = p.match(/^(\d+)\s*-\s*(\d+)$/)
    if (m) {
      const a = Math.max(1, parseInt(m[1]))
      const b = Math.min(max, parseInt(m[2]))
      const idx: number[] = []
      for (let i = a; i <= b; i++) idx.push(i - 1)
      if (idx.length) out.push(idx)
    } else if (/^\d+$/.test(p)) {
      const n = parseInt(p)
      if (n >= 1 && n <= max) out.push([n - 1])
    }
  }
  return out
}

async function buildPreviews(bytes: Uint8Array): Promise<PageItem[]> {
  const doc = await openPdfJs(bytes)
  const rotations = await E.pageRotations(bytes)
  const items: PageItem[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const thumb = await thumbnail(doc, i, 170)
    items.push({ srcIndex: i - 1, rotation: rotations[i - 1] || 0, included: true, thumb })
  }
  await doc.destroy()
  return items
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-[13px] font-semibold text-ink-soft">{children}</label>
}
const selectCls = 'w-full rounded border border-line bg-white px-3 py-2 text-[14px] text-ink focus:border-brand focus:outline-none'
const inputCls = selectCls

export default function ToolPage() {
  const { slug } = useParams()
  const tool = getTool(slug || '')
  if (!tool) return <NotFound />
  if (tool.slug === 'edit-pdf') return <EditPdfPage />
  if (tool.server) {
    if (!serverConfigured()) return <ComingSoon tool={tool} />
    return <ServerToolRunner key={tool.slug} tool={tool} />
  }
  if (tool.status === 'soon') return <ComingSoon tool={tool} />
  return <Runner key={tool.slug} tool={tool} />
}

function ComingSoon({ tool }: { tool: Tool }) {
  return (
    <div className="container-x py-20">
      <div className="mx-auto max-w-[560px] text-center">
        <div className="mx-auto mb-6 w-fit"><ToolIcon icon={tool.icon} color={tool.color} size={64} radius={16} /></div>
        <h1 className="text-3xl font-bold text-ink">{tool.name}</h1>
        <p className="mt-3 text-lg text-ink-soft">{tool.desc}</p>
        <div className="card mt-8 p-6">
          <p className="text-[15px] text-ink-soft">
            This tool is on the way. We're adding features step by step — check back soon.
          </p>
        </div>
        <Link to="/pdf-tools" className="btn-outline btn-md mt-6">
          <ArrowLeft size={16} /> Back to all tools
        </Link>
      </div>
    </div>
  )
}

function Runner({ tool }: { tool: Tool }) {
  const [files, setFiles] = useState<File[]>([])
  const [bytes, setBytes] = useState<Uint8Array[]>([])
  const [pages, setPages] = useState<PageItem[]>([])
  const [loadingPreviews, setLoadingPreviews] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [sig, setSig] = useState<Uint8Array | null>(null)

  const [opts, setOpts] = useState<Record<string, any>>({
    level: 'recommended',
    text: 'CONFIDENTIAL',
    opacity: 0.25,
    size: 48,
    diagonal: true,
    position: 'bottom-center',
    numStart: 1,
    pageSize: 'fit',
    margin: 0,
    scale: 2,
    splitMode: 'all',
    ranges: '',
    signPage: 1,
    signPos: 'bottom-right',
    signWidth: 160,
    cropTop: 10,
    cropRight: 10,
    cropBottom: 10,
    cropLeft: 10,
  })
  const setOpt = (k: string, v: any) => setOpts((o) => ({ ...o, [k]: v }))

  const isPageTool = ['organize-pdf', 'delete-pdf-pages', 'extract-pdf-pages', 'rotate-pdf'].includes(tool.slug)
  const isImageOut = ['pdf-to-jpg', 'pdf-to-png'].includes(tool.slug)
  const isImageIn = ['jpg-to-pdf', 'png-to-pdf'].includes(tool.slug)
  const isMerge = tool.slug === 'merge-pdf'
  const isReader = tool.slug === 'pdf-reader'

  const onFiles = useCallback(
    async (fs: File[]) => {
      setError('')
      setResult(null)
      setFiles(fs)
      const b = await Promise.all(fs.map((f) => E.fileToBytes(f)))
      setBytes(b)
      if (isPageTool || isReader) {
        setLoadingPreviews(true)
        try {
          const previews = await buildPreviews(b[0])
          if (tool.slug === 'delete-pdf-pages' || tool.slug === 'extract-pdf-pages') {
            previews.forEach((p) => (p.included = false))
          }
          setPages(previews)
        } catch (e) {
          setError('Could not read this PDF. It may be corrupted or password-protected.')
        } finally {
          setLoadingPreviews(false)
        }
      }
    },
    [isPageTool, isReader, tool.slug],
  )

  const reset = () => {
    setFiles([])
    setBytes([])
    setPages([])
    setResult(null)
    setError('')
    setSig(null)
  }

  const moveFile = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= files.length) return
    const nf = [...files]; const nb = [...bytes]
    ;[nf[i], nf[j]] = [nf[j], nf[i]]
    ;[nb[i], nb[j]] = [nb[j], nb[i]]
    setFiles(nf); setBytes(nb)
  }
  const removeFile = (i: number) => {
    setFiles(files.filter((_, k) => k !== i))
    setBytes(bytes.filter((_, k) => k !== i))
  }

  const togglePage = (i: number) => setPages((ps) => ps.map((p, k) => (k === i ? { ...p, included: !p.included } : p)))
  const rotatePage = (i: number, d: number) => setPages((ps) => ps.map((p, k) => (k === i ? { ...p, rotation: p.rotation + d } : p)))
  const movePage = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= pages.length) return
    setPages((ps) => { const n = [...ps]; [n[i], n[j]] = [n[j], n[i]]; return n })
  }
  const removePage = (i: number) => setPages((ps) => ps.filter((_, k) => k !== i))
  const rotateAll = (d: number) => setPages((ps) => ps.map((p) => ({ ...p, rotation: p.rotation + d })))

  const cropMargins: CropMarginsMm = {
    top: Number(opts.cropTop) || 0,
    right: Number(opts.cropRight) || 0,
    bottom: Number(opts.cropBottom) || 0,
    left: Number(opts.cropLeft) || 0,
  }
  const setCropMargins = (m: CropMarginsMm) =>
    setOpts((o) => ({ ...o, cropTop: m.top, cropRight: m.right, cropBottom: m.bottom, cropLeft: m.left }))
  const cropPreset = (v: number) => setCropMargins({ top: v, right: v, bottom: v, left: v })

  const process = async () => {
    setProcessing(true)
    setError('')
    setResult(null)
    try {
      const base = tool.slug.replace(/-pdf$/, '')
      if (isMerge) {
        if (bytes.length < 2) throw new Error('Add at least two PDFs to merge.')
        const out = await E.mergePdfs(bytes)
        setResult({ kind: 'pdf', bytes: out, filename: 'merged.pdf' })
      } else if (tool.slug === 'compress-pdf') {
        const out = await E.compressPdf(bytes[0], opts.level)
        setResult({ kind: 'pdf', bytes: out, filename: 'compressed.pdf', before: bytes[0].length, after: out.length })
      } else if (isPageTool) {
        let ops: { srcIndex: number; rotation: number }[]
        if (tool.slug === 'delete-pdf-pages') ops = pages.filter((p) => !p.included).map((p) => ({ srcIndex: p.srcIndex, rotation: p.rotation }))
        else if (tool.slug === 'extract-pdf-pages') ops = pages.filter((p) => p.included).map((p) => ({ srcIndex: p.srcIndex, rotation: p.rotation }))
        else ops = pages.filter((p) => p.included).map((p) => ({ srcIndex: p.srcIndex, rotation: p.rotation }))
        if (!ops.length) throw new Error('No pages left to export.')
        const out = await E.applyPageOps(bytes[0], ops)
        setResult({ kind: 'pdf', bytes: out, filename: `${base}.pdf` })
      } else if (tool.slug === 'split-pdf') {
        const count = pages.length || (await E.pageRotations(bytes[0])).length
        let groups: number[][]
        if (opts.splitMode === 'all') groups = Array.from({ length: count }, (_, i) => [i])
        else {
          groups = parseRanges(opts.ranges, count)
          if (!groups.length) throw new Error('Enter valid page ranges, e.g. 1-3,5,7-9.')
        }
        const parts = await Promise.all(groups.map((g) => E.extractPages(bytes[0], g)))
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()
        parts.forEach((p, i) => zip.file(`split-${i + 1}.pdf`, p.slice().buffer))
        const blob = await zip.generateAsync({ type: 'blob' })
        const buf = new Uint8Array(await blob.arrayBuffer())
        setResult({ kind: 'pdf', bytes: buf, filename: 'split.zip' })
      } else if (isImageIn) {
        const inputs = await Promise.all(files.map(async (f) => ({ bytes: await E.fileToBytes(f), type: f.type })))
        const out = await E.imagesToPdf(inputs, { pageSize: opts.pageSize, margin: Number(opts.margin) })
        setResult({ kind: 'pdf', bytes: out, filename: 'converted.pdf' })
      } else if (isImageOut) {
        const fmt = tool.slug === 'pdf-to-jpg' ? 'jpeg' : 'png'
        const images = await E.pdfToImages(bytes[0], fmt, Number(opts.scale), 'page')
        setResult({ kind: 'images', images, filename: `${tool.slug}.zip` })
      } else if (tool.slug === 'crop-pdf') {
        const pt = 72 / 25.4
        const out = await E.cropPdf(bytes[0], {
          top: (Number(opts.cropTop) || 0) * pt,
          right: (Number(opts.cropRight) || 0) * pt,
          bottom: (Number(opts.cropBottom) || 0) * pt,
          left: (Number(opts.cropLeft) || 0) * pt,
        })
        setResult({ kind: 'pdf', bytes: out, filename: 'cropped.pdf' })
      } else if (tool.slug === 'watermark-pdf') {
        const hex = opts.color || '#888888'
        const c: [number, number, number] = [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255]
        const out = await E.watermarkPdf(bytes[0], opts.text, { opacity: Number(opts.opacity), size: Number(opts.size), diagonal: opts.diagonal, color: c })
        setResult({ kind: 'pdf', bytes: out, filename: 'watermarked.pdf' })
      } else if (tool.slug === 'number-pages') {
        const out = await E.numberPages(bytes[0], { position: opts.position, size: Number(opts.size), start: Number(opts.numStart) })
        setResult({ kind: 'pdf', bytes: out, filename: 'numbered.pdf' })
      } else if (tool.slug === 'sign-pdf') {
        if (!sig) throw new Error('Draw your signature first.')
        const { PDFDocument } = await import('pdf-lib')
        const doc = await PDFDocument.load(bytes[0], { ignoreEncryption: true })
        const pi = Math.min(Math.max(1, Number(opts.signPage)), doc.getPageCount()) - 1
        const { width } = doc.getPage(pi).getSize()
        const w = Number(opts.signWidth)
        let x = 40
        if (opts.signPos === 'bottom-center') x = (width - w) / 2
        if (opts.signPos === 'bottom-right') x = width - w - 40
        const out = await E.signPdf(bytes[0], sig, { pageIndex: pi, x, y: 40, width: w })
        setResult({ kind: 'pdf', bytes: out, filename: 'signed.pdf' })
      } else {
        throw new Error('This tool is not available yet.')
      }
    } catch (e: any) {
      setError(e?.message || 'Something went wrong while processing your file.')
    } finally {
      setProcessing(false)
    }
  }

  const downloadZip = async () => {
    if (result?.kind !== 'images') return
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    result.images.forEach((img) => zip.file(img.name, img.blob))
    const blob = await zip.generateAsync({ type: 'blob' })
    void saveBlob(blob, result.filename, 'application/zip')
  }

  const hasFiles = files.length > 0
  const canProcess = hasFiles && !processing && !loadingPreviews

  return (
    <div className="bg-surface/60 min-h-[70vh]">
      <div className="container-x py-10">
        <Link to="/pdf-tools" className="inline-flex items-center gap-1 text-[14px] font-semibold text-ink-muted hover:text-brand">
          <ArrowLeft size={15} /> All tools
        </Link>
        <div className="mt-4 flex items-center gap-4">
          <ToolIcon icon={tool.icon} color={tool.color} size={52} radius={13} />
          <div>
            <h1 className="text-3xl font-bold text-ink">{tool.name}</h1>
            <p className="mt-0.5 text-[15px] text-ink-muted">{tool.desc}</p>
          </div>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-[13px] font-semibold text-brand">
          <ShieldCheck size={14} /> Files are processed in your browser — they never leave your device.
        </p>

        <div className="card mt-6 p-6 sm:p-8">
          {!hasFiles && <Dropzone accept={tool.accept} multi={tool.multi} onFiles={onFiles} label={tool.inputLabel} />}

          {hasFiles && !result && (
            <div>
              {/* merge file list */}
              {isMerge && (
                <div className="space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 rounded border border-line bg-white px-4 py-3">
                      <FileText size={18} className="text-accent-red" />
                      <span className="flex-1 truncate text-[14px] font-semibold text-ink">{f.name}</span>
                      <span className="text-[12px] text-ink-muted">{E.formatSize(f.size)}</span>
                      <button onClick={() => moveFile(i, -1)} disabled={i === 0} className="rounded p-1 hover:bg-surface disabled:opacity-30"><ChevronUp size={16} /></button>
                      <button onClick={() => moveFile(i, 1)} disabled={i === files.length - 1} className="rounded p-1 hover:bg-surface disabled:opacity-30"><ChevronDown size={16} /></button>
                      <button onClick={() => removeFile(i)} className="rounded p-1 text-accent-red hover:bg-surface"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  <Dropzone accept={tool.accept} multi onFiles={(fs) => onFiles([...files, ...fs])} label="more PDFs" compact />
                </div>
              )}

              {/* image-in list */}
              {isImageIn && (
                <div>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                    {files.map((f, i) => (
                      <div key={i} className="card relative overflow-hidden p-1">
                        <img src={URL.createObjectURL(f)} alt={f.name} className="h-24 w-full object-cover" />
                        <button onClick={() => removeFile(i)} className="absolute right-1 top-1 rounded bg-white/90 p-1 text-accent-red"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Page size</Label>
                      <select className={selectCls} value={opts.pageSize} onChange={(e) => setOpt('pageSize', e.target.value)}>
                        <option value="fit">Fit to image</option>
                        <option value="a4">A4</option>
                      </select>
                    </div>
                    <div>
                      <Label>Margin (pt)</Label>
                      <input type="number" className={inputCls} value={opts.margin} min={0} onChange={(e) => setOpt('margin', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {/* page tools / reader */}
              {(isPageTool || isReader) && (
                <div>
                  {loadingPreviews ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-ink-muted"><Loader2 className="animate-spin" size={20} /> Loading pages…</div>
                  ) : (
                    <>
                      {tool.slug === 'rotate-pdf' && (
                        <div className="mb-4 flex gap-2">
                          <button onClick={() => rotateAll(90)} className="btn-ghost btn-md"><RotateCw size={16} /> Rotate all 90°</button>
                          <button onClick={() => rotateAll(180)} className="btn-ghost btn-md">180°</button>
                          <button onClick={() => rotateAll(270)} className="btn-ghost btn-md">270°</button>
                        </div>
                      )}
                      {tool.slug === 'delete-pdf-pages' && <p className="mb-3 text-[14px] text-ink-muted">Select the pages you want to delete.</p>}
                      {tool.slug === 'extract-pdf-pages' && <p className="mb-3 text-[14px] text-ink-muted">Select the pages you want to keep.</p>}
                      <PageGrid
                        pages={pages}
                        mode={isReader ? 'rotate' : tool.slug === 'organize-pdf' ? 'organize' : tool.slug === 'rotate-pdf' ? 'rotate' : 'select'}
                        onToggle={togglePage}
                        onRotate={rotatePage}
                        onMove={movePage}
                        onRemove={removePage}
                      />
                    </>
                  )}
                </div>
              )}

              {/* single-file option panels */}
              {tool.slug === 'compress-pdf' && (
                <div className="max-w-[420px]">
                  <Label>Compression level</Label>
                  <select className={selectCls} value={opts.level} onChange={(e) => setOpt('level', e.target.value)}>
                    <option value="basic">Basic — keep text &amp; vectors (smaller reduction)</option>
                    <option value="recommended">Recommended — balanced quality &amp; size</option>
                    <option value="extreme">Extreme — smallest file (lower quality)</option>
                  </select>
                  <p className="mt-2 text-[13px] text-ink-muted">Recommended &amp; Extreme also try re-rendering pages as images and keep whichever result is smallest — great for scanned or image-heavy PDFs.</p>
                </div>
              )}

              {tool.slug === 'split-pdf' && (
                <div className="max-w-[420px]">
                  <Label>Split mode</Label>
                  <select className={selectCls} value={opts.splitMode} onChange={(e) => setOpt('splitMode', e.target.value)}>
                    <option value="all">Every page into a separate PDF</option>
                    <option value="ranges">Custom ranges</option>
                  </select>
                  {opts.splitMode === 'ranges' && (
                    <div className="mt-3">
                      <Label>Page ranges (e.g. 1-3,5,7-9)</Label>
                      <input className={inputCls} value={opts.ranges} onChange={(e) => setOpt('ranges', e.target.value)} placeholder="1-3,5,7-9" />
                    </div>
                  )}
                </div>
              )}

              {isImageOut && (
                <div className="max-w-[420px]">
                  <Label>Image quality (resolution)</Label>
                  <select className={selectCls} value={opts.scale} onChange={(e) => setOpt('scale', e.target.value)}>
                    <option value={1}>Standard (72 DPI)</option>
                    <option value={2}>High (144 DPI)</option>
                    <option value={3}>Very high (216 DPI)</option>
                  </select>
                </div>
              )}

              {tool.slug === 'crop-pdf' && (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                  <CropEditor bytes={bytes[0]} margins={cropMargins} onChange={setCropMargins} />
                  <div className="grid content-start gap-4">
                    <div>
                      <Label>Margins (mm)</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                          <label key={side} className="block">
                            <span className="mb-1 block text-[12px] font-semibold capitalize text-ink-muted">{side}</span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              className={inputCls}
                              value={cropMargins[side]}
                              onChange={(e) => setCropMargins({ ...cropMargins, [side]: e.target.value as any })}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Quick presets</Label>
                      <div className="flex flex-wrap gap-2">
                        {[0, 5, 10, 20].map((v) => (
                          <button
                            key={v}
                            onClick={() => cropPreset(v)}
                            className={`btn-ghost btn-md ${[cropMargins.top, cropMargins.right, cropMargins.bottom, cropMargins.left].every((n) => n === v) ? 'ring-2 ring-brand' : ''}`}
                          >
                            {v === 0 ? 'None' : `${v} mm`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-[13px] leading-relaxed text-ink-muted">
                      Cropping hides the outer edges without resizing or re-encoding the page content — text stays sharp and selectable.
                    </p>
                  </div>
                </div>
              )}

              {tool.slug === 'watermark-pdf' && (
                <div className="grid max-w-[560px] gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Watermark text</Label>
                    <input className={inputCls} value={opts.text} onChange={(e) => setOpt('text', e.target.value)} />
                  </div>
                  <div>
                    <Label>Opacity ({Number(opts.opacity).toFixed(2)})</Label>
                    <input type="range" min={0.05} max={1} step={0.05} value={opts.opacity} onChange={(e) => setOpt('opacity', e.target.value)} className="w-full" />
                  </div>
                  <div>
                    <Label>Font size</Label>
                    <input type="number" className={inputCls} value={opts.size} min={8} max={200} onChange={(e) => setOpt('size', e.target.value)} />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <input type="color" className="h-10 w-full rounded border border-line" value={opts.color || '#888888'} onChange={(e) => setOpt('color', e.target.value)} />
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <input id="diag" type="checkbox" checked={opts.diagonal} onChange={(e) => setOpt('diagonal', e.target.checked)} />
                    <label htmlFor="diag" className="text-[14px] text-ink-soft">Diagonal</label>
                  </div>
                </div>
              )}

              {tool.slug === 'number-pages' && (
                <div className="grid max-w-[560px] gap-4 sm:grid-cols-3">
                  <div>
                    <Label>Position</Label>
                    <select className={selectCls} value={opts.position} onChange={(e) => setOpt('position', e.target.value)}>
                      <option value="bottom-center">Bottom center</option>
                      <option value="bottom-right">Bottom right</option>
                      <option value="top-center">Top center</option>
                    </select>
                  </div>
                  <div>
                    <Label>Font size</Label>
                    <input type="number" className={inputCls} value={opts.size} min={6} max={48} onChange={(e) => setOpt('size', e.target.value)} />
                  </div>
                  <div>
                    <Label>Start at</Label>
                    <input type="number" className={inputCls} value={opts.numStart} min={1} onChange={(e) => setOpt('numStart', e.target.value)} />
                  </div>
                </div>
              )}

              {tool.slug === 'sign-pdf' && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <Label>Your signature</Label>
                    <SignaturePad onChange={setSig} />
                  </div>
                  <div className="grid content-start gap-4">
                    <div>
                      <Label>Page number</Label>
                      <input type="number" className={inputCls} value={opts.signPage} min={1} max={pages.length || 1} onChange={(e) => setOpt('signPage', e.target.value)} />
                    </div>
                    <div>
                      <Label>Position</Label>
                      <select className={selectCls} value={opts.signPos} onChange={(e) => setOpt('signPos', e.target.value)}>
                        <option value="bottom-left">Bottom left</option>
                        <option value="bottom-center">Bottom center</option>
                        <option value="bottom-right">Bottom right</option>
                      </select>
                    </div>
                    <div>
                      <Label>Signature width ({opts.signWidth} pt)</Label>
                      <input type="range" min={60} max={320} value={opts.signWidth} onChange={(e) => setOpt('signWidth', e.target.value)} className="w-full" />
                    </div>
                  </div>
                </div>
              )}

              {error && <p className="mt-4 rounded bg-red-50 px-4 py-3 text-[14px] text-accent-red">{error}</p>}

              {!isReader && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button onClick={process} disabled={!canProcess} className="btn-primary btn-lg disabled:opacity-50">
                    {processing ? (<><Loader2 size={18} className="animate-spin" /> Processing…</>) : (<><Download size={18} /> {processLabel(tool.slug)}</>)}
                  </button>
                  <button onClick={reset} className="btn-ghost btn-lg"><RefreshCw size={16} /> Start over</button>
                </div>
              )}
              {isReader && (
                <div className="mt-6">
                  <button onClick={reset} className="btn-ghost btn-md"><RefreshCw size={16} /> Open another PDF</button>
                </div>
              )}
            </div>
          )}

          {/* result */}
          {result && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-light text-brand">
                <ShieldCheck size={30} />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-ink">Done!</h2>
              {result.kind === 'pdf' && result.before != null && result.after != null && (
                <p className="mt-2 text-[15px] text-ink-soft">
                  {E.formatSize(result.before)} → <span className="font-bold text-brand">{E.formatSize(result.after)}</span>
                  {' '}(saved {Math.max(0, Math.round((1 - result.after / result.before) * 100))}%)
                </p>
              )}
              {result.kind === 'images' && (
                <p className="mt-2 text-[15px] text-ink-soft">{result.images.length} image{result.images.length > 1 ? 's' : ''} ready.</p>
              )}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {result.kind === 'pdf' ? (
                  <button onClick={() => E.downloadBytes(result.bytes, result.filename, result.filename.endsWith('.zip') ? 'application/zip' : 'application/pdf')} className="btn-primary btn-lg">
                    <Download size={18} /> Download {result.filename.endsWith('.zip') ? 'ZIP' : 'PDF'}
                  </button>
                ) : (
                  <button onClick={downloadZip} className="btn-primary btn-lg"><Download size={18} /> Download ZIP</button>
                )}
                <button onClick={reset} className="btn-ghost btn-lg"><RefreshCw size={16} /> Start over</button>
              </div>
              {result.kind === 'images' && (
                <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {result.images.slice(0, 12).map((img) => (
                    <img key={img.name} src={img.dataUrl} alt={img.name} className="card h-28 w-full object-contain p-1" />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function processLabel(slug: string): string {
  const map: Record<string, string> = {
    'merge-pdf': 'Merge PDF',
    'compress-pdf': 'Compress PDF',
    'crop-pdf': 'Apply crop',
    'split-pdf': 'Split PDF',
    'rotate-pdf': 'Apply rotation',
    'organize-pdf': 'Apply changes',
    'delete-pdf-pages': 'Delete pages',
    'extract-pdf-pages': 'Extract pages',
    'jpg-to-pdf': 'Convert to PDF',
    'png-to-pdf': 'Convert to PDF',
    'pdf-to-jpg': 'Convert to JPG',
    'pdf-to-png': 'Convert to PNG',
    'watermark-pdf': 'Add watermark',
    'number-pages': 'Add page numbers',
    'sign-pdf': 'Sign PDF',
  }
  return map[slug] || 'Process'
}
