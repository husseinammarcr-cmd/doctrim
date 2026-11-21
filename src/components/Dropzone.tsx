import { useCallback, useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'

export default function Dropzone({
  accept,
  multi = false,
  onFiles,
  label = 'PDF',
  compact = false,
}: {
  accept: string
  multi?: boolean
  onFiles: (files: File[]) => void
  label?: string
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const handle = useCallback(
    (list: FileList | null) => {
      if (!list) return
      const files = Array.from(list)
      if (files.length) onFiles(multi ? files : [files[0]])
    },
    [multi, onFiles],
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        handle(e.dataTransfer.files)
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-center transition-colors ${
        drag ? 'border-brand bg-brand-lighter' : 'border-line bg-white hover:border-brand hover:bg-brand-lighter/40'
      } ${compact ? 'gap-2 p-6' : 'gap-4 p-12'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multi}
        className="hidden"
        onChange={(e) => {
          handle(e.target.files)
          e.target.value = ''
        }}
      />
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand">
        <UploadCloud size={26} />
      </span>
      <div>
        <p className="text-lg font-bold text-ink">Drop {label} here</p>
        <p className="mt-1 text-[14px] text-ink-muted">or click to choose {multi ? 'files' : 'a file'}</p>
      </div>
      <span className="btn-primary btn-md">Choose {multi ? 'Files' : 'File'}</span>
    </div>
  )
}
