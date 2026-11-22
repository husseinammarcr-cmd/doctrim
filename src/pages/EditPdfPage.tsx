import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react'
import Dropzone from '../components/Dropzone'
import ToolIcon from '../components/ToolIcon'
import EditEditor from '../components/tool/EditEditor'
import { getTool } from '../lib/tools'
import { fileToBytes } from '../lib/pdf/engine'
import NotFound from './NotFound'

export default function EditPdfPage() {
  const tool = getTool('edit-pdf')
  const [file, setFile] = useState<File | null>(null)
  const [bytes, setBytes] = useState<Uint8Array | null>(null)

  if (!tool) return <NotFound />

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
          <ShieldCheck size={14} /> Edited in your browser — the file never leaves your device.
        </p>

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
