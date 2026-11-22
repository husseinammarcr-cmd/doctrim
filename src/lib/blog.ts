/**
 * Blog content loader.
 *
 * Posts live as Markdown files in `src/content/blog/*.md` with a small YAML
 * frontmatter block. Vite inlines them at build time with `import.meta.glob`,
 * so there is no CMS, no API and no network request at runtime.
 */

export type PostCategory = 'How-to' | 'Guides' | 'Privacy' | 'Standards'

export interface PostMeta {
  slug: string
  title: string
  description: string
  /** ISO date, `YYYY-MM-DD` */
  date: string
  category: PostCategory
  tags: string[]
  /** slug of the DocTrim tool the article is about */
  tool?: string
  featured?: boolean
  /** estimated reading time in minutes */
  minutes: number
}

export interface Post extends PostMeta {
  /** raw markdown body (frontmatter stripped) */
  body: string
}

const FILES = import.meta.glob('../content/blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/* ----------------------------- frontmatter ----------------------------- */

type Front = Record<string, string | string[] | boolean>

function unquote(v: string): string {
  const t = v.trim()
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1)
  }
  return t
}

function parseFrontmatter(src: string): { data: Front; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(src)
  if (!m) return { data: {}, body: src }

  const data: Front = {}
  let listKey: string | null = null

  for (const rawLine of m[1].split(/\r?\n/)) {
    const line = rawLine.replace(/\t/g, '  ')
    if (!line.trim() || line.trim().startsWith('#')) continue

    // `  - item` continuation of a block list
    const item = /^\s*-\s+(.*)$/.exec(line)
    if (item && listKey) {
      const arr = Array.isArray(data[listKey]) ? (data[listKey] as string[]) : []
      arr.push(unquote(item[1]))
      data[listKey] = arr
      continue
    }

    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line)
    if (!kv) continue
    const [, key, rest] = kv
    const value = rest.trim()

    if (value === '') {
      // start of a block list
      data[key] = []
      listKey = key
      continue
    }
    listKey = null

    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((s) => unquote(s))
        .filter(Boolean)
    } else if (value === 'true' || value === 'false') {
      data[key] = value === 'true'
    } else {
      data[key] = unquote(value)
    }
  }

  return { data, body: src.slice(m[0].length) }
}

/* ------------------------------- helpers ------------------------------- */

export function readingMinutes(markdown: string): number {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~\-|]/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const CATEGORY_COLORS: Record<string, string> = {
  'How-to': '#0055FF',
  Guides: '#00D267',
  Privacy: '#8B48FE',
  Standards: '#FF8E00',
}

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? '#0055FF'
}

/* -------------------------------- loading ------------------------------ */

function toPost(path: string, raw: string): Post {
  const { data, body } = parseFrontmatter(raw)
  const slug = path.split('/').pop()!.replace(/\.md$/, '')
  const title = String(data.title ?? slug)
  return {
    slug,
    title,
    description: String(data.description ?? ''),
    date: String(data.date ?? '1970-01-01'),
    category: (data.category as PostCategory) ?? 'Guides',
    tags: Array.isArray(data.tags) ? data.tags : [],
    tool: data.tool ? String(data.tool) : undefined,
    featured: data.featured === true,
    minutes: readingMinutes(body),
    body,
  }
}

export const POSTS: Post[] = Object.entries(FILES)
  .map(([path, raw]) => toPost(path, raw))
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)))

export const CATEGORIES: string[] = Array.from(new Set(POSTS.map((p) => p.category))).sort()

export function getPost(slug: string | undefined): Post | undefined {
  if (!slug) return undefined
  return POSTS.find((p) => p.slug === slug)
}

/** Newest first, same category or sharing a tool first, then the rest. */
export function relatedPosts(post: Post, count = 3): Post[] {
  const score = (p: Post) =>
    (p.tool && p.tool === post.tool ? 2 : 0) + (p.category === post.category ? 1 : 0)
  return POSTS.filter((p) => p.slug !== post.slug)
    .map((p) => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s || (a.p.date < b.p.date ? 1 : -1))
    .slice(0, count)
    .map(({ p }) => p)
}

/** Previous (older) and next (newer) post in publication order. */
export function adjacentPosts(post: Post): { newer?: Post; older?: Post } {
  const i = POSTS.findIndex((p) => p.slug === post.slug)
  return { newer: POSTS[i - 1], older: POSTS[i + 1] }
}
