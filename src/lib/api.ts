// Client for the DocTrim server API (server-side tools).
// Set VITE_API_URL at build time (Cloudflare Pages env var) to enable.
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || ''

export function serverConfigured(): boolean {
  return BASE.length > 0
}

export async function serverHealthy(): Promise<boolean> {
  if (!BASE) return false
  try {
    const r = await fetch(`${BASE}/api/health`, { method: 'GET' })
    return r.ok
  } catch {
    return false
  }
}

async function post(path: string, file: File, fields: Record<string, string> = {}): Promise<Blob> {
  if (!BASE) throw new Error('Server API is not configured')
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
  return r.blob()
}

export const api = {
  compress: (file: File, level: string) => post('/api/compress', file, { level }),
  protect: (file: File, password: string) => post('/api/protect', file, { password }),
  unlock: (file: File, password: string) => post('/api/unlock', file, { password }),
  officeToPdf: (file: File) => post('/api/office-to-pdf', file),
  pdfToWord: (file: File) => post('/api/pdf-to-word', file),
  pdfToExcel: (file: File) => post('/api/pdf-to-excel', file),
  pdfToPpt: (file: File) => post('/api/pdf-to-ppt', file),
  flattenPdf: (file: File) => post('/api/flatten-pdf', file),
  ocr: (file: File, lang = 'eng') => post('/api/ocr', file, { lang }),
}
