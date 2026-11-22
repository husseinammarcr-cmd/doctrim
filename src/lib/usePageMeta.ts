import { useEffect } from 'react'

/* Every mounted page claims the title with a token; a page only restores the
 * previous title if no newer page has claimed it since. Without this, a route
 * change can leave the outgoing page's title behind. */
let metaToken = 0

/** Sets the document title and meta description for a page, and restores them on unmount. */
export function usePageMeta(title: string, description?: string) {
  const token = ++metaToken

  useEffect(() => {
    if (!title) return
    const prevTitle = document.title
    document.title = title

    const tag = document.querySelector('meta[name="description"]')
    const prevDesc = tag?.getAttribute('content') ?? undefined
    if (description && tag) tag.setAttribute('content', description)

    return () => {
      if (token !== metaToken) return
      document.title = prevTitle
      if (description && tag && prevDesc !== undefined) tag.setAttribute('content', prevDesc)
    }
    // token is intentionally read at mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description])
}
