// Client for the DocTrim server API (server-side tools).
// Set VITE_API_URL at build time (Cloudflare Pages env var) to enable.
import { API_BASE as BASE, serverConfigured } from './apiBase'

export { serverConfigured }

export async function serverHealthy(): Promise<boolean> {
  if (!serverConfigured()) return false
  try {
    const r = await fetch(`${BASE}/api/health`, { method: 'GET' })
    return r.ok
  } catch {
    return false
  }
}

async function postResponse(path: string, file: File, fields: Record<string, string> = {}): Promise<Response> {
  if (!serverConfigured()) throw new Error('Server API is not configured')
  const fd = new FormData()
  fd.append('file', file)
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  const r = await fetch(`${BASE}${path}`, { method: 'POST', body: fd })
  if (!r.ok) {
    let msg = `Server error (${r.status})`
    try {
      const j = await r.json()
      if (j.detail) msg = j.detail
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return r
}

async function post(path: string, file: File, fields: Record<string, string> = {}): Promise<Blob> {
  return (await postResponse(path, file, fields)).blob()
}


/**
 * Same as `post`, but reports upload progress and keeps response headers.
 * Used by the server tools: a 40 MB scan on mobile takes a while to upload, and
 * a frozen "Processing…" makes people close the tab.
 */
export function postWithProgress(
  path: string,
  file: File,
  fields: Record<string, string> = {},
  onUpload?: (pct: number) => void
): Promise<{ blob: Blob; note: string | null }> {
  if (!serverConfigured()) return Promise.reject(new Error('Server API is not configured'))

  return new Promise((resolve, reject) => {
    const fd = new FormData()
    fd.append('file', file)
    for (const [k, v] of Object.entries(fields)) fd.append(k, v)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE}${path}`)
    xhr.responseType = 'blob'
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onUpload) onUpload(Math.min(99, Math.round((e.loaded / e.total) * 100)))
    }
    xhr.onload = () => {
      const blob = xhr.response as Blob
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ blob, note: xhr.getResponseHeader('x-doctrim-note') })
        return
      }
      blob
        .text()
        .then((t) => {
          let msg = `Server error (${xhr.status})`
          try {
            const j = JSON.parse(t)
            if (j.detail) msg = j.detail
          } catch {
            /* not json */
          }
          reject(new Error(msg))
        })
        .catch(() => reject(new Error(`Server error (${xhr.status})`)))
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.onabort = () => reject(new Error('Aborted'))
    xhr.send(fd)
  })
}

export const api = {
  compress: (file: File, level: string) => post('/api/compress', file, { level }),
  protect: (file: File, password: string) => post('/api/protect', file, { password }),
  unlock: (file: File, password: string) => post('/api/unlock', file, { password }),
  officeToPdf: (file: File) => post('/api/office-to-pdf', file),
  pdfToWord: (file: File) => post('/api/pdf-to-word', file),
  /** Same as pdfToWord, but keeps the server's note about scanned sources. */
  pdfToWordDetailed: async (file: File) => {
    const r = await postResponse('/api/pdf-to-word', file)
    return { blob: await r.blob(), note: r.headers.get('x-doctrim-note') }
  },
  pdfToExcel: (file: File) => post('/api/pdf-to-excel', file),
  pdfToPpt: (file: File) => post('/api/pdf-to-ppt', file),
  flattenPdf: (file: File) => post('/api/flatten-pdf', file),
  ocr: (file: File, lang = 'eng') => post('/api/ocr', file, { lang }),
}
