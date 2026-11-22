/**
 * Checks the head that functions/_middleware.js produces for real routes.
 * Run after `npm run build`:  node scripts/test-meta.mjs
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { render } from '../functions/_middleware.js'
import META from '../functions/_meta.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const shell = await readFile(path.join(root, 'dist/index.html'), 'utf8')

const count = (s, re) => (s.match(re) || []).length
let failures = 0

const check = (label, ok, detail = '') => {
  if (!ok) {
    failures++
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

for (const route of Object.keys(META)) {
  const html = render(shell, META[route], route)
  const meta = META[route]
  const tag = route || '/'
  check(`${tag} one title`, count(html, /<title>/g) === 1, String(count(html, /<title>/g)))
  check(`${tag} one canonical`, count(html, /rel="canonical"/g) === 1)
  check(`${tag} one og:image`, count(html, /property="og:image"/g) === 1)
  check(`${tag} one og:title`, count(html, /property="og:title"/g) === 1)
  check(`${tag} one description`, count(html, /name="description"/g) === 1)
  check(`${tag} title text`, html.includes(`<title>${meta.title.replace(/&/g, '&amp;')}</title>`))
  check(`${tag} head still closes`, html.includes('</head>') && html.includes('</html>'))
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  check(`${tag} json-ld blocks`, blocks.length === meta.jsonld.length, `${blocks.length} vs ${meta.jsonld.length}`)
  for (const b of blocks) {
    try {
      JSON.parse(b[1])
    } catch (e) {
      check(`${tag} json-ld parses`, false, e.message)
    }
  }
}

// unknown route -> 404 shape
const missing = render(shell, { title: 'x', description: 'y', image: '/og/home.png' }, 'no-such-page', { notFound: true })
check('404 noindex', missing.includes('noindex'))
check('404 keeps shell', missing.includes('id="root"'))

console.log(failures === 0 ? `OK — ${Object.keys(META).length} routes clean` : `${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
