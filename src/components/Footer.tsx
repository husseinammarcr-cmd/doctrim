import { Link } from 'react-router-dom'
import { Linkedin, Facebook, Youtube, Twitter } from 'lucide-react'
import Logo from './Logo'

const COLS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: 'Solutions',
    links: [
      { label: 'Sales', to: '/#pricing' },
      { label: 'Finance', to: '/#pricing' },
      { label: 'Real Estate', to: '/#pricing' },
      { label: 'Education', to: '/#pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/' },
      { label: 'Help', to: '/' },
      { label: 'Blog', to: '/' },
      { label: 'Careers', to: '/' },
      { label: 'PDF Statistics', to: '/' },
    ],
  },
  {
    title: 'Product',
    links: [
      { label: 'Pricing', to: '/#pricing' },
      { label: 'Teams', to: '/#pricing' },
      { label: 'All PDF Tools', to: '/pdf-tools' },
      { label: 'Developers', to: '/' },
      { label: 'Security', to: '/#trust' },
    ],
  },
  {
    title: 'Apps',
    links: [
      { label: 'Download DocTrim', to: '/#mobile' },
      { label: 'PDF Scanner', to: '/#mobile' },
      { label: 'Windows App', to: '/#mobile' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="container-x py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 text-[15px] text-ink-soft">We make PDF easy.</p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <p className="mb-3 text-[15px] font-bold text-ink">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-[14px] text-ink-soft hover:text-brand">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-line pt-6 sm:flex-row">
          <div className="flex items-center gap-4 text-ink">
            <a href="#" aria-label="LinkedIn" className="hover:text-brand"><Linkedin size={18} /></a>
            <a href="#" aria-label="Facebook" className="hover:text-brand"><Facebook size={18} /></a>
            <a href="#" aria-label="YouTube" className="hover:text-brand"><Youtube size={18} /></a>
            <a href="#" aria-label="X" className="hover:text-brand"><Twitter size={18} /></a>
          </div>
          <p className="text-[13px] text-ink-muted">© {new Date().getFullYear()} DocTrim. All rights reserved.</p>
          <a href="/#mobile" className="btn bg-ink px-4 py-2 text-[14px] text-white hover:bg-black">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M0 2.3 6.5 1.4v6.1H0V2.3zm7.5-1L16 0v7.5H7.5V1.3zM0 8.5h6.5v6.1L0 13.7V8.5zm7.5 0H16V16l-8.5-1.2V8.5z" />
            </svg>
            Download for Windows
          </a>
        </div>
      </div>
    </footer>
  )
}
