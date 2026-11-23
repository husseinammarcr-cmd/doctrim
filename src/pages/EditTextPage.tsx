import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Download, Loader2, MousePointerClick, RotateCcw, Server } from 'lucide-react'
import Dropzone from '../components/Dropzone'
import ToolIcon from '../components/ToolIcon'
import { getTool } from '../lib/tools'
import { API_BASE as BASE } from '../lib/apiBase'
import { usePageMeta } from '../lib/usePageMeta'
import { useI18n } from '../i18n'
import NotFound from './NotFound'

interface Word {
  text: string
  rect: [number, number, number, number]
  font: string
  size: number
}

interface PageMeta {
  index: number
  width: number
  height: number
  rotation: number
  has_text: boolean
  word_count: number
}

interface DocInfo {
  doc_id: string
  name: string
  page_count: number
  pages: PageMeta[]
}

interface Change {
  page: number
  before: string
  after: string
  warning?: string
}

const union = (a: number[], b: number[]): [number, number, number, number] => [
  Math.min(a[0], b[0]),
  Math.min(a[1], b[1]),
  Math.max(a[2], b[2]),
  Math.max(a[3], b[3]),
]

export default function EditTextPage() {
  const { isAr, t, toolName, toolDesc, href } = useI18n()
  const tool = getTool('edit-text')

  const [doc, setDoc] = useState<DocInfo | null>(null)
  const [pageIdx, setPageIdx] = useState(0)
  const [words, setWords] = useState<Word[]>([])
  const [rev, setRev] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [changes, setChanges] = useState<Change[]>([])
  const [draft, setDraft] = useState<{ rect: number[]; text: string; words: Word[] } | null>(null)
  const [fitScale, setFitScale] = useState(1)
  const [zoomMul, setZoomMul] = useState(1)
  const [finished, setFinished] = useState(false)
  const [loadingDoc, setLoadingDoc] = useState(false)

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const fileRef = useRef<File | null>(null)
  const dragging = useRef<Word[] | null>(null)

  usePageMeta(
    isAr ? 'تعديل نص PDF الأصلي — بدون طبقة فوقه | DocTrim' : 'Edit the real text inside a PDF — no overlay | DocTrim',
    isAr
      ? 'غيّر الكلمات الأصلية داخل ملف PDF: يُحذف النص القديم فعلياً ويُكتب البديل بخط المستند نفسه. أداة على السيرفر، والملف يُحذف تلقائياً.'
      : 'Change the words that are really in the PDF: the old text is deleted and the replacement is drawn with the document’s own font. Runs on our server; your file is deleted automatically.',
  )

  const page = doc?.pages[pageIdx]
  const scale = Math.max(0.2, Math.min(3, fitScale * zoomMul))

  /* fit the page to its column and keep it fitted --------------------------------- */
  useEffect(() => {
    const el = wrapRef.current
    if (!el || !page) return
    const fit = () => {
      const w = el.clientWidth - 16
      setFitScale(Math.max(0.3, Math.min(1.15, w / page.width)))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [page])

  const loadWords = useCallback(
    async (docId: string, index: number) => {
      const r = await fetch(`${BASE}/api/edit/words?doc=${docId}&page=${index}`)
      if (!r.ok) throw new Error(isAr ? 'انتهت الجلسة — ارفع الملف من جديد.' : 'This session expired — upload the file again.')
      const j = await r.json()
      setWords(j.words || [])
    },
    [isAr],
  )

  useEffect(() => {
    if (!doc) return
    setWords([])
    loadWords(doc.doc_id, pageIdx).catch(() => setWords([]))
  }, [doc, pageIdx, loadWords])

  const upload = useCallback(async (f: File) => {
    setLoadingDoc(true)
    setError(null)
    setChanges([])
    setFinished(false)
    setWords([])
    try {
      const fd = new FormData()
      fd.append('file', f)
      const r = await fetch(`${BASE}/api/edit/analyze`, { method: 'POST', body: fd })
      const j = await r.json()
      if (!r.ok) throw new Error(j.detail || `Upload failed (${r.status})`)
      fileRef.current = f
      setDoc(j)
      setPageIdx(0)
      setRev((v) => v + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoadingDoc(false)
    }
  }, [])

  const wordAt = (clientX: number, clientY: number): Word | null => {
    const el = stageRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    const x = (clientX - r.left) / scale
    const y = (clientY - r.top) / scale
    return words.find((w) => x >= w.rect[0] - 1 && x <= w.rect[2] + 1 && y >= w.rect[1] - 1 && y <= w.rect[3] + 1) || null
  }

  const startSelect = (e: React.PointerEvent) => {
    if (busy || finished) return
    const w = wordAt(e.clientX, e.clientY)
    if (!w) return
    dragging.current = [w]
    setDraft({ rect: w.rect, text: w.text, words: [w] })
  }

  const extendSelect = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const w = wordAt(e.clientX, e.clientY)
    if (!w) return
    const list = dragging.current
    if (!list.some((x) => x.rect.join() === w.rect.join())) list.push(w)
    const rect = list.map((x) => x.rect).reduce((a, b) => union(a, b))
    const ordered = [...list].sort((a, b) => a.rect[0] - b.rect[0])
    setDraft({ rect, text: ordered.map((x) => x.text).join(' '), words: ordered })
  }

  const endSelect = () => {
    dragging.current = null
  }

  /* the edit lands the moment it is confirmed — no Apply button ---------------- */
  const commit = async () => {
    if (!draft || !doc) return
    const rects = draft.words.map((w) => w.rect).reduce((a, b) => union(a, b), draft.rect as number[])
    const before = draft.words.map((w) => w.text).join(' ')
    const text = draft.text
    setDraft(null)
    setBusy(isAr ? 'جاري التعديل…' : 'Applying…')
    setError(null)
    try {
      const r = await fetch(`${BASE}/api/edit/apply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          doc_id: doc.doc_id,
          commit: true,
          edits: [{ page: pageIdx, rect: rects, text }],
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.detail || `Failed (${r.status})`)
      const rep = j.report || {}
      const warning =
        (rep.warnings || [])[0] ||
        (rep.edits || []).map((e: { warning?: string }) => e.warning).find((w?: string) => !!w)
      setChanges((c) => [...c, { page: pageIdx, before, after: text, warning }])
      setRev((v) => v + 1)
      await loadWords(doc.doc_id, pageIdx).catch(() => setWords([]))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(null)
    }
  }

  if (!tool) return <NotFound />

  return (
    <div className="bg-surface/60 min-h-[70vh]">
      <div className="container-x py-10">
        <Link to={href('/pdf-tools')} className="inline-flex items-center gap-1 text-[14px] font-semibold text-ink-muted hover:text-brand">
          <ArrowLeft size={15} className="rtl:rotate-180" /> {t('nav.allTools', 'All tools')}
        </Link>
        <div className="mt-4 flex items-center gap-4">
          <ToolIcon icon={tool.icon} color={tool.color} size={52} radius={13} />
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-ink">{toolName(tool)}</h1>
            <p className="mt-0.5 text-[15px] text-ink-muted">{toolDesc(tool)}</p>
          </div>
        </div>
        <p className="mt-3 inline-flex items-start gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[13px] font-semibold text-amber-700">
          <Server size={14} className="mt-0.5 shrink-0" />
          <span>
            {isAr
              ? 'تعمل على سيرفرنا: يُرفع الملف ليُعالج، ويُحذف فور تنزيل النتيجة (أو خلال ٣٠ دقيقة).'
              : 'Runs on our server: the file is uploaded for processing and deleted as soon as you download the result (or within 30 minutes).'}
          </span>
        </p>

        <div className="card mt-6 p-3 sm:p-6">
          {!doc && !loadingDoc && (
            <Dropzone accept=".pdf" label={isAr ? 'ملف PDF' : 'PDF file'} onFiles={(fs) => fs[0] && upload(fs[0])} />
          )}

          {loadingDoc && (
            <div className="flex items-center gap-2 py-8 text-[14px] font-semibold text-ink-muted">
              <Loader2 size={16} className="animate-spin" /> {isAr ? 'جاري قراءة النص…' : 'Reading the text layer…'}
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          {doc && page && (
            <div className="mt-1 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="min-w-0 max-w-[55%] truncate font-semibold text-ink">{doc.name}</span>
                  <span className="text-ink-muted">· {doc.page_count}</span>
                  <div className="ms-auto flex items-center gap-1">
                    <button
                      className="btn-ghost px-2 py-1"
                      aria-label="zoom out"
                      disabled={zoomMul <= 1}
                      onClick={() => setZoomMul((z) => Math.max(1, Math.round((z - 0.5) * 10) / 10))}
                    >
                      −
                    </button>
                    <button
                      className="btn-ghost px-2 py-1"
                      aria-label="zoom in"
                      disabled={zoomMul >= 3}
                      onClick={() => setZoomMul((z) => Math.min(3, Math.round((z + 0.5) * 10) / 10))}
                    >
                      +
                    </button>
                    <button className="btn-ghost px-2 py-1" disabled={pageIdx === 0} onClick={() => setPageIdx((i) => i - 1)}>←</button>
                    <span className="whitespace-nowrap text-ink-muted">{pageIdx + 1} / {doc.page_count}</span>
                    <button className="btn-ghost px-2 py-1" disabled={pageIdx + 1 >= doc.page_count} onClick={() => setPageIdx((i) => i + 1)}>→</button>
                  </div>
                </div>

                {page.word_count === 0 && (
                  <div className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] font-semibold text-amber-800">
                    {isAr
                      ? 'هذه الصفحة ما بيها طبقة نص (ممسوحة ضوئياً). شغّل OCR عليها أولاً ثم ارجع لهنا. '
                      : 'This page has no text layer (it is a scan). Run OCR on it first, then come back. '}
                    <Link to={href('/ocr-pdf')} className="underline">
                      {isAr ? 'أداة OCR' : 'OCR tool'}
                    </Link>
                  </div>
                )}

                <div className="mb-2 flex items-center gap-2 lg:hidden">
                  <a
                    className={`btn-primary flex-1 ${finished ? 'pointer-events-none opacity-60' : ''}`}
                    href={`${BASE}/api/edit/download?doc=${doc.doc_id}`}
                    onClick={() => setFinished(true)}
                  >
                    <Download size={15} /> {isAr ? 'تنزيل PDF' : 'Download PDF'}
                  </a>
                  <span className="rounded-lg bg-white px-2 py-1 text-[12px] font-semibold text-ink-muted">
                    {changes.length} {isAr ? 'تعديل' : 'edits'}
                  </span>
                </div>

                <div ref={wrapRef} className="max-w-full overflow-auto rounded-xl border border-line bg-white p-2">
                  <div className="relative mx-auto" style={{ width: page.width * scale, height: page.height * scale }}>
                    <img
                      src={`${BASE}/api/edit/page?doc=${doc.doc_id}&index=${pageIdx}&dpi=${Math.round(110 * Math.max(scale, 0.6))}&v=${rev}`}
                      alt=""
                      draggable={false}
                      className="absolute inset-0 h-full w-full select-none"
                    />
                    <div
                      ref={stageRef}
                      className="absolute inset-0 cursor-text"
                      onPointerDown={startSelect}
                      onPointerMove={extendSelect}
                      onPointerUp={endSelect}
                      onPointerLeave={endSelect}
                    >
                      {words.map((w, i) => {
                        const [x0, y0, x1, y1] = w.rect
                        return (
                          <div
                            key={i}
                            data-word={w.text}
                            title={w.text}
                            className="pointer-events-none absolute rounded-[2px] hover:bg-brand/20"
                            style={{
                              left: (x0 - 1) * scale,
                              top: (y0 - 1) * scale,
                              width: (x1 - x0 + 2) * scale,
                              height: (y1 - y0 + 2) * scale,
                            }}
                          />
                        )
                      })}
                    </div>

                    {draft && (
                      <input
                        autoFocus
                        value={draft.text}
                        dir="auto"
                        onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commit()
                          if (e.key === 'Escape') setDraft(null)
                        }}
                        onBlur={() => setTimeout(() => setDraft((d) => (d === draft ? null : d)), 150)}
                        className="absolute z-10 rounded-md border-2 border-brand bg-white px-1.5 py-0.5 text-[13px] shadow-lg outline-none"
                        style={{
                          left: Math.max(0, Math.min(draft.rect[0] * scale, page.width * scale - 120)),
                          top: Math.max(0, (draft.rect[1] - 8) * scale),
                          minWidth: Math.max(96, (draft.rect[2] - draft.rect[0]) * scale + 40),
                        }}
                      />
                    )}

                    {busy && (
                      <div className="absolute inset-x-0 top-2 mx-auto flex w-fit items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold text-ink shadow">
                        <Loader2 size={13} className="animate-spin" /> {busy}
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-[12px] text-ink-muted">
                  <MousePointerClick size={13} className="mt-0.5 shrink-0" />
                  {isAr
                    ? 'اضغط كلمة واكتب البديل: يتغيّر الملف فوراً. اسحب عبر عدة كلمات لتعديل جملة كاملة.'
                    : 'Tap a word and type: the change lands immediately. Drag across words to edit a whole phrase.'}
                </p>
              </div>

              <aside className="min-w-0 space-y-3">
                <div className="rounded-xl border border-line bg-white p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-ink">{isAr ? 'التعديلات' : 'Changes'}</span>
                    <span className="text-[12px] text-ink-muted">{changes.length}</span>
                  </div>
                  <ul className="mt-2 max-h-56 space-y-1.5 overflow-auto">
                    {changes.length === 0 && <li className="text-[12px] text-ink-muted">{isAr ? 'لا يوجد بعد.' : 'Nothing yet.'}</li>}
                    {changes.map((c, i) => (
                      <li key={i} className="rounded-lg bg-surface px-2 py-1.5 text-[12px]">
                        <div className="break-words text-ink-muted line-through">{c.before || '—'}</div>
                        <div className="break-words font-semibold text-emerald-700">{c.after || (isAr ? '(حذف)' : '(deleted)')}</div>
                        {c.warning && <div className="mt-0.5 break-words text-[11px] text-amber-700">{c.warning}</div>}
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  className={`btn-primary w-full ${finished ? 'pointer-events-none opacity-60' : ''}`}
                  href={`${BASE}/api/edit/download?doc=${doc.doc_id}`}
                  onClick={() => setFinished(true)}
                >
                  <Download size={15} /> {isAr ? 'تنزيل PDF' : 'Download PDF'}
                </a>

                <button className="btn-ghost w-full" onClick={() => fileRef.current && upload(fileRef.current)}>
                  <RotateCcw size={14} /> {isAr ? 'ابدأ من الأصل' : 'Start from the original'}
                </button>

                <p className="text-[11px] leading-relaxed text-ink-muted">
                  {isAr
                    ? 'النص القديم يُحذف من الملف فعلياً، والبديل يُكتب بخط المستند نفسه، ويبقى قابلاً للتحديد والبحث.'
                    : 'The old text is deleted from the file itself and the replacement uses the document’s own font, so it stays selectable and searchable.'}
                </p>

                {finished && (
                  <p className="rounded-lg bg-emerald-50 px-2 py-1.5 text-[11px] font-semibold text-emerald-800">
                    {isAr
                      ? 'نُزّل الملف وحُذف من السيرفر. للتحرير من جديد اضغط «ابدأ من الأصل».'
                      : 'Downloaded and removed from the server. Press “Start from the original” to edit again.'}
                  </p>
                )}
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
