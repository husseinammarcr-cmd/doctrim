import { marked } from 'marked'

export interface TocItem {
  id: string
  title: string
  level: 2 | 3
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'section'
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

/**
 * Renders a post body to HTML with stable heading ids, then pulls the table of
 * contents out of the same pass so the TOC can never drift from the article.
 */
export function renderMarkdown(markdown: string): { html: string; toc: TocItem[] } {
  const seen = new Map<string, number>()

  const renderer = {
    // h1 is reserved for the page title, so a stray `#` becomes an h2
    heading(text: string, level: number, raw: string): string {
      const depth = level === 1 ? 2 : level > 3 ? 3 : level
      const base = slugify(raw.replace(/[*_`]/g, ''))
      const n = (seen.get(base) ?? 0) + 1
      seen.set(base, n)
      const id = n === 1 ? base : `${base}-${n}`
      return `<h${depth} id="${id}">${text}</h${depth}>\n`
    },
    link(href: string, title: string | null | undefined, text: string): string {
      const external = /^https?:\/\//i.test(href)
      const attrs = [
        `href="${escapeHtml(href)}"`,
        title ? `title="${escapeHtml(title)}"` : '',
        external ? 'target="_blank" rel="noopener noreferrer"' : '',
      ]
        .filter(Boolean)
        .join(' ')
      return `<a ${attrs}>${text}</a>`
    },
    image(href: string, title: string | null, text: string): string {
      return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text || '')}"${
        title ? ` title="${escapeHtml(title)}"` : ''
      } loading="lazy" />`
    },
  }

  marked.use({ renderer, gfm: true, breaks: false })
  const html = marked.parse(markdown, { async: false }) as string

  const toc: TocItem[] = []
  const re = /<h([23]) id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const title = decodeEntities(
      m[3]
        .replace(/<[^>]+>/g, '')
        .trim()
    )
    toc.push({ level: Number(m[1]) as 2 | 3, id: m[2], title })
  }

  return { html, toc }
}
