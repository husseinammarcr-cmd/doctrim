import { useEffect } from 'react'

/** Sets the document title and meta description for a page, and restores them on unmount. */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title

    const tag = document.querySelector('meta[name="description"]')
    const prevDesc = tag?.getAttribute('content') ?? undefined
    if (description && tag) tag.setAttribute('content', description)

    return () => {
      document.title = prevTitle
      if (description && tag && prevDesc !== undefined) tag.setAttribute('content', prevDesc)
    }
  }, [title, description])
}
