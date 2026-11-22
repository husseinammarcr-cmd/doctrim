import { Link } from 'react-router-dom'
import { Gift, Lock, MousePointerClick, Infinity as InfinityIcon } from 'lucide-react'
import { TOOLS } from '../lib/tools'

const PERKS = [
  {
    icon: MousePointerClick,
    title: 'No sign-up, no login',
    body: 'Open a tool, drop your file, get your result. No account, no email, no password to remember.',
  },
  {
    icon: Gift,
    title: 'Free for everything',
    body: `All ${TOOLS.length} tools are completely free — no trials, no subscriptions, no hidden charges.`,
  },
  {
    icon: InfinityIcon,
    title: 'No daily limits',
    body: 'Use any tool as many times as you need. No credits, no upsells, no watermarks on your files.',
  },
  {
    icon: Lock,
    title: 'Private by design',
    body: 'Most tools run fully in your browser — your files are processed on your own device, not uploaded.',
  },
]

export default function FreeSection() {
  return (
    <section id="free" className="bg-white">
      <div className="container-x py-16">
        <div className="mx-auto max-w-[660px] text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3.5 py-1.5 text-[13px] font-bold text-brand">
            <Gift size={15} /> Free forever
          </span>
          <h2 className="h-display mt-4 text-4xl lg:text-[40px]">No Account. No Subscription. Just Free.</h2>
          <p className="mt-3 text-lg text-ink-soft">
            DocTrim has no plans and no pricing page — every tool is free and works right away, without creating an
            account.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PERKS.map((p) => (
            <div key={p.title} className="card p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-light text-brand">
                <p.icon size={24} />
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink">{p.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link to="/pdf-tools" className="btn-primary btn-lg">
            Start Using the Tools — It's Free
          </Link>
          <p className="mt-3 text-[14px] text-ink-muted">No registration required. Works in any modern browser.</p>
        </div>
      </div>
    </section>
  )
}
