import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Wallet, Zap, Mail, Sparkles } from 'lucide-react'
import { usePageMeta } from '../lib/usePageMeta'
import { TOOLS } from '../lib/tools'

const PRINCIPLES = [
  {
    icon: ShieldCheck,
    color: '#00D267',
    title: 'Privacy by default',
    body: 'Most DocTrim tools run entirely in your browser using pdf-lib and pdf.js. Your file is read from your device and written back to your device — it never touches a server. The ten conversion, OCR and protection tools use our own server instead, and delete the file the moment the job finishes.',
  },
  {
    icon: Zap,
    color: '#8B48FE',
    title: 'No account, ever',
    body: 'No sign-up, no email, no “free trial” that expires. Open a tool, drop your file, download the result. That is the whole flow.',
  },
  {
    icon: Wallet,
    color: '#FF8E00',
    title: 'Free, supported by ads',
    body: 'DocTrim is free and stays free. Light advertising covers the cost of running the site, so we never have to put basic PDF tasks behind a paywall.',
  },
  {
    icon: Sparkles,
    color: '#0055FF',
    title: 'Simple by design',
    body: 'One page per task, sensible defaults, no settings you do not need. If a tool takes more than a few seconds to understand, we have not finished building it.',
  },
]

const STEPS = [
  { n: '01', title: 'Pick a tool', body: 'Compress, merge, convert, sign — every task has its own page with just the options that matter.' },
  { n: '02', title: 'Add your file', body: 'Drag it in or browse. For browser tools, the file is processed on your device, not uploaded.' },
  { n: '03', title: 'Download the result', body: 'Preview the output, then save it. No watermark, no queue, no “upgrade to download”.' },
]

export default function About() {
  usePageMeta(
    'About DocTrim — We make PDF easy',
    'DocTrim is a small independent project building a free, privacy-friendly PDF toolkit where most tools run in your browser. No account, no installs, no paywalls.'
  )

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="border-b border-line bg-surface">
        <div className="container-x py-16 lg:py-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-bold uppercase tracking-wide text-brand">
                About DocTrim
              </span>
              <h1 className="h-display mt-5 text-5xl leading-[1.05] lg:text-6xl">
                We make PDF <span className="text-brand">easy.</span>
              </h1>
              <p className="mt-5 max-w-[620px] text-lg leading-relaxed text-ink-soft">
                DocTrim is a small, independent project with one job: give everyone a fast, honest
                PDF toolkit that works right in the browser — no account, no installs, no paywall
                between you and your own document.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/pdf-tools" className="btn-primary btn-lg">
                  Browse the tools <ArrowRight size={18} />
                </Link>
                <a href="mailto:Support@doctrim.com" className="btn-ghost btn-lg">
                  <Mail size={18} /> Get in touch
                </a>
              </div>
            </div>

            {/* Visual: a document processed on-device */}
            <div className="relative mx-auto hidden w-full max-w-[420px] lg:block" aria-hidden="true">
              <div className="absolute -inset-6 rounded-[28px] bg-brand/5" />
              <div className="relative rotate-[-1.5deg] rounded-2xl border border-line bg-white p-5 shadow-lift">
                <div className="flex items-center gap-2 border-b border-line pb-3">
                  <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
                  <span className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
                  <span className="h-2 w-2 rounded-full bg-[#28C840]" />
                  <span className="ml-2 truncate text-[12px] font-semibold text-ink-muted">
                    contract-final.pdf
                  </span>
                  <span className="ml-auto rounded-full bg-[#00D267]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#009B4D]">
                    Done
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="h-2.5 w-2/3 rounded-full bg-ink/70" />
                  <div className="h-2 w-full rounded-full bg-line" />
                  <div className="h-2 w-11/12 rounded-full bg-line" />
                  <div className="h-2 w-4/5 rounded-full bg-line" />
                  <div className="mt-5 h-2.5 w-1/2 rounded-full bg-ink/70" />
                  <div className="h-2 w-full rounded-full bg-line" />
                  <div className="h-2 w-10/12 rounded-full bg-line" />
                  <div className="mt-5 flex items-end justify-between">
                    <div className="space-y-2">
                      <div className="h-2 w-24 rounded-full bg-line" />
                      <div className="h-2 w-16 rounded-full bg-line" />
                    </div>
                    <div className="h-8 w-20 rounded bg-brand/10" />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 shadow-lift">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00D267]/10 text-[#009B4D]">
                  <ShieldCheck size={14} />
                </span>
                <span className="text-[13px] font-bold text-ink">Processed on your device</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-14 grid max-w-[860px] grid-cols-2 gap-y-8 border-t border-line pt-8 sm:grid-cols-4">
            {[
              { value: `${TOOLS.length}`, label: 'PDF tools' },
              { value: '0', label: 'sign-ups required' },
              {
                value: `${TOOLS.filter((t) => !t.server && t.slug !== 'edit-pdf').length}`,
                label: 'tools run on your device*',
              },
              { value: '$0', label: 'to use everything' },
            ].map((s, i) => (
              <div key={s.label} className={i > 0 ? 'sm:border-l sm:border-line sm:pl-7' : ''}>
                <p className="text-3xl font-black tracking-tight text-ink lg:text-4xl">{s.value}</p>
                <p className="mt-1 text-[13px] font-semibold uppercase tracking-wide text-ink-muted">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12px] text-ink-muted">
            *The other ten tools need our server and delete your file the moment processing finishes.
            The PDF editor keeps its surface edits in the browser; rewriting existing text uses the
            server for a moment.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="container-x py-16 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <h2 className="h-display text-3xl leading-tight lg:text-4xl">Why DocTrim exists</h2>
          <div className="space-y-5 text-[17px] leading-relaxed text-ink-soft">
            <p>
              PDFs are supposed to be the format that just works. In practice, doing something as
              small as deleting a blank page usually means uploading a private contract to a site
              you have never heard of, creating an account, and hitting a prompt to subscribe
              before you can save your own file.
            </p>
            <p>
              Most of those tasks do not need a server at all. Modern browsers can edit a PDF
              locally, in memory, in under a second. So DocTrim is built the other way around:
              the tool runs where your file already is. Nothing to upload, nothing to store,
              nothing to leak.
            </p>
            <p>
              The result is deliberately plain: one clear page per task, real options instead of
              upsells, and no watermark on the file you just fixed. We would rather ship ten tools
              that feel instant than a hundred that feel like a sales funnel.
            </p>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="border-y border-line bg-surface">
        <div className="container-x py-16 lg:py-20">
          <div className="max-w-[640px]">
            <h2 className="h-display text-3xl lg:text-4xl">What we build on</h2>
            <p className="mt-3 text-lg text-ink-soft">
              Four rules that decide how every feature on this site gets made.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="card p-7">
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${p.color}14`, color: p.color }}
                >
                  <p.icon size={22} />
                </span>
                <h3 className="mt-4 text-xl font-bold text-ink">{p.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-x py-16 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <h2 className="h-display text-3xl leading-tight lg:text-4xl">How it works</h2>
            <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
              Three steps, every tool, every time. No tutorial needed.
            </p>
          </div>
          <ol className="space-y-6">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-5 border-b border-line pb-6 last:border-0 last:pb-0">
                <span className="text-[15px] font-black tracking-tight text-brand">{s.n}</span>
                <div>
                  <h3 className="text-lg font-bold text-ink">{s.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Contact */}
      <section className="border-t border-line bg-surface">
        <div className="container-x flex flex-col items-start justify-between gap-6 py-12 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-ink">Questions, bugs, or a tool you wish we had?</h2>
            <p className="mt-1 text-[15px] text-ink-soft">
              Email us at{' '}
              <a href="mailto:Support@doctrim.com" className="font-semibold text-brand hover:underline">
                Support@doctrim.com
              </a>{' '}
              — or read the{' '}
              <Link to="/help" className="font-semibold text-brand hover:underline">
                Help Center
              </Link>
              .
            </p>
          </div>
          <a href="mailto:Support@doctrim.com" className="btn-primary btn-md shrink-0">
            <Mail size={16} /> Contact support
          </a>
        </div>
      </section>
    </div>
  )
}
