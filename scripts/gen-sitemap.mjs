/**
 * Generates sitemap.xml from the real routes: the static pages, every tool in
 * src/lib/tools.ts, and every Markdown post in src/content/blog.
 *
 * Runs after `vite build`, so the file lands in dist/ and is also written to
 * public/ so a fresh clone serves it before the first build.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://doctrim.pages.dev'

const read = (rel) => readFile(path.join(root, rel), 'utf8')

const STATIC_ROUTES = [
  { loc: '', priority: '1.0', changefreq: 'weekly' },
  { loc: 'pdf-tools', priority: '0.9', changefreq: 'weekly' },
  { loc: 'blog', priority: '0.9', changefreq: 'weekly' },
  { loc: 'about', priority: '0.5', changefreq: 'monthly' },
  { loc: 'help', priority: '0.5', changefreq: 'monthly' },
  { loc: 'privacy', priority: '0.3', changefreq: 'yearly' },
  { loc: 'terms', priority: '0.3', changefreq: 'yearly' },
]

const toolsSrc = await read('src/lib/tools.ts')
const toolSlugs = [...toolsSrc.matchAll(/slug:\s*'([^']+)'/g)].map((m) => m[1])

const blogDir = path.join(root, 'src/content/blog')
const posts = []
for (const file of await readdir(blogDir)) {
  if (!file.endsWith('.md')) continue
  const raw = await readFile(path.join(blogDir, file), 'utf8')
  const date = /^date:\s*"?(\d{4}-\d{2}-\d{2})"?/m.exec(raw)?.[1]
  posts.push({ slug: file.replace(/\.md$/, ''), date })
}
posts.sort((a, b) => (a.date < b.date ? 1 : -1))

const url = (loc, { priority = '0.6', changefreq = 'monthly', lastmod } = {}) =>
  [
    '  <url>',
    `    <loc>${SITE}/${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${STATIC_ROUTES.map((r) => url(r.loc, r)).join('\n')}
${toolSlugs.map((slug) => url(slug, { priority: '0.8', changefreq: 'monthly' })).join('\n')}
${posts.map((p) => url(`blog/${p.slug}`, { priority: '0.7', changefreq: 'monthly', lastmod: p.date })).join('\n')}
</urlset>
`

const total = STATIC_ROUTES.length + toolSlugs.length + posts.length
for (const dir of ['public', 'dist']) {
  await writeFile(path.join(root, dir, 'sitemap.xml'), xml, 'utf8')
}
console.log(`sitemap.xml written: ${total} URLs (${toolSlugs.length} tools, ${posts.length} posts)`)
