import { ShieldCheck, BadgeCheck, UserX } from 'lucide-react'
import { TOOLS } from '../lib/tools'
import { Reveal, StaggerGroup, StaggerItem } from './motion/Reveal'

const STATS = [
  { value: `${TOOLS.length}`, label: 'PDF tools' },
  { value: '100%', label: 'Free, forever' },
  { value: '0', label: 'Accounts needed' },
  { value: '256-bit', label: 'TLS encryption' },
]

const CARDS = [
  {
    icon: UserX,
    title: 'No Account Required',
    body: 'There is nothing to sign up for. No email, no password, no profile — open a tool and use it.',
  },
  {
    icon: ShieldCheck,
    title: '256-Bit TLS Encryption',
    body: 'Your files are protected in transit with strong encryption, and processed with care.',
  },
  {
    icon: BadgeCheck,
    title: 'Security Standards',
    body: 'Built with privacy in mind. Many tools run entirely in your browser — files never leave your device.',
  },
]

export default function TrustSection() {
  return (
    <section id="trust" className="bg-surface">
      <div className="container-x py-16">
        <Reveal>
          <div className="mx-auto max-w-[640px] text-center">
            <h2 className="h-display text-4xl lg:text-[40px]">Why Choose DocTrim?</h2>
            <p className="mt-3 text-lg text-ink-soft">
              People and businesses trust DocTrim to get their document work done — safely, simply and for free.
            </p>
          </div>
        </Reveal>
        <StaggerGroup className="mx-auto mt-10 grid max-w-[820px] grid-cols-2 gap-6 md:grid-cols-4" stagger={0.07}>
          {STATS.map((s) => (
            <StaggerItem key={s.label} className="text-center">
              <p className="text-3xl font-black text-brand">{s.value}</p>
              <p className="mt-1 text-[14px] text-ink-muted">{s.label}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>
        <StaggerGroup className="mt-12 grid gap-6 md:grid-cols-3">
          {CARDS.map((c) => (
            <StaggerItem key={c.title} className="h-full">
              <div className="card dt-card-hover h-full p-7">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-light text-brand">
                  <c.icon size={24} />
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink">{c.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{c.body}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  )
}

