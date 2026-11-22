/**
 * Where the browser looks for the DocTrim API.
 *
 * On the deployed site the answer is "right here": `functions/api/[[path]].js`
 * proxies /api/* to the VPS, so the page only ever talks to doctrim.pages.dev.
 * That removes CORS and the third-party `sslip.io` hostname, which some ISP and
 * DNS filters block outright — the failure users saw as Safari's "Load failed".
 *
 * Anywhere else (local dev, static preview) it falls back to VITE_API_URL.
 */
const ENV_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || ''

const onPages = typeof location !== 'undefined' && /(^|\.)pages\.dev$/.test(location.hostname)

/** Base URL for API calls; '' means same origin. */
export const API_BASE = onPages ? '' : ENV_BASE

export function serverConfigured(): boolean {
  return onPages || ENV_BASE.length > 0
}
