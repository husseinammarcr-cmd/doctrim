// Server-side rewrite of the *real* text of a PDF (no cover rectangle).
//
// The in-browser editor owns the file; when a block of existing text is edited
// we send the current PDF plus one rect+text per line, and get back the same
// document with those glyphs deleted and the replacement drawn in the
// document's own font. Everything else (add text, images, shapes, redaction)
// keeps working locally in the browser.
import { API_BASE as BASE, serverConfigured } from './apiBase'

export interface TextRunEdit {
  page: number
  rect: [number, number, number, number]
  text: string
}

export interface RewriteResult {
  bytes: Uint8Array
  warnings: string[]
}

export function rewriteAvailable(): boolean {
  return serverConfigured()
}

export async function rewriteText(bytes: Uint8Array, edits: TextRunEdit[]): Promise<RewriteResult> {
  if (!edits.length) return { bytes, warnings: [] }
  const fd = new FormData()
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  fd.append('file', new Blob([copy.buffer], { type: 'application/pdf' }), 'document.pdf')
  fd.append('edits', JSON.stringify(edits))
  const r = await fetch(`${BASE}/api/edit/quick`, { method: 'POST', body: fd })
  if (!r.ok) {
    let msg = `Rewrite failed (${r.status})`
    try {
      const j = await r.json()
      if (j.detail) msg = j.detail
    } catch {
      /* not json */
    }
    throw new Error(msg)
  }
  const out = new Uint8Array(await r.arrayBuffer())
  let warnings: string[] = []
  try {
    const rep = JSON.parse(r.headers.get('x-doctrim-report') || '{}')
    warnings = [...(rep.warnings || []), ...(rep.edits || []).map((e: { warning?: string }) => e.warning).filter(Boolean)]
    if ((rep.edits || []).every((e: { removed_glyphs?: number }) => !e.removed_glyphs)) {
      warnings.push('No text was found under that line — nothing was rewritten.')
    }
  } catch {
    /* header not json */
  }
  return { bytes: out, warnings }
}
