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

const postsAr = []
try {
  for (const file of await readdir(path.join(root, 'src/content/blog/ar'))) {
    if (!file.endsWith('.md')) continue
    const raw = await readFile(path.join(root, 'src/content/blog/ar', file), 'utf8')
    const date = /^date:\s*"?(\d{4}-\d{2}-\d{2})"?/m.exec(raw)?.[1]
    postsAr.push({ slug: file.replace(/\.md$/, ''), date })
  }
} catch {
  /* no Arabic posts yet */
}
postsAr.sort((a, b) => (a.date < b.date ? 1 : -1))

const url = (loc, { priority = '0.6', changefreq = 'monthly', lastmod, alt } = {}) =>
  [
    '  <url>',
    `    <loc>${SITE}/${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
    alt ? `    <xhtml:link rel="alternate" hreflang="en" href="${SITE}${alt.en}" />` : '',
    alt ? `    <xhtml:link rel="alternate" hreflang="ar" href="${SITE}${alt.ar}" />` : '',
    alt ? `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${alt.en}" />` : '',
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n')

// English and Arabic are two halves of the same page set: label both with
// hreflang so Google serves the Arabic URL to Arabic searches.
const BILINGUAL = [
  { en: '/', ar: '/ar', loc: '', priority: '1.0' },
  { en: '/pdf-tools', ar: '/ar/pdf-tools', loc: 'pdf-tools', priority: '0.9' },
  { en: '/blog', ar: '/ar/blog', loc: 'blog', priority: '0.9' },
  { en: '/about', ar: '/ar/about', loc: 'about', priority: '0.5' },
  { en: '/terms', ar: '/ar/terms', loc: 'terms', priority: '0.3' },
  { en: '/help', ar: '/ar/help', loc: 'help', priority: '0.5' },
  { en: '/privacy', ar: '/ar/privacy', loc: 'privacy', priority: '0.3' },
]

const enUrls = [
  ...STATIC_ROUTES.map((r) => {
    const pair = BILINGUAL.find((b) => b.loc === r.loc)
    return url(r.loc, { ...r, alt: pair ? { en: pair.en, ar: pair.ar } : undefined })
  }),
  ...toolSlugs.map((slug) => {
    const pair = { en: `/${slug}`, ar: `/ar/${slug}` }
    return url(slug, { priority: '0.8', changefreq: 'monthly', alt: pair })
  }),
  ...posts.map((p) => {
    const pair = { en: `/blog/${p.slug}`, ar: `/ar/blog/${p.slug}` }
    return url(`blog/${p.slug}`, { priority: '0.7', changefreq: 'monthly', lastmod: p.date, alt: pair })
  }),
]

const arUrls = [
  ...BILINGUAL.map((b) => url(b.ar.replace(/^\//, ''), { priority: b.priority, changefreq: 'weekly', alt: { en: b.en, ar: b.ar } })),
  ...toolSlugs.map((slug) =>
    url(`ar/${slug}`, { priority: '0.8', changefreq: 'monthly', alt: { en: `/${slug}`, ar: `/ar/${slug}` } })
  ),
  ...postsAr.map((p) =>
    url(`ar/blog/${p.slug}`, {
      priority: '0.7',
      changefreq: 'monthly',
      lastmod: p.date,
      alt: { en: `/blog/${p.slug}`, ar: `/ar/blog/${p.slug}` },
    })
  ),
]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${enUrls.join('\n')}
${arUrls.join('\n')}
</urlset>
`

const total = enUrls.length + arUrls.length
for (const dir of ['public', 'dist']) {
  await writeFile(path.join(root, dir, 'sitemap.xml'), xml, 'utf8')
}
console.log(`sitemap.xml written: ${total} URLs (${toolSlugs.length} tools, ${posts.length} posts, ${arUrls.length} Arabic)`)
