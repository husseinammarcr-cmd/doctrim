import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Check, Loader2, MousePointerClick, RefreshCw, Server, Undo2, X } from 'lucide-react'
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

interface Staged {
  page: number
  rect: [number, number, number, number]
  text: string
  original: string
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
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [staged, setStaged] = useState<Staged[]>([])
  const [draft, setDraft] = useState<{ rect: number[]; text: string; words: Word[] } | null>(null)
  const [result, setResult] = useState<{ url: string; name: string; warnings: string[] } | null>(null)
  const [zoom, setZoom] = useState(1)

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const dragging = useRef<Word[] | null>(null)

  usePageMeta(
    isAr ? 'تعديل نص PDF الأصلي — بدون طبقة فوقه | DocTrim' : 'Edit the real text inside a PDF — no overlay | DocTrim',
    isAr
      ? 'غيّر الكلمات الأصلية داخل ملف PDF: يُحذف النص القديم فعلياً ويُكتب البديل بخط المستند نفسه. أداة على السيرفر، والملف يُحذف تلقائياً.'
      : 'Change the words that are really in the PDF: the old text is deleted and the replacement is drawn with the document’s own font. Runs on our server; your file is deleted automatically.',
  )

  const page = doc?.pages[pageIdx]

  useEffect(() => {
    if (!page || !wrapRef.current) return
    const fit = () => {
      const w = wrapRef.current?.clientWidth || 800
      setZoom(Math.max(0.45, Math.min(1.6, (w - 8) / page.width)))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [page])

  useEffect(() => {
    if (!doc) return
    let cancelled = false
    setWords([])
    fetch(`${BASE}/api/edit/words?doc=${doc.doc_id}&page=${pageIdx}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`words ${r.status}`))))
      .then((j) => !cancelled && setWords(j.words || []))
      .catch(() => !cancelled && setWords([]))
    return () => {
      cancelled = true
    }
  }, [doc, pageIdx])

  const upload = useCallback(async (f: File) => {
    setError(null)
    setResult(null)
    setStaged([])
    setBusy('Uploading and reading the text layer…')
    try {
      const fd = new FormData()
      fd.append('file', f)
      const r = await fetch(`${BASE}/api/edit/analyze`, { method: 'POST', body: fd })
      const j = await r.json()
      if (!r.ok) throw new Error(j.detail || `Upload failed (${r.status})`)
      setDoc(j)
      setPageIdx(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(null)
    }
  }, [])

  const pageEdits = useMemo(() => staged.filter((s) => s.page === pageIdx), [staged, pageIdx])

  const wordAt = (clientX: number, clientY: number): Word | null => {
    const el = stageRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    const x = (clientX - r.left) / scale
    const y = (clientY - r.top) / scale
    return (
      words.find((w) => x >= w.rect[0] - 1 && x <= w.rect[2] + 1 && y >= w.rect[1] - 1 && y <= w.rect[3] + 1) || null
    )
  }

  const startSelect = (e: React.PointerEvent) => {
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

  const commit = () => {
    if (!draft) return
    const text = draft.text
    const rects = draft.words.map((w) => w.rect).reduce((a, b) => union(a, b), draft.rect as number[])
    setStaged((s) => [
      ...s.filter((x) => !(x.page === pageIdx && x.rect.join() === (rects as number[]).join())),
      { page: pageIdx, rect: rects as [number, number, number, number], text, original: draft.words.map((w) => w.text).join(' ') },
    ])
    setDraft(null)
  }

  const apply = async () => {
    if (!doc) return
    if (!staged.length) {
      setError(isAr ? 'غيّر كلمة أولاً.' : 'Change at least one word first.')
      return
    }
    setBusy(isAr ? 'جاري إعادة كتابة النص…' : 'Rewriting the text…')
    setError(null)
    try {
      const r = await fetch(`${BASE}/api/edit/apply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          doc_id: doc.doc_id,
          edits: staged.map((s) => ({ page: s.page, rect: s.rect, text: s.text })),
        }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({ detail: `Failed (${r.status})` }))
        throw new Error(j.detail || `Failed (${r.status})`)
      }
      const blob = await r.blob()
      let warn: string[] = []
      try {
        const rep = JSON.parse(r.headers.get('x-doctrim-report') || '{}')
        warn = rep.warnings || []
        for (const e of rep.edits || []) if (e.warning) warn.push(`p${e.page}: ${e.warning}`)
      } catch {
        /* header not json */
      }
      const url = URL.createObjectURL(blob)
      setResult({ url, name: `doctrim-edited.pdf`, warnings: warn })
      setStaged([])
      try {
        const fd = new FormData()
        fd.append('file', new File([blob], 'edited.pdf', { type: 'application/pdf' }))
        const a2 = await fetch(`${BASE}/api/edit/analyze`, { method: 'POST', body: fd })
        if (a2.ok) {
          const j2 = await a2.json()
          setDoc(j2)
          setPageIdx((i) => Math.min(i, j2.page_count - 1))
        }
      } catch {
        /* preview refresh is best-effort */
      }
      const a = document.createElement('a')
      a.href = url
      a.download = 'doctrim-edited.pdf'
      a.click()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(null)
    }
  }

  if (!tool) return <NotFound />

  const scale = zoom

  return (
    <div className="bg-surface/60 min-h-[70vh]">
      <div className="container-x py-10">
        <Link to={href('/pdf-tools')} className="inline-flex items-center gap-1 text-[14px] font-semibold text-ink-muted hover:text-brand">
          <ArrowLeft size={15} className="rtl:rotate-180" /> {t('nav.allTools', 'All tools')}
        </Link>
        <div className="mt-4 flex items-center gap-4">
          <ToolIcon icon={tool.icon} color={tool.color} size={52} radius={13} />
          <div>
            <h1 className="text-3xl font-bold text-ink">{toolName(tool)}</h1>
            <p className="mt-0.5 text-[15px] text-ink-muted">{toolDesc(tool)}</p>
          </div>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[13px] font-semibold text-amber-700">
          <Server size={14} />{' '}
          {isAr
            ? 'تعمل على سيرفرنا: يُرفع الملف ليُعالج، ويُحذف فور تنزيل النتيجة (أو خلال ٣٠ دقيقة إذا أغلقت الصفحة).'
            : 'Runs on our server: the file is uploaded for processing and deleted as soon as you download the result (or within 30 minutes if you close the page).'}
        </p>

        <div className="card mt-6 p-4 sm:p-6">
          {!doc && (
            <Dropzone accept=".pdf" label={isAr ? 'ملف PDF' : 'PDF file'} onFiles={(fs) => fs[0] && upload(fs[0])} />
          )}

          {busy && (
            <div className="flex items-center gap-2 py-6 text-[14px] font-semibold text-ink-muted">
              <Loader2 size={16} className="animate-spin" /> {busy}
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          {doc && page && (
            <div className="mt-2 grid gap-5 lg:grid-cols-[1fr_300px]">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="font-semibold text-ink">{doc.name}</span>
                  <span className="text-ink-muted">· {doc.page_count} {isAr ? 'صفحة' : doc.page_count === 1 ? 'page' : 'pages'}</span>
                  <div className="ms-auto flex items-center gap-1">
                    <button className="btn-ghost px-2 py-1" disabled={pageIdx === 0} onClick={() => setPageIdx((i) => i - 1)}>←</button>
                    <span className="text-ink-muted">{pageIdx + 1} / {doc.page_count}</span>
                    <button className="btn-ghost px-2 py-1" disabled={pageIdx + 1 >= doc.page_count} onClick={() => setPageIdx((i) => i + 1)}>→</button>
                  </div>
                </div>

                <div ref={wrapRef} className="overflow-auto rounded-xl border border-line bg-white p-2">
                  <div className="relative mx-auto" style={{ width: page.width * scale, height: page.height * scale }}>
                    <img
                      src={`${BASE}/api/edit/page?doc=${doc.doc_id}&index=${pageIdx}&dpi=${Math.round(110 * scale)}`}
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
                    {pageEdits.map((s, i) => (
                      <div
                        key={`e${i}`}
                        className="pointer-events-none absolute rounded-[2px] bg-emerald-300/40 ring-1 ring-emerald-500/70"
                        style={{
                          left: (s.rect[0] - 1) * scale,
                          top: (s.rect[1] - 1) * scale,
                          width: (s.rect[2] - s.rect[0] + 2) * scale,
                          height: (s.rect[3] - s.rect[1] + 2) * scale,
                        }}
                      />
                    ))}
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
                          left: draft.rect[0] * scale,
                          top: (draft.rect[1] - 8) * scale,
                          minWidth: Math.max(90, (draft.rect[2] - draft.rect[0]) * scale + 30),
                        }}
                      />
                    )}
                  </div>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-muted">
                  <MousePointerClick size={13} />{' '}
                  {isAr ? 'اضغط كلمة لتعديلها، أو اسحب عبر عدة كلمات.' : 'Click a word to edit it, or drag across several words.'}
                </p>
              </div>

              <aside className="space-y-3">
                <div className="rounded-xl border border-line bg-white p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-ink">{isAr ? 'التعديلات' : 'Changes'}</span>
                    <span className="text-[12px] text-ink-muted">{staged.length}</span>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {staged.length === 0 && (
                      <li className="text-[12px] text-ink-muted">{isAr ? 'لا يوجد بعد.' : 'Nothing yet.'}</li>
                    )}
                    {staged.map((s, i) => (
                      <li key={i} className="rounded-lg bg-surface px-2 py-1.5 text-[12px]">
                        <div className="text-ink-muted line-through">{s.original || '—'}</div>
                        <div className="flex items-center gap-1 font-semibold text-emerald-700">
                          <Check size={12} /> {s.text || (isAr ? '(حذف)' : '(deleted)')}
                        </div>
                        <button
                          className="mt-1 inline-flex items-center gap-1 text-[11px] text-ink-muted hover:text-brand"
                          onClick={() => setStaged((all) => all.filter((_, j) => j !== i))}
                        >
                          <Undo2 size={11} /> {isAr ? 'تراجع' : 'undo'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <button className="btn-primary w-full" disabled={!!busy || !staged.length} onClick={apply}>
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}{' '}
                  {isAr ? 'طبّق ونزّل' : 'Apply & download'}
                </button>

                {result && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[12px] text-emerald-800">
                    <div className="font-semibold">{isAr ? 'تم. الملف نُزّل.' : 'Done — file downloaded.'}</div>
                    <a className="mt-1 inline-block underline" href={result.url} download={result.name}>
                      {isAr ? 'تنزيل مرة أخرى' : 'Download again'}
                    </a>
                    {result.warnings.length > 0 && (
                      <ul className="mt-2 list-disc space-y-0.5 ps-4 text-amber-800">
                        {result.warnings.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                <p className="text-[11px] leading-relaxed text-ink-muted">
                  {isAr
                    ? 'النص القديم يُحذف من الملف فعلياً، والبديل يُكتب بخط المستند نفسه، ويبقى قابلاً للتحديد والبحث. الممسوح ضوئياً يحتاج OCR أولاً.'
                    : 'The old text is deleted from the file itself and the replacement uses the document’s own font, so it stays selectable and searchable. Scanned PDFs need OCR first.'}
                </p>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
