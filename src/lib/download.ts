/**
 * Cross-browser "save file" helper.
 *
 * The `download` attribute on blob: URLs is ignored by iOS Safari (and some
 * desktop Safari versions) — instead of saving, the browser opens the PDF
 * inline in its viewer. To make downloads actually land on the device we:
 *
 *  1. On iOS / Safari, prefer the Web Share API ("Save to Files"), which is
 *     the only dependable way to get a file onto the device there.
 *  2. Everywhere else, keep the classic anchor download but attach the anchor
 *     to the DOM, fire a real MouseEvent, and revoke the blob URL late so the
 *     browser has time to start the download.
 */

import { track } from './analytics'

type ShareNavigator = Navigator & {
  canShare?: (data: { files: File[] }) => boolean
  share?: (data: { files: File[]; title?: string }) => Promise<void>
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Safari/.test(ua) && !/Chrome|Chromium|Android|CriOS|FxiOS|Edg|OPR/.test(ua)
}

/** Try the native share sheet (Save to Files). Returns true if it handled the save. */
async function tryShare(blob: Blob, filename: string, type: string): Promise<'done' | 'cancelled' | 'unavailable'> {
  const nav = navigator as ShareNavigator
  if (!nav.canShare || !nav.share) return 'unavailable'
  try {
    const file = new File([blob], filename, { type })
    if (!nav.canShare({ files: [file] })) return 'unavailable'
    await nav.share({ files: [file], title: filename })
    return 'done'
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return 'cancelled'
    return 'unavailable'
  }
}

/**
 * Save a blob as a real file download.
 */
export async function saveBlob(blob: Blob, filename: string, mime?: string): Promise<void> {
  const type = mime || blob.type || 'application/octet-stream'
  const tool = location.pathname.split('/').filter(Boolean)[0] || 'home'
  const kb = Math.round(blob.size / 1024)

  // iOS and Safari: the Web Share sheet is the reliable path.
  if (isIOS() || isSafari()) {
    const result = await tryShare(blob, filename, type)
    if (result === 'done' || result === 'cancelled') {
      track('download', { t: tool, v: kb })
      return
    }
    // 'unavailable' -> fall through to the anchor path below.
  }

  // Chrome / Firefox / Edge / fallback: anchor download.
  const url = URL.createObjectURL(new Blob([blob], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  track('download', { t: tool, v: kb })
  // Keep the anchor and the URL alive; revoking too early cancels the download.
  window.setTimeout(() => {
    a.remove()
    URL.revokeObjectURL(url)
  }, 60_000)
}

/** Save raw bytes (pdf-lib output) as a file download. */
export function saveBytes(bytes: Uint8Array, filename: string, mime = 'application/pdf'): void {
  void saveBlob(new Blob([bytes.slice()], { type: mime }), filename, mime)
}
