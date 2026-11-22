import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Mail, Search, X } from 'lucide-react'
import { usePageMeta } from '../lib/usePageMeta'

const SUPPORT_EMAIL = 'Support@doctrim.com'

type Faq = { q: string; a: string }
type Group = { title: string; items: Faq[] }

const GROUPS: Group[] = [
  {
    title: 'Getting started',
    items: [
      {
        q: 'Do I need an account to use DocTrim?',
        a: 'No. There is no sign-up, no email verification, and no login anywhere on the site. Open the tool you need, add your file, and download the result.',
      },
      {
        q: 'How do I use a tool?',
        a: 'Every tool follows the same three steps: choose your file (drag and drop or click to browse), adjust the options on the page, then press the action button. The processed file downloads to your device automatically.',
      },
      {
        q: 'Which tools work entirely in my browser?',
        a: 'Merge, Split, Rotate, Organize, Delete pages, Extract pages, JPG to PDF, PNG to PDF, PDF to JPG, PDF to PNG, Compress, Crop, Watermark, Number pages, Sign and PDF Reader all run locally on your device. No upload happens.',
      },
      {
        q: 'Some tools say “coming soon”. When will they be ready?',
        a: 'Conversion to and from Office formats, OCR, and password protection all need work on our servers rather than your browser. They are being rolled out one at a time, and each one goes live the moment it is tested. There is nothing you need to do — no waitlist, no sign-up.',
      },
    ],
  },
  {
    title: 'Privacy and security',
    items: [
      {
        q: 'Where are my files processed?',
        a: 'For browser tools, inside your own browser, in memory. Your PDF is opened with pdf.js or pdf-lib, modified on your device, and saved straight back to your downloads folder. Nothing is transmitted.',
      },
      {
        q: 'Do you keep a copy of my documents?',
        a: 'No. We have no document storage, no history, and no “recent files”. When you close the tab, the file is gone from memory.',
      },
      {
        q: 'Can I use DocTrim for confidential documents?',
        a: 'For the browser-based tools, yes — the file never leaves your computer, which is the same trust level as opening it in a desktop PDF app. For the few server-backed tools, the file is deleted immediately after processing and is never retained.',
      },
      {
        q: 'Do you track me or sell my data?',
        a: 'We do not sell data and we do not build profiles of users. The site needs no account, so there is no personal data to attach to a file in the first place. Advertising on the site is what keeps it free; ad networks may set their own cookies, which you can block in your browser settings without breaking any tool.',
      },
    ],
  },
  {
    title: 'Files and limits',
    items: [
      {
        q: 'Is there a maximum file size?',
        a: 'We do not impose a fixed limit. Browser tools are limited by your device’s available memory — most laptops handle files up to roughly 100–200 MB comfortably. Very large or image-heavy PDFs may take longer, so keep the tab open until the download starts.',
      },
      {
        q: 'Can I process more than one file at once?',
        a: 'Yes, for Merge, JPG to PDF, PNG to PDF, and the image conversion tools. Add as many files as you need and reorder them before you run the tool.',
      },
      {
        q: 'Will my PDF have a watermark?',
        a: 'No. There is no DocTrim watermark, no page limit, and no “upgrade to remove” step. What you see in the preview is exactly what you download.',
      },
      {
        q: 'What happens to the original file?',
        a: 'It stays untouched on your device. DocTrim writes a new file next to it, usually with the original name plus a short suffix such as “-merged” or “-compressed”.',
      },
    ],
  },
  {
    title: 'Troubleshooting',
    items: [
      {
        q: 'I dropped a file and nothing happened.',
        a: 'Make sure the file type matches the tool (for example, a .pdf for Merge). Then try a current version of Chrome, Edge, Firefox or Safari, and disable extensions that block scripts on the page. Private/incognito mode works too.',
      },
      {
        q: 'My PDF asks for a password and won’t open.',
        a: 'Encrypted PDFs have to be unlocked before most tools can read them. A password-removal tool is on the way; until then, open the file once in a PDF reader with the password, export an unlocked copy, and use that with DocTrim.',
      },
      {
        q: 'The download did not start.',
        a: 'Check whether your browser blocked the download (look for a blocked-download icon in the address bar). Also make sure a previous download of the same name is not still in progress, and that your Downloads folder is writable.',
      },
      {
        q: 'The result looks different from the original.',
        a: 'This is almost always fonts: if a font is not embedded in the PDF, the browser substitutes its own. Watermark and page-number tools let you pick a standard font to keep rendering predictable.',
      },
    ],
  },
  {
    title: 'Cost and advertising',
    items: [
      {
        q: 'Is DocTrim really free?',
        a: 'Yes. Every tool on the site is free to use, with no trial period, no credit card field, and no feature locked behind an account. The site is paid for by advertising.',
      },
      {
        q: 'Do the ads see my files?',
        a: 'No. Ads are loaded as ordinary web page content and have no access to the files you drop into a tool. Browser tools never send your document anywhere.',
      },
      {
        q: 'Can I remove the ads?',
        a: 'Not at the moment — there is no paid tier to buy. You can block ads with your own browser or extension; every tool keeps working normally.',
      },
      {
        q: 'Will there ever be a paid version?',
        a: 'There is no paid plan today, and the tools that exist now will not be moved behind one. If a future feature is expensive to run, it would be offered separately rather than taking anything away from the free toolkit.',
      },
    ],
  },
]

const ALL_ITEMS = GROUPS.flatMap((g) => g.items)

export default function Help() {
  usePageMeta(
    'Help Center — DocTrim',
    'Answers to common questions about DocTrim: how tools work, where your files are processed, file limits, troubleshooting, and how the site stays free.'
  )
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})

  // FAQ structured data for search engines
  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: ALL_ITEMS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    })
    document.head.appendChild(script)
    return () => {
      document.head.removeChild(script)
    }
  }, [])

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!q) return GROUPS
    return GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((f) => (f.q + ' ' + f.a).toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0)
  }, [q])

  const matches = filtered.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="bg-white">
      {/* Hero + search */}
      <section className="border-b border-line bg-surface">
        <div className="container-x py-14 lg:py-20">
          <div className="max-w-[720px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-bold uppercase tracking-wide text-brand">
              Help Center
            </span>
            <h1 className="h-display mt-5 text-4xl leading-tight lg:text-5xl">How can we help?</h1>
            <p className="mt-3 text-lg text-ink-soft">
              Short answers about the tools, your files, and how DocTrim stays free.
            </p>

            <div className="relative mt-7 max-w-[560px]">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                inputMode="search"
                placeholder="Search the help center — try “password”, “size”, “watermark”"
                role="searchbox"
                aria-label="Search help articles"
                className="w-full rounded-lg border border-line bg-white py-3.5 pl-11 pr-11 text-[15px] text-ink shadow-sm outline-none placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-ink"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {q && (
              <p className="mt-3 text-[13px] text-ink-muted" aria-live="polite">
                {matches === 0 ? 'No results' : `${matches} ${matches === 1 ? 'answer' : 'answers'} found`}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* FAQ groups */}
      <section className="container-x py-14">
        {filtered.length === 0 ? (
          <div className="mx-auto max-w-[560px] rounded-lg border border-line bg-surface px-6 py-12 text-center">
            <p className="text-lg font-bold text-ink">Nothing matched “{query}”.</p>
            <p className="mt-2 text-[15px] text-ink-soft">
              Try a shorter word, or email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-brand hover:underline">
                {SUPPORT_EMAIL}
              </a>{' '}
              and we will answer directly.
            </p>
          </div>
        ) : (
          <div className="grid gap-12 lg:grid-cols-[220px_1fr] lg:gap-16">
            {/* Side nav */}
            <nav className="hidden lg:block">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">Topics</p>
              <ul className="space-y-1">
                {GROUPS.map((g, i) => (
                  <li key={g.title}>
                    <a
                      href={`#topic-${i}`}
                      className="block rounded px-2 py-1.5 text-[14px] font-semibold text-ink-soft hover:bg-surface hover:text-brand"
                    >
                      {g.title}
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href="#contact"
                    className="block rounded px-2 py-1.5 text-[14px] font-semibold text-brand hover:bg-surface"
                  >
                    Contact us
                  </a>
                </li>
              </ul>
            </nav>

            <div className="space-y-12">
              {filtered.map((group) => (
                <div key={group.title} id={`topic-${GROUPS.findIndex((g) => g.title === group.title)}`} className="scroll-mt-24">
                  <h2 className="h-display text-2xl">{group.title}</h2>
                  <div className="mt-4 divide-y divide-line border-y border-line">
                    {group.items.map((item) => {
                      const key = item.q
                      const isOpen = open[key] ?? Boolean(q)
                      return (
                        <div key={item.q}>
                          <button
                            onClick={() => setOpen((o) => ({ ...o, [key]: !isOpen }))}
                            aria-expanded={isOpen}
                            className="flex w-full items-start justify-between gap-4 py-4 text-left"
                          >
                            <span className="text-[16px] font-semibold text-ink">{item.q}</span>
                            <ChevronDown
                              size={18}
                              className={`mt-0.5 shrink-0 text-ink-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            />
                          </button>
                          {isOpen && (
                            <p className="-mt-1 pb-5 pr-8 text-[15px] leading-relaxed text-ink-soft">{item.a}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-24 border-t border-line bg-surface">
        <div className="container-x flex flex-col items-start justify-between gap-6 py-12 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-ink">Still need help?</h2>
            <p className="mt-1 max-w-[560px] text-[15px] text-ink-soft">
              Email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-brand hover:underline">
                {SUPPORT_EMAIL}
              </a>{' '}
              with your question, the tool you used, and — if a file failed — its size and type. We
              read every message and usually reply within two business days.
            </p>
          </div>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="btn-primary btn-md shrink-0">
            <Mail size={16} /> Email support
          </a>
        </div>
        <div className="container-x pb-12">
          <p className="text-[13px] text-ink-muted">
            Looking for a tool instead?{' '}
            <Link to="/pdf-tools" className="font-semibold text-brand hover:underline">
              Browse all PDF tools
            </Link>{' '}
            or read{' '}
            <Link to="/about" className="font-semibold text-brand hover:underline">
              about DocTrim
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  )
}
