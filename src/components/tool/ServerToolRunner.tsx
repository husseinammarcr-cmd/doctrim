import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Download, Loader2, RefreshCw, Server, ShieldCheck } from 'lucide-react'
import Dropzone from '../Dropzone'
import ToolIcon from '../ToolIcon'
import { EASE_OUT } from '../../lib/motion'
import type { Tool } from '../../lib/tools'
import { api } from '../../lib/api'
import { saveBlob } from '../../lib/download'
import { formatSize } from '../../lib/pdf/engine'
import { track } from '../../lib/analytics'
import { useI18n } from '../../i18n'

const inputCls = 'w-full rounded border border-line bg-white px-3 py-2 text-[14px] text-ink focus:border-brand focus:outline-none'

function outName(tool: Tool, file: File): string {
  const stem = file.name.replace(/\.[^.]+$/, '')
  switch (tool.slug) {
    case 'protect-pdf': return 'protected.pdf'
    case 'unlock-pdf': return 'unlocked.pdf'
    case 'pdf-to-word': return `${stem}.docx`
    case 'pdf-to-excel': return `${stem}.xlsx`
    case 'pdf-to-ppt': return `${stem}.pptx`
    case 'flatten-pdf': return `${stem}-flattened.pdf`
    case 'pdf-ocr': return 'ocr.pdf'
    default: return `${stem}.pdf`
  }
}

export default function ServerToolRunner({ tool }: { tool: Tool }) {
  const { isAr, t, toolName, toolDesc } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [lang, setLang] = useState('eng')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null)
  const [error, setError] = useState('')

  const needsPassword = tool.slug === 'protect-pdf' || tool.slug === 'unlock-pdf'
  const isOcr = tool.slug === 'pdf-ocr'

  const reset = () => {
    setFile(null); setResult(null); setError(''); setPassword('')
  }

  const process = async () => {
    if (!file) return
    setProcessing(true); setError(''); setResult(null)
    const started = performance.now()
    track('file_added', { t: tool.slug, v: Math.round(file.size / 1024) })
    track('run_start', { t: tool.slug })
    try {
      let blob: Blob
      switch (tool.slug) {
        case 'protect-pdf': blob = await api.protect(file, password); break
        case 'unlock-pdf': blob = await api.unlock(file, password); break
        case 'pdf-to-word': blob = await api.pdfToWord(file); break
        case 'pdf-to-excel': blob = await api.pdfToExcel(file); break
        case 'pdf-to-ppt': blob = await api.pdfToPpt(file); break
        case 'flatten-pdf': blob = await api.flattenPdf(file); break
        case 'pdf-ocr': blob = await api.ocr(file, lang); break
        default: blob = await api.officeToPdf(file)
      }
      setResult({ blob, filename: outName(tool, file) })
      track('run_ok', { t: tool.slug, v: Math.round(performance.now() - started) })
    } catch (e: any) {
      const msg = e?.message || 'The server could not process this file.'
      setError(msg)
      track('run_fail', { t: tool.slug, m: msg, v: Math.round(performance.now() - started) })
    } finally {
      setProcessing(false)
    }
  }

  const download = () => {
    if (!result) return
    void saveBlob(result.blob, result.filename)
  }

  const canProcess = !!file && !processing && (!needsPassword || password.length > 0)

  return (
    <div className="bg-surface/60 min-h-[70vh]">
      <div className="container-x py-10">
        <Link to="/pdf-tools" className="inline-flex items-center gap-1 text-[14px] font-semibold text-ink-muted hover:text-brand">
          <ArrowLeft size={15} className="rtl:rotate-180" /> {t('nav.allTools', 'All tools')}
        </Link>
        <div className="mt-4 flex items-center gap-4">
          <ToolIcon icon={tool.icon} color={tool.color} size={52} radius={13} />
          <div>
            <h1 className="text-3xl font-bold text-ink">{toolName(tool)}</h1>
            <p className="mt-0.5 text-[15px] text-ink-muted">{toolDesc(tool)}</p>
          </div>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-[13px] font-semibold text-brand">
          <Server size={14} /> {isAr ? 'تُعالج بأمان على سيرفر DocTrim ثم تُحذف.' : 'Securely processed on the DocTrim server, then deleted.'}
        </p>

        <div className="card mt-6 p-6 sm:p-8">
          <AnimatePresence mode="wait" initial={false}>
          {!file && (
            <motion.div key="drop" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: EASE_OUT }}>
            <Dropzone accept={tool.accept} onFiles={(fs) => setFile(fs[0])} label={tool.inputLabel} />
            </motion.div>
          )}

          {file && !result && (
            <motion.div key="file" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: EASE_OUT }}>
              <div className="flex items-center gap-3 rounded border border-line bg-white px-4 py-3">
                <ShieldCheck size={18} className="text-brand" />
                <span className="flex-1 truncate text-[14px] font-semibold text-ink">{file.name}</span>
                <span className="text-[12px] text-ink-muted">{formatSize(file.size)}</span>
              </div>

              {needsPassword && (
                <div className="mt-4 max-w-[420px]">
                  <label className="mb-1 block text-[13px] font-semibold text-ink-soft">
                    {tool.slug === 'protect-pdf' ? (isAr ? 'عيّن كلمة مرور' : 'Set a password') : isAr ? 'أدخل كلمة المرور' : 'Enter the password'}
                  </label>
                  <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isAr ? 'كلمة المرور' : 'Password'} />
                </div>
              )}

              {isOcr && (
                <div className="mt-4 max-w-[420px]">
                  <label className="mb-1 block text-[13px] font-semibold text-ink-soft">
                    {isAr ? 'لغة المستند' : 'Document language'}
                  </label>
                  <select className={inputCls} value={lang} onChange={(e) => setLang(e.target.value)}>
                    <option value="eng">{isAr ? 'الإنجليزية' : 'English'}</option>
                    <option value="ara">{isAr ? 'العربية' : 'Arabic'}</option>
                    <option value="fra">{isAr ? 'الفرنسية' : 'French'}</option>
                    <option value="deu">{isAr ? 'الألمانية' : 'German'}</option>
                    <option value="spa">{isAr ? 'الإسبانية' : 'Spanish'}</option>
                  </select>
                </div>
              )}

              {error && <p className="mt-4 rounded bg-red-50 px-4 py-3 text-[14px] text-accent-red">{error}</p>}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button onClick={process} disabled={!canProcess} className="btn-primary btn-lg disabled:opacity-50">
                  {processing ? (<><Loader2 size={18} className="animate-spin" /> {t('tool.processingLabel', 'Processing…')}</>) : (<><Download size={18} /> {toolName(tool)}</>)}
                </button>
                <button onClick={reset} className="btn-ghost btn-lg"><RefreshCw size={16} /> {t('tool.startOver', 'Start over')}</button>
              </div>
            </motion.div>
          )}

          {result && (
            <motion.div
              key="done"
              className="text-center"
              initial={{ opacity: 0, y: 12, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.42, ease: EASE_OUT }}
            >
              <motion.div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-light text-brand"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 340, damping: 18, delay: 0.08 }}
              >
                <ShieldCheck size={30} />
              </motion.div>
              <h2 className="mt-4 text-2xl font-bold text-ink">{t('tool.done', 'Done!')}</h2>
              <p className="mt-2 text-[15px] text-ink-soft">{result.filename} · {formatSize(result.blob.size)}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button onClick={download} className="btn-primary btn-lg"><Download size={18} /> {t('tool.download', 'Download')}</button>
                <button onClick={reset} className="btn-ghost btn-lg"><RefreshCw size={16} /> {t('tool.startOver', 'Start over')}</button>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
