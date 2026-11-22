/**
 * Builds the per-route metadata map (`functions/_meta.js`) used by the Pages
 * Function that injects titles, Open Graph tags and JSON-LD into the SPA shell
 * before it reaches crawlers, social scrapers and link previews.
 *
 * Also writes `scripts/og-data.json`, which `scripts/gen_og.py` uses to render
 * the share cards. One source of truth: `src/lib/tools.ts` and the Markdown
 * posts. Static-page titles mirror the strings in `src/pages/*.tsx`.
 *
 * Runs after `vite build` (see package.json), so the generated module is always
 * in sync with the content that was just built.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://doctrim.pages.dev'
const read = (rel) => readFile(path.join(root, rel), 'utf8')

const field = (line, key) => {
  const m = new RegExp(`${key}:\\s*'((?:[^'\\\\]|\\\\.)*)'`).exec(line)
  return m ? m[1].replace(/\\\\'/g, "'") : undefined
}

// ---------------------------------------------------------------- tools
const toolsSrc = await read('src/lib/tools.ts')
const tools = []
for (const line of toolsSrc.split('\n')) {
  if (!/^\s*\{.*slug:\s*'/.test(line)) continue
  const slug = field(line, 'slug')
  if (!slug) continue
  tools.push({
    slug,
    name: field(line, 'name'),
    desc: field(line, 'desc'),
    color: field(line, 'color'),
    category: field(line, 'category'),
    icon: field(line, 'icon'),
    status: field(line, 'status'),
  })
}

// ---------------------------------------------------------------- blog
// Arabic copy lives in src/i18n/ar.json so the app and the edge function
// cannot drift apart.
const arCopy = JSON.parse(await readFile(path.join(root, 'src/i18n/ar.json'), 'utf8'))

const blogDir = path.join(root, 'src/content/blog')
const posts = []
for (const file of (await readdir(blogDir)).sort()) {
  if (!file.endsWith('.md')) continue
  const raw = await readFile(path.join(blogDir, file), 'utf8')
  const fm = /^---\n([\s\S]*?)\n---/.exec(raw)?.[1] ?? ''
  const grab = (k) => new RegExp(`^${k}:\\s*"([\\s\\S]*?)"`, 'm').exec(fm)?.[1]
  posts.push({
    slug: file.replace(/\.md$/, ''),
    title: grab('title'),
    description: grab('description'),
    date: grab('date'),
    category: grab('category'),
  })
}
posts.sort((a, b) => (a.date < b.date ? 1 : -1))

// Arabic translations, one file per English slug
const postsAr = []
try {
  for (const file of (await readdir(path.join(root, 'src/content/blog/ar'))).sort()) {
    if (!file.endsWith('.md')) continue
    const raw = await readFile(path.join(root, 'src/content/blog/ar', file), 'utf8')
    const fm = /^---\n([\s\S]*?)\n---/.exec(raw)?.[1] ?? ''
    const grab = (k) => new RegExp(`^${k}:\\s*"([\\s\\S]*?)"`, 'm').exec(fm)?.[1]
    postsAr.push({
      slug: file.replace(/\.md$/, ''),
      title: grab('title'),
      description: grab('description'),
      date: grab('date'),
      category: grab('category'),
    })
  }
} catch {
  /* no Arabic posts yet */
}
postsAr.sort((a, b) => (a.date < b.date ? 1 : -1))

// ---------------------------------------------------------------- static pages
// Titles/descriptions are the same strings the pages set at runtime.
const STATIC_PAGES = [
  {
    key: 'home',
    path: '/',
    title: 'DocTrim — We make PDF easy.',
    description:
      'Free PDF tools that run in your browser: compress, merge, split, convert, sign and edit. No account, no subscription.',
  },
  {
    key: 'pdf-tools',
    path: '/pdf-tools',
    title: `All PDF Tools — ${tools.length} free PDF tools | DocTrim`,
    description: `Every DocTrim tool in one place: ${tools.length} free tools to convert, compress, organize, edit and protect PDFs. No sign-up, no limits, no watermarks.`,
  },
  {
    key: 'blog',
    path: '/blog',
    title: 'PDF guides and how-tos — DocTrim Blog',
    description:
      'Practical guides to PDF file sizes, page sizes, editing limits, redaction and e-signatures — written by the team building DocTrim’s free browser tools.',
  },
  {
    key: 'about',
    path: '/about',
    title: 'About DocTrim — We make PDF easy',
    description:
      'DocTrim is a small independent project building a free, privacy-friendly PDF toolkit that runs in your browser. No account, no installs, no paywalls.',
  },
  {
    key: 'help',
    path: '/help',
    title: 'Help Center — DocTrim',
    description:
      'Answers to common questions about DocTrim: how tools work, where your files are processed, file limits, troubleshooting, and how the site stays free.',
  },
  {
    key: 'privacy',
    path: '/privacy',
    title: 'Privacy Policy — DocTrim',
    description:
      'How DocTrim handles your files and data: browser-side processing, no accounts, short-lived server logs, and the cookies used by advertising.',
  },
  {
    key: 'terms',
    path: '/terms',
    title: 'Terms of Service — DocTrim',
    description:
      'The terms that apply when you use DocTrim: what the service is, your rights over your files, acceptable use, and the limits of our liability.',
  },
]

const ORG = {
  '@type': 'Organization',
  name: 'DocTrim',
  url: `${SITE}/`,
  logo: { '@type': 'ImageObject', url: `${SITE}/og/logo.png`, width: 512, height: 512 },
}

const toolTitle = (t) => (t.slug === 'edit-pdf' ? 'Edit PDF — rewrite text, add anything, sign and redact | DocTrim' : `${t.name} — Free Online PDF Tool | DocTrim`)
const toolDesc = (t) =>
  t.slug === 'edit-pdf'
    ? 'A full PDF editor in your browser: rewrite existing text, add text, images, shapes and signatures, highlight or redact, then download. Files never leave your device.'
    : t.desc

const meta = {}

// home
meta[''] = {
  title: STATIC_PAGES[0].title,
  description: STATIC_PAGES[0].description,
  image: '/og/home.png',
  type: 'website',
  jsonld: [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'DocTrim',
      url: `${SITE}/`,
      description: 'Free browser-based PDF tools. No account, no uploads for most tools.',
      publisher: ORG,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'DocTrim',
      url: `${SITE}/`,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (web browser)',
      browserRequirements: 'Requires JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      isAccessibleForFree: true,
      featureList: tools.map((t) => t.name),
      publisher: ORG,
    },
  ],
}

for (const p of STATIC_PAGES.slice(1)) {
  meta[p.key] = {
    title: p.title,
    description: p.description,
    image: `/og/${p.key}.png`,
    type: 'website',
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: p.title, description: p.description, url: `${SITE}${p.path}`, isPartOf: { '@type': 'WebSite', name: 'DocTrim', url: `${SITE}/` } },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: p.title.split(' — ')[0], item: `${SITE}${p.path}` },
        ],
      },
    ],
  }
}

// tools
for (const t of tools) {
  meta[t.slug] = {
    title: toolTitle(t),
    description: toolDesc(t),
    image: `/og/${t.slug}.png`,
    type: 'website',
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: `${t.name} — DocTrim`,
        applicationCategory: 'UtilitiesApplication',
        applicationSubCategory: 'PDF tool',
        operatingSystem: 'Any (web browser)',
        browserRequirements: 'Requires JavaScript',
        url: `${SITE}/${t.slug}`,
        description: toolDesc(t),
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        isAccessibleForFree: true,
        publisher: ORG,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'All PDF tools', item: `${SITE}/pdf-tools` },
          { '@type': 'ListItem', position: 3, name: t.name, item: `${SITE}/${t.slug}` },
        ],
      },
    ],
  }
}

// blog posts
for (const p of posts) {
  meta[`blog/${p.slug}`] = {
    title: `${p.title} — DocTrim Blog`,
    description: p.description,
    image: `/og/blog-${p.slug}.png`,
    type: 'article',
    published: p.date,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: p.title,
        description: p.description,
        datePublished: p.date,
        dateModified: p.date,
        articleSection: p.category,
        image: `${SITE}/og/blog-${p.slug}.png`,
        mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/blog/${p.slug}` },
        author: { '@type': 'Organization', name: 'DocTrim', url: `${SITE}/` },
        publisher: ORG,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog` },
          { '@type': 'ListItem', position: 3, name: p.title, item: `${SITE}/blog/${p.slug}` },
        ],
      },
    ],
  }
}

// ---------------------------------------------------------------- Arabic
const arName = (slug) => arCopy.tools[slug]?.name ?? slug
const arDesc = (slug) => arCopy.tools[slug]?.desc ?? ''

meta['ar'] = {
  title: arCopy.meta['home.title'],
  description: arCopy.meta['home.desc'],
  image: '/og/ar-home.png',
  type: 'website',
  locale: 'ar_AR',
  jsonld: [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'DocTrim',
      url: `${SITE}/ar`,
      inLanguage: 'ar',
      description: arCopy.meta['home.desc'],
      publisher: ORG,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'DocTrim — أدوات PDF بالعربية',
      url: `${SITE}/ar`,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (web browser)',
      inLanguage: 'ar',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      isAccessibleForFree: true,
      publisher: ORG,
    },
  ],
}

const AR_STATIC = [
  {
    key: 'blog',
    title: 'مدونة DocTrim — أدلة PDF بالعربية',
    desc: 'أدلة عملية بالعربية عن حجم ملفات PDF وحجم الصفحات وحدود التعديل والحجب والتوقيع الإلكتروني — مكتوبة من فريق DocTrim.',
    image: '/og/ar-blog.png',
  },
  {
    key: 'about',
    title: 'من نحن — DocTrim',
    desc: 'DocTrim مشروع صغير مستقل يبني أدوات PDF مجانية تحترم الخصوصية وتعمل داخل المتصفح — بدون حساب وبدون تثبيت وبدون اشتراك.',
    image: '/og/ar-about.png',
  },
  {
    key: 'terms',
    title: 'شروط الاستخدام — DocTrim',
    desc: 'الشروط التي تنطبق عند استخدام DocTrim: طبيعة الخدمة، حقوقك على ملفاتك، الاستخدام المقبول، وحدود المسؤولية.',
    image: '/og/ar-terms.png',
  },
  { key: 'pdf-tools', title: arCopy.meta['tools.title'], desc: arCopy.meta['tools.desc'], image: '/og/ar-pdf-tools.png' },
  { key: 'help', title: arCopy.meta['help.title'], desc: arCopy.meta['help.desc'], image: '/og/ar-help.png' },
  { key: 'privacy', title: arCopy.meta['privacy.title'], desc: arCopy.meta['privacy.desc'], image: '/og/ar-privacy.png' },
]
for (const p of AR_STATIC) {
  meta[`ar/${p.key}`] = {
    title: p.title,
    description: p.desc,
    image: p.image,
    type: 'website',
    locale: 'ar_AR',
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: p.title, description: p.desc, url: `${SITE}/ar/${p.key}`, inLanguage: 'ar', isPartOf: { '@type': 'WebSite', name: 'DocTrim', url: `${SITE}/ar` } },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${SITE}/ar` },
          { '@type': 'ListItem', position: 2, name: p.title.split(' — ')[0], item: `${SITE}/ar/${p.key}` },
        ],
      },
    ],
  }
}

for (const t of tools) {
  meta[`ar/${t.slug}`] = {
    title: `${arName(t.slug)} — أداة PDF مجانية أونلاين | DocTrim`,
    description: arDesc(t.slug),
    image: `/og/ar-${t.slug}.png`,
    type: 'website',
    locale: 'ar_AR',
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: `${arName(t.slug)} — DocTrim`,
        applicationCategory: 'UtilitiesApplication',
        applicationSubCategory: 'PDF tool',
        operatingSystem: 'Any (web browser)',
        inLanguage: 'ar',
        url: `${SITE}/ar/${t.slug}`,
        description: arDesc(t.slug),
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        isAccessibleForFree: true,
        publisher: ORG,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${SITE}/ar` },
          { '@type': 'ListItem', position: 2, name: 'كل أدوات PDF', item: `${SITE}/ar/pdf-tools` },
          { '@type': 'ListItem', position: 3, name: arName(t.slug), item: `${SITE}/ar/${t.slug}` },
        ],
      },
    ],
  }
}

// Arabic blog posts
for (const p of postsAr) {
  meta[`ar/blog/${p.slug}`] = {
    title: `${p.title} — مدونة DocTrim`,
    description: p.description,
    image: `/og/ar-blog-${p.slug}.png`,
    type: 'article',
    published: p.date,
    locale: 'ar_AR',
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: p.title,
        description: p.description,
        datePublished: p.date,
        dateModified: p.date,
        inLanguage: 'ar',
        image: `${SITE}/og/ar-blog-${p.slug}.png`,
        mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/ar/blog/${p.slug}` },
        author: { '@type': 'Organization', name: 'DocTrim', url: `${SITE}/` },
        publisher: ORG,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${SITE}/ar` },
          { '@type': 'ListItem', position: 2, name: 'المدونة', item: `${SITE}/ar/blog` },
          { '@type': 'ListItem', position: 3, name: p.title, item: `${SITE}/ar/blog/${p.slug}` },
        ],
      },
    ],
  }
}

// hreflang pairs, both directions
const PAIRS = [
  ['/', '/ar'],
  ['/pdf-tools', '/ar/pdf-tools'],
  ['/help', '/ar/help'],
  ['/privacy', '/ar/privacy'],
  ['/blog', '/ar/blog'],
  ['/about', '/ar/about'],
  ['/terms', '/ar/terms'],
  ...tools.map((t) => [`/${t.slug}`, `/ar/${t.slug}`]),
  ...postsAr.map((p) => [`/blog/${p.slug}`, `/ar/blog/${p.slug}`]),
]
for (const [en, ar] of PAIRS) {
  const enKey = en.replace(/^\//, '')
  const arKey = ar.replace(/^\//, '')
  if (meta[enKey]) meta[enKey].alt = { en, ar }
  if (meta[arKey]) meta[arKey].alt = { en, ar }
}

// ---------------------------------------------------------------- write
const sorted = Object.fromEntries(Object.keys(meta).sort().map((k) => [k, meta[k]]))
const banner = `// GENERATED by scripts/gen-meta.mjs — do not edit by hand.\n// ${Object.keys(sorted).length} routes. Run \`npm run meta\` after changing tools.ts or the blog.\n`
await writeFile(path.join(root, 'functions/_meta.js'), `${banner}export default ${JSON.stringify(sorted, null, 2)}\n`, 'utf8')

const ogData = {
  site: SITE,
  tools: tools.map((t) => ({ slug: t.slug, name: t.name, desc: toolDesc(t), color: t.color })),
  posts: posts.map((p) => ({ slug: p.slug, title: p.title, desc: p.description, category: p.category, tool: p.tool })),
  static: STATIC_PAGES.map((p) => ({ key: p.key, title: p.title.split(' — ')[0], desc: p.description })),
  ar: {
    home: { title: 'أدوات PDF بالعربية.', desc: arCopy.meta['home.desc'] },
    tools: tools.map((t) => ({ slug: t.slug, name: arName(t.slug), desc: arDesc(t.slug), color: t.color })),
    static: AR_STATIC.map((s) => ({ key: s.key, title: s.title.split(' — ')[0], desc: s.desc })),
    posts: postsAr.map((p) => ({ slug: p.slug, title: p.title, desc: p.description })),
  },
}
await writeFile(path.join(root, 'scripts/og-data.json'), `${JSON.stringify(ogData, null, 2)}\n`, 'utf8')

console.log(
  `_meta.js: ${Object.keys(sorted).length} routes (${tools.length} tools, ${posts.length} posts, ${STATIC_PAGES.length} static, ${Object.keys(sorted).filter((k) => k.startsWith('ar')).length} Arabic)`
)
