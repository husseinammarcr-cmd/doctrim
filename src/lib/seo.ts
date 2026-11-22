import { useEffect } from 'react'

export const SITE_URL = 'https://doctrim.pages.dev'

/** Points the canonical URL at this page for as long as it is mounted. */
export function useCanonical(path: string) {
  useEffect(() => {
    let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    const created = !el
    if (!el) {
      el = document.createElement('link')
      el.rel = 'canonical'
      document.head.appendChild(el)
    }
    const prev = el.getAttribute('href')
    el.setAttribute('href', `${SITE_URL}${path}`)
    return () => {
      if (created) el!.remove()
      else if (prev) el!.setAttribute('href', prev)
    }
  }, [path])
}

/** Injects JSON-LD structured data while the page is mounted, and removes it on unmount. */
export function useJsonLd(data: object | object[]) {
  const key = JSON.stringify(data)
  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = key
    document.head.appendChild(script)
    return () => {
      script.remove()
    }
  }, [key])
}
