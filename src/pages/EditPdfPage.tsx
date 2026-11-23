import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Highlighter, RefreshCw, ShieldCheck, Signature, TextCursorInput } from 'lucide-react'
import Dropzone from '../components/Dropzone'
import ToolIcon from '../components/ToolIcon'
import EditEditor from '../components/tool/EditEditor'
import { getTool } from '../lib/tools'
import { fileToBytes } from '../lib/pdf/engine'
import { usePageMeta } from '../lib/usePageMeta'
import NotFound from './NotFound'
import { useI18n } from '../i18n'

export default function EditPdfPage() {
  const { isAr, t, toolName, toolDesc, href } = useI18n()
  const tool = getTool('edit-pdf')
  const [file, setFile] = useState<File | null>(null)
  const [bytes, setBytes] = useState<Uint8Array | null>(null)

  usePageMeta(
    isAr
      ? 'تعديل PDF — أعد كتابة النص، أضف أي شيء، وقّع واحجب | DocTrim'
      : 'Edit PDF — rewrite text, add anything, sign and redact | DocTrim',
    isAr
      ? 'محرر PDF كامل: أعد كتابة النص الموجود، وأضف نصاً وصوراً وأشكالاً وتوقيعات، ولوّن أو احجب، ثم نزّل الملف. إعادة كتابة النص تتم على سيرفرنا ليُحذف النص القديم فعلياً، وبقية التعديلات داخل متصفحك.'
      : 'A full PDF editor: rewrite text in place, add text, images, shapes and signatures, highlight or redact, then download. Rewriting existing text runs on our server so the old words are truly replaced; everything else stays in your browser.',
  )

  if (!tool) return <NotFound />

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
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-[13px] font-semibold text-brand">
          <ShieldCheck size={14} />{' '}
          {isAr
            ? 'الإضافات والصور والتوقيع داخل متصفحك. إعادة كتابة النص الموجود تتم على سيرفرنا (يُحذف فور الانتهاء).'
            : 'Additions, images and signatures stay in your browser. Rewriting existing text runs on our server, and the upload is discarded as soon as the rewrite is done.'}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-ink-muted">
          {[
            { icon: TextCursorInput, label: isAr ? 'أعد كتابة النص الموجود' : 'Rewrite existing text' },
            { icon: Highlighter, label: isAr ? 'تلوين وحجب' : 'Highlight & redact' },
            { icon: Signature, label: isAr ? 'توقيع وتاريخ' : 'Sign and date' },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1">
              <Icon size={13} className="text-brand" /> {label}
            </span>
          ))}
        </div>

        <div className="card mt-6 p-6 sm:p-8">
          {!bytes && (
            <Dropzone
              accept=".pdf"
              label="PDF"
              onFiles={async (fs) => {
                const f = fs[0]
                if (!f) return
                setFile(f)
                setBytes(await fileToBytes(f))
              }}
            />
          )}

          {bytes && file && (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded border border-line bg-white px-4 py-3">
                <span className="flex-1 truncate text-[14px] font-semibold text-ink">{file.name}</span>
                <button
                  onClick={() => { setBytes(null); setFile(null) }}
                  className="btn-ghost btn-sm"
                >
                  <RefreshCw size={14} /> Start over
                </button>
              </div>
              <EditEditor bytes={bytes} fileName={file.name} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
