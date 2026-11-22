import type { ReactNode } from 'react'

export type LegalSection = { id: string; title: string; body: ReactNode }

export default function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  sections,
}: {
  eyebrow: string
  title: string
  intro: string
  updated: string
  sections: LegalSection[]
}) {
  return (
    <div className="bg-white">
      {/* Header */}
      <section className="border-b border-line bg-surface">
        <div className="container-x py-14 lg:py-20">
          <div className="max-w-[760px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-bold uppercase tracking-wide text-brand">
              {eyebrow}
            </span>
            <h1 className="h-display mt-5 text-4xl leading-tight lg:text-5xl">{title}</h1>
            <p className="mt-4 max-w-[640px] text-lg leading-relaxed text-ink-soft">{intro}</p>
            <p className="mt-5 text-[13px] font-semibold uppercase tracking-wide text-ink-muted">
              Last updated: {updated}
            </p>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="container-x py-12 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[240px_1fr] lg:gap-16">
          <nav className="hidden lg:block" aria-label="On this page">
            <div className="sticky top-24">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">On this page</p>
              <ol className="space-y-1.5 border-l border-line">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="-ml-px block border-l border-transparent pl-3 text-[13.5px] leading-snug text-ink-soft hover:border-brand hover:text-brand"
                    >
                      <span className="mr-1 text-ink-muted">{i + 1}.</span>
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          <div className="max-w-[760px] space-y-10">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="text-[22px] font-bold leading-snug text-ink">
                  <span className="mr-2 text-brand">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </h2>
                <div className="mt-3 space-y-4 text-[16px] leading-relaxed text-ink-soft">{s.body}</div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
