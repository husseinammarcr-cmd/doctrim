/**
 * Same-origin proxy for the DocTrim API.
 *
 * The browser used to call the VPS directly at https://139-162-158-103.sslip.io.
 * That worked from clean networks but failed for real users: `sslip.io` hostnames
 * are blocked by some ISP/DNS filters, a direct cross-origin request has no CDN in
 * front of it, and Safari reports any of those as "Load failed" with no detail.
 *
 * Routing /api/* through Pages means the browser only ever talks to
 * doctrim.pages.dev: no CORS, no third-party DNS, and the long conversions keep
 * working because a Worker waiting on fetch() is I/O, not CPU.
 *
 * Only the paths this site actually needs are forwarded.
 */
const ORIGIN = 'https://139-162-158-103.sslip.io'

const ALLOWED = new Set([
  'health',
  'compress',
  'protect',
  'unlock',
  'office-to-pdf',
  'pdf-to-word',
  'pdf-to-excel',
  'pdf-to-ppt',
  'pdf-to-png',
  'flatten-pdf',
  'ocr',
  'force-download',
  'analytics/collect',
  'edit/analyze',
  'edit/words',
  'edit/page',
  'edit/apply',
])

export async function onRequest(context) {
  const { request, params } = context
  const path = Array.isArray(params.path) ? params.path.join('/') : params.path || ''

  if (!ALLOWED.has(path)) {
    return new Response(JSON.stringify({ detail: 'Not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    })
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': request.headers.get('origin') || '*',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': '*',
        'access-control-max-age': '86400',
      },
    })
  }
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // The query string is part of the API: /api/edit/words?doc=…&page=… .
  const target = new URL(`/api/${path}`, ORIGIN)
  target.search = new URL(request.url).search
  const headers = new Headers(request.headers)
  // The VPS must see the real visitor: it uses this for analytics and rate limits.
  // Cloudflare rewrites x-forwarded-for with its own edge IP on subrequests, so
  // the visitor has to travel in a header of our own. The origin only accepts
  // Cloudflare edge IPs (Caddy), so this cannot be spoofed from the internet.
  const ip = request.headers.get('cf-connecting-ip')
  if (ip) {
    headers.set('x-doctrim-client', ip)
    headers.set('x-forwarded-for', ip)
  }
  headers.delete('host')
  headers.delete('cf-connecting-ip')
  headers.delete('cf-ray')
  headers.delete('cf-ipcountry')
  headers.delete('cf-visitor')
  headers.delete('origin')

  let upstream
  try {
    upstream = await fetch(target.toString(), {
      method: request.method,
      headers,
      body: request.method === 'POST' ? request.body : undefined,
      // long conversions: never abort early on our side
      signal: request.signal,
      redirect: 'manual',
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ detail: 'The processing server is unreachable. Please try again in a moment.' }),
      { status: 502, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
    )
  }

  const out = new Headers(upstream.headers)
  out.delete('content-encoding')
  out.delete('content-length')
  out.set('cache-control', 'no-store')

  return new Response(upstream.body, { status: upstream.status, headers: out })
}
