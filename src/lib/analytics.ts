/**
 * First-party usage events.
 *
 * The site had no measurement at all, so there was no way to tell which tools
 * people open, where a run fails, or what they search for before leaving. This
 * sends a small batch of event names to our own API (see the VPS
 * `analytics.py`), not to a third party:
 *
 *  - no cookies, no fingerprinting, no cross-site IDs
 *  - respects Do Not Track and a local opt-out (`localStorage.dt_notrack = '1'`)
 *  - events are names and counts only: no file names, no file contents, no text
 *
 * If VITE_API_URL is unset (pure static build) every call is a no-op.
 */
import { API_BASE as BASE, serverConfigured } from './apiBase'

export type StatEvent = 'pageview' | 'file_added' | 'run_start' | 'run_ok' | 'run_fail' | 'error' | 'download' | 'share'

interface Queued {
  n: StatEvent
  p?: string
  t?: string
  v?: number
  m?: string
}

const queue: Queued[] = []
let timer: number | undefined

function disabled(): boolean {
  if (!serverConfigured()) return true
  try {
    if (localStorage.getItem('dt_notrack') === '1') return true
  } catch {
    /* private mode: treat as enabled, nothing is stored anyway */
  }
  const dnt = navigator.doNotTrack || (window as any).doNotTrack
  return dnt === '1' || dnt === 'yes'
}

function flush(): void {
  if (!queue.length) return
  const body = JSON.stringify({ e: queue.splice(0, 20) })
  const url = `${BASE}/api/analytics/collect`
  const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' })
  try {
    if (navigator.sendBeacon && navigator.sendBeacon(url, blob)) return
  } catch {
    /* fall through to fetch */
  }
  void fetch(url, { method: 'POST', body: blob, keepalive: true, mode: 'cors' }).catch(() => {})
}

function schedule(): void {
  if (timer) return
  timer = window.setTimeout(() => {
    timer = undefined
    flush()
  }, 1500)
}

/** Records one event. Safe to call from anywhere; never throws. */
export function track(name: StatEvent, props: Omit<Queued, 'n'> = {}): void {
  if (disabled()) return
  queue.push({ n: name, p: props.p ?? location.pathname, ...props })
  schedule()
}

/** Path changed in the SPA: count a pageview and flush what is pending. */
export function pageview(path: string = location.pathname): void {
  track('pageview', { p: path })
  flush()
}

/** Installs global handlers so a crash in production is visible in the stats. */
export function installErrorTracking(): void {
  if (disabled()) return
  window.addEventListener('error', (e) => {
    track('error', { m: `${e.message} @ ${String(e.filename || '').split('/').pop()}:${e.lineno}` })
  })
  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const reason = e.reason
    track('error', { m: String(reason?.message || reason || 'unhandled rejection').slice(0, 240) })
  })
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}
