/**
 * Serves the SPA shell with route-specific <head> content.
 *
 * The app is a client-rendered Vite build, so without this every URL shipped the
 * homepage title, the homepage description and no og:image — which is what
 * Google, WhatsApp, X and Facebook actually read. This middleware rewrites the
 * head for the requested route from the build-time map in ./_meta.js (generated
 * by scripts/gen-meta.mjs) and returns a real 404 for unknown paths.
 *
 * Runs only for HTML navigations: assets, sitemap.xml, robots.txt and files with
 * an extension fall straight through to the asset handler.
 */
import META from './_meta.js'

const SITE = 'https://doctrim.pages.dev'

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function jsonLd(blocks) {
  return blocks
    .map((b) => `<script type="application/ld+json">${JSON.stringify(b).replace(/<\//g, '<\\/')}</script>`)
    .join('')
}

/** Strips the tags this function owns, so nothing is duplicated. */
function strip(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta[^>]+(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, '')
}

/**
 * Rewrites one HTML document. Exported so scripts/test-meta.mjs can check the
 * output shape without going through the Workers runtime.
 */
export function render(html, meta, path, { notFound = false } = {}) {
  const url = `${SITE}/${path}`
  const image = `${SITE}${meta.image}`
  const isAr = path === 'ar' || path.startsWith('ar/')
  const lang = isAr ? 'ar' : 'en'
  const alternates = meta.alt
    ? [
        `<link rel="alternate" hreflang="en" href="${SITE}${meta.alt.en}" />`,
        `<link rel="alternate" hreflang="ar" href="${SITE}${meta.alt.ar}" />`,
        `<link rel="alternate" hreflang="x-default" href="${SITE}${meta.alt.en}" />`,
      ]
    : []
  const head = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    notFound ? '<meta name="robots" content="noindex,follow" />' : '<meta name="robots" content="index,follow,max-image-preview:large" />',
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${meta.type || 'website'}" />`,
    '<meta property="og:site_name" content="DocTrim" />',
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${esc(meta.title)}" />`,
    `<meta property="og:locale" content="${meta.locale || 'en_US'}" />`,
    ...alternates,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    meta.published ? `<meta property="article:published_time" content="${meta.published}" />` : '',
    meta.jsonld ? jsonLd(meta.jsonld) : '',
  ]
    .filter(Boolean)
    .join('\n    ')

  const shell = strip(html)
    .replace(/<html[^>]*>/i, `<html lang="${lang}" dir="${isAr ? 'rtl' : 'ltr'}">`)
    .replace('</head>', `    ${head}\n  </head>`)
  return shell
}

const NOT_FOUND_META = {
  title: 'Page not found — DocTrim',
  description: 'This page does not exist. Browse the free DocTrim PDF tools instead.',
  image: '/og/home.png',
  type: 'website',
}

export async function onRequest(context) {
  const { request, next } = context
  if (request.method !== 'GET') return next()

  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/+|\/+$/g, '')

  // assets, feed files and anything with an extension: untouched
  if (path.includes('.') || path.startsWith('assets/') || path.startsWith('og/')) return next()

  // Fetch the built shell directly: `_redirects` rewrites every unknown path to
  // /index.html, and going through next() depends on that fallback firing.
  let res
  try {
    res = await context.env.ASSETS.fetch(new URL('/index.html', url))
  } catch {
    res = await next()
  }
  const type = res.headers.get('content-type') || ''
  if (!type.includes('text/html')) return next()

  const meta = META[path]
  const html = await res.text()
  const body = render(html, meta || NOT_FOUND_META, path, { notFound: !meta })

  const headers = new Headers(res.headers)
  headers.delete('content-length')
  headers.delete('etag')
  headers.delete('last-modified')
  headers.set('content-type', 'text/html; charset=utf-8')
  // no edge caching of the rewritten shell; the asset underneath is still cached
  headers.set('cache-control', 'public, max-age=0, must-revalidate')

  return new Response(body, { status: meta ? 200 : 404, headers })
}
