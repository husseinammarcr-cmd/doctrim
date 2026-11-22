/**
 * Two locales, one app.
 *
 * English stays at `/`, Arabic lives under `/ar`. Nothing is machine-translated
 * at runtime: Arabic copy is static in `ar.json` and every Arabic URL has its
 * own title, description and share card (see scripts/gen-meta.mjs), which is
 * what makes the Arabic pages rank for Arabic searches.
 *
 * Which locale you get on the bare domain is decided once, on the client:
 *  1. `?lang=ar` / `?lang=en` always win and are remembered.
 *  2. A remembered choice wins from then on.
 *  3. Otherwise the browser's language list decides (ar* → /ar).
 * Crawlers never see the redirect because it is client-side and only on `/`.
 */
import { createContext, useContext, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ar from './ar.json'
import type { Tool } from '../lib/tools'

export type Locale = 'en' | 'ar'

export const LOCALE_KEY = 'dt_lang'

const LocaleCtx = createContext<Locale>('en')

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleCtx.Provider value={locale}>{children}</LocaleCtx.Provider>
}

export const useLocale = (): Locale => useContext(LocaleCtx)

/** Splits a pathname into its locale and the locale-independent path. */
export function splitLocale(pathname: string): { locale: Locale; sub: string } {
  if (pathname === '/ar' || pathname.startsWith('/ar/')) {
    const sub = pathname.slice(3) || '/'
    return { locale: 'ar', sub }
  }
  return { locale: 'en', sub: pathname || '/' }
}

/** Builds the URL for `sub` in `locale` (`/` -> `/` or `/ar`). */
export function localeHref(locale: Locale, sub: string): string {
  const p = sub.startsWith('/') ? sub : `/${sub}`
  if (locale === 'en') return p
  return p === '/' ? '/ar' : `/ar${p}`
}

const arUi = ar.ui as Record<string, string>
const arTools = ar.tools as Record<string, { name: string; desc: string }>
const arCats = ar.categories as Record<string, string>

export interface I18n {
  locale: Locale
  isAr: boolean
  /** Arabic string for `key`, or `en` when the locale is English / the key is missing. */
  t: (key: string, en: string, vars?: Record<string, string | number>) => string
  toolName: (tool: Tool) => string
  toolDesc: (tool: Tool) => string
  category: (title: string) => string
  /** Locale-aware link target for a locale-independent path. */
  href: (sub: string) => string
}

export function useI18n(): I18n {
  const locale = useLocale()
  const isAr = locale === 'ar'
  return {
    locale,
    isAr,
    t: (key, en, vars) => {
      let out = isAr ? arUi[key] ?? en : en
      if (vars) for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, String(v))
      return out
    },
    toolName: (tool) => (isAr ? arTools[tool.slug]?.name ?? tool.name : tool.name),
    toolDesc: (tool) => (isAr ? arTools[tool.slug]?.desc ?? tool.desc : tool.desc),
    category: (title) => (isAr ? arCats[title] ?? title : title),
    href: (sub) => localeHref(locale, sub),
  }
}

/** Sets dir/lang on <html> for the active locale. */
export function LocaleFrame({ locale }: { locale: Locale }) {
  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
    html.setAttribute('lang', locale === 'ar' ? 'ar' : 'en')
    return () => {
      html.setAttribute('dir', 'ltr')
      html.setAttribute('lang', 'en')
    }
  }, [locale])
  return null
}

function browserWantsArabic(): boolean {
  const list = navigator.languages?.length ? navigator.languages : [navigator.language || '']
  return list.some((l) => String(l).toLowerCase().startsWith('ar'))
}

/** First-visit language choice. Runs once per mount, only on a bare entry path. */
export function useAutoLocale(): void {
  const navigate = useNavigate()
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(LOCALE_KEY)
    } catch {
      /* private mode */
    }

    const q = new URLSearchParams(search).get('lang')
    if (q === 'ar' || q === 'en') {
      try {
        localStorage.setItem(LOCALE_KEY, q)
      } catch {
        /* ignore */
      }
      const target = localeHref(q, '/')
      if (q === 'ar' && !pathname.startsWith('/ar')) navigate(`${target}${hash}`, { replace: true })
      if (q === 'en' && pathname.startsWith('/ar')) navigate(`${localeHref('en', pathname.slice(3) || '/')}${hash}`, { replace: true })
      return
    }

    // explicit choice from a previous visit: honour it on the root only
    if (stored === 'ar' && pathname === '/') {
      navigate(`/ar${hash}`, { replace: true })
      return
    }
    if (stored === 'en' || stored) return

    if (pathname === '/' && browserWantsArabic()) {
      try {
        localStorage.setItem(LOCALE_KEY, 'ar')
      } catch {
        /* ignore */
      }
      navigate(`/ar${hash}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/** Persists an explicit switch (used by the header toggle). */
export function rememberLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    /* ignore */
  }
}
