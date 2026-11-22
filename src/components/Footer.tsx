import { Link } from 'react-router-dom'
import { Linkedin, Facebook, Youtube, Twitter } from 'lucide-react'
import Logo from './Logo'
import { useI18n } from '../i18n'
import { getTool } from '../lib/tools'

export default function Footer() {
  const { t, isAr, toolName, href } = useI18n()

  const cols: { title: string; links: { label: string; to: string }[] }[] = [
    {
      title: t('footer.popular', 'Popular Tools'),
      links: ['compress-pdf', 'merge-pdf', 'split-pdf', 'sign-pdf'].map((slug) => {
        const tool = getTool(slug)!
        return { label: toolName(tool), to: `/${slug}` }
      }),
    },
    {
      title: t('footer.company', 'Company'),
      links: isAr
        ? [
            { label: t('footer.help', 'Help'), to: '/help' },
            { label: t('footer.privacy', 'Privacy'), to: '/privacy' },
            { label: 'English site', to: '/about' },
          ]
        : [
            { label: t('footer.about', 'About'), to: '/about' },
            { label: 'Blog & Guides', to: '/blog' },
            { label: t('footer.help', 'Help Center'), to: '/help' },
            { label: t('footer.privacy', 'Privacy Policy'), to: '/privacy' },
            { label: t('footer.terms', 'Terms of Service'), to: '/terms' },
          ],
    },
    {
      title: t('footer.product', 'Product'),
      links: [
        { label: t('nav.allTools', 'All PDF Tools'), to: '/pdf-tools' },
        { label: isAr ? 'مجاني بدون تسجيل' : 'Free — No Sign-Up', to: isAr ? '/' : '/#free' },
      ],
    },
  ]

  return (
    <footer className="border-t border-line bg-white">
      <div className="container-x py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 text-[15px] text-ink-soft">{t('footer.tagline', 'We make PDF easy.')}</p>
            <p className="mt-2 text-[13px] text-ink-muted">{t('footer.note', 'Free forever. No account, no subscription.')}</p>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <p className="mb-3 text-[15px] font-bold text-ink">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={href(l.to)} className="text-[14px] text-ink-soft hover:text-brand">
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
          <p className="text-[13px] text-ink-muted">
            © {new Date().getFullYear()} DocTrim. {t('footer.rights', 'All rights reserved.')}
          </p>
          <span
            title="Coming soon"
            className="btn cursor-not-allowed select-none bg-ink/10 px-4 py-2 text-[14px] text-ink-muted"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M0 2.3 6.5 1.4v6.1H0V2.3zm7.5-1L16 0v7.5H7.5V1.3zM0 8.5h6.5v6.1L0 13.7V8.5zm7.5 0H16V16l-8.5-1.2V8.5z" />
            </svg>
            {isAr ? 'تطبيق ويندوز — قريباً' : 'Windows app — coming soon'}
          </span>
        </div>
      </div>
    </footer>
  )
}
