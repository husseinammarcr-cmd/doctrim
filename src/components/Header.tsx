import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Gift, Grid3X3, Menu, X } from 'lucide-react'
import Logo from './Logo'
import ToolIcon from './ToolIcon'
import { DIRECTORY, getTool } from '../lib/tools'
import { EASE_IN, EASE_OUT } from '../lib/motion'

const NAV = [
  { label: 'Compress', to: '/compress-pdf' },
  { label: 'Convert', to: '/pdf-to-word' },
  { label: 'Merge', to: '/merge-pdf' },
  { label: 'Edit', to: '/edit-pdf' },
  { label: 'Sign', to: '/sign-pdf' },
  { label: 'Blog', to: '/blog' },
]

export default function Header() {
  const [toolsOpen, setToolsOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const loc = useLocation()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setToolsOpen(false)
    setMobileOpen(false)
  }, [loc.pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setToolsOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? 'border-line/80 bg-white/85 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.45)] backdrop-blur-md'
          : 'border-line bg-white'
      }`}
    >
      <div className="container-x flex h-16 items-center gap-6">
        <Link to="/" aria-label="DocTrim home" className="dt-logo">
          <Logo />
        </Link>

        {/* Tools dropdown */}
        <div className="relative hidden lg:block" ref={ref}>
          <button
            onClick={() => setToolsOpen((v) => !v)}
            aria-expanded={toolsOpen}
            className="btn border border-line bg-white px-3 py-2 text-[15px] font-semibold text-ink hover:bg-surface"
          >
            <Grid3X3 size={16} />
            Tools
            <motion.span animate={{ rotate: toolsOpen ? 180 : 0 }} transition={{ duration: 0.25, ease: EASE_OUT }}>
              <ChevronDown size={14} />
            </motion.span>
          </button>
          <AnimatePresence>
            {toolsOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.99, transition: { duration: 0.14, ease: EASE_IN } }}
                transition={{ duration: 0.22, ease: EASE_OUT }}
                style={{ transformOrigin: 'top left' }}
                className="absolute left-0 top-[calc(100%+8px)] w-[640px] rounded-lg border border-line bg-white p-6 shadow-lift"
              >
                <motion.div
                  variants={{ show: { transition: { staggerChildren: 0.03, delayChildren: 0.04 } } }}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-3 gap-x-6 gap-y-5"
                >
                  {DIRECTORY.slice(0, 6).map((group) => (
                    <motion.div
                      key={group.title}
                      variants={{
                        hidden: { opacity: 0, y: 6 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.24, ease: EASE_OUT } },
                      }}
                    >
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">{group.title}</p>
                      <ul className="space-y-1.5">
                        {group.slugs.slice(0, 5).map((slug) => {
                          const t = getTool(slug)!
                          return (
                            <li key={slug}>
                              <Link to={`/${slug}`} className="dt-drop-link flex items-center gap-2 rounded px-1 py-0.5 text-[14px] text-ink-soft hover:text-brand">
                                <ToolIcon icon={t.icon} color={t.color} size={20} radius={5} />
                                {t.name}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </motion.div>
                  ))}
                </motion.div>
                <Link to="/pdf-tools" className="mt-5 inline-block text-[14px] font-semibold text-brand hover:underline">
                  See all PDF tools →
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* primary nav */}
        <nav className="hidden items-center gap-5 lg:flex xl:gap-6">
          {NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              className={`nav-link ${
                loc.pathname === n.to || (n.to === '/blog' && loc.pathname.startsWith('/blog'))
                  ? 'nav-link-active'
                  : ''
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 lg:flex xl:gap-4">
          <span className="hidden items-center gap-1.5 rounded-full bg-brand-light px-3 py-1.5 text-[13px] font-bold text-brand xl:inline-flex">
            <Gift size={14} /> 100% Free
          </span>
          <Link to="/pdf-tools" className="btn-primary btn-md">
            All PDF Tools
          </Link>
        </div>

        {/* mobile toggle */}
        <button className="ml-auto lg:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={mobileOpen ? 'close' : 'open'}
              initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className="block"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      {/* route-change sweep: a thin brand line that runs under the header on navigation */}
      <motion.div
        key={loc.key}
        initial={{ scaleX: 0, opacity: 1 }}
        animate={{ scaleX: 1, opacity: 0 }}
        transition={{ scaleX: { duration: 0.75, ease: EASE_OUT }, opacity: { delay: 0.3, duration: 0.45 } }}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gradient-to-r from-brand via-accent-cyan to-brand"
      />

      {/* mobile menu */}
      <AnimatePresence initial={false}>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { height: { duration: 0.34, ease: EASE_OUT }, opacity: { duration: 0.2 } } }}
            exit={{ height: 0, opacity: 0, transition: { height: { duration: 0.26, ease: EASE_IN }, opacity: { duration: 0.16 } } }}
            className="overflow-hidden border-t border-line bg-white lg:hidden"
          >
            <motion.div
              variants={{ show: { transition: { staggerChildren: 0.035, delayChildren: 0.08 } } }}
              initial="hidden"
              animate="show"
              className="container-x flex flex-col gap-1 py-4"
            >
              {NAV.map((n) => (
                <motion.div
                  key={n.label}
                  variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: EASE_OUT } } }}
                >
                  <Link to={n.to} className="block rounded px-2 py-2 text-[15px] font-semibold text-ink-soft hover:bg-surface">
                    {n.label}
                  </Link>
                </motion.div>
              ))}
              <Link to="/pdf-tools" className="rounded px-2 py-2 text-[15px] font-semibold text-brand">All PDF tools</Link>
              <div className="mt-1 flex items-center gap-4 border-t border-line px-2 pt-3 text-[14px] font-semibold text-ink-soft">
                <Link to="/about" className="hover:text-brand">About</Link>
                <Link to="/help" className="hover:text-brand">Help</Link>
                <Link to="/blog" className="hover:text-brand">Blog</Link>
              </div>
              <div className="mt-2 px-2">
                <Link to="/pdf-tools" className="btn-primary btn-md w-full">
                  All PDF Tools — Free
                </Link>
                <p className="mt-2 text-center text-[13px] text-ink-muted">No account needed</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
