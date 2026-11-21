import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, Grid3X3, Menu, X } from 'lucide-react'
import Logo from './Logo'
import ToolIcon from './ToolIcon'
import { DIRECTORY, getTool } from '../lib/tools'

const NAV = [
  { label: 'Compress', to: '/compress-pdf' },
  { label: 'Convert', to: '/pdf-to-word' },
  { label: 'Merge', to: '/merge-pdf' },
  { label: 'Edit', to: '/edit-pdf' },
  { label: 'Sign', to: '/sign-pdf' },
  { label: 'AI PDF', to: '/ai-summarizer' },
]

export default function Header() {
  const [toolsOpen, setToolsOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const loc = useLocation()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setToolsOpen(false)
    setMobileOpen(false)
  }, [loc.pathname])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setToolsOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white">
      <div className="container-x flex h-16 items-center gap-6">
        <Link to="/" aria-label="DocTrim home">
          <Logo />
        </Link>

        {/* Tools dropdown */}
        <div className="relative hidden lg:block" ref={ref}>
          <button
            onClick={() => setToolsOpen((v) => !v)}
            className="btn border border-line bg-white px-3 py-2 text-[15px] font-semibold text-ink hover:bg-surface"
          >
            <Grid3X3 size={16} />
            Tools
            <ChevronDown size={14} className={`transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
          </button>
          {toolsOpen && (
            <div className="absolute left-0 top-[calc(100%+8px)] w-[640px] rounded-lg border border-line bg-white p-6 shadow-lift">
              <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                {DIRECTORY.slice(0, 6).map((group) => (
                  <div key={group.title}>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">{group.title}</p>
                    <ul className="space-y-1.5">
                      {group.slugs.slice(0, 5).map((slug) => {
                        const t = getTool(slug)!
                        return (
                          <li key={slug}>
                            <Link to={`/${slug}`} className="flex items-center gap-2 rounded px-1 py-0.5 text-[14px] text-ink-soft hover:text-brand">
                              <ToolIcon icon={t.icon} color={t.color} size={20} radius={5} />
                              {t.name}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
              <Link to="/pdf-tools" className="mt-5 inline-block text-[14px] font-semibold text-brand hover:underline">
                See all PDF tools →
              </Link>
            </div>
          )}
        </div>

        {/* primary nav */}
        <nav className="hidden items-center gap-6 lg:flex">
          {NAV.map((n) => (
            <Link key={n.label} to={n.to} className="nav-link">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-4 lg:flex">
          <a href="/#pricing" className="nav-link">Pricing</a>
          <a href="/#pricing" className="nav-link">Teams</a>
          <a href="/#pricing" className="btn-ghost btn-md">Log In</a>
          <a href="/#pricing" className="btn-primary btn-md">Free Trial</a>
        </div>

        {/* mobile toggle */}
        <button className="ml-auto lg:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* mobile menu */}
      {mobileOpen && (
        <div className="border-t border-line bg-white lg:hidden">
          <div className="container-x flex flex-col gap-1 py-4">
            {NAV.map((n) => (
              <Link key={n.label} to={n.to} className="rounded px-2 py-2 text-[15px] font-semibold text-ink-soft hover:bg-surface">
                {n.label}
              </Link>
            ))}
            <Link to="/pdf-tools" className="rounded px-2 py-2 text-[15px] font-semibold text-brand">All PDF tools</Link>
            <div className="mt-2 flex gap-3 px-2">
              <a href="/#pricing" className="btn-ghost btn-md flex-1">Log In</a>
              <a href="/#pricing" className="btn-primary btn-md flex-1">Free Trial</a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
