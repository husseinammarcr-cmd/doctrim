import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Search, X } from 'lucide-react'
import PostCard, { CategoryPill } from '../components/blog/PostCard'
import { Reveal, StaggerGroup, StaggerItem } from '../components/motion/Reveal'
import CTASection from '../components/CTASection'
import { CATEGORIES, POSTS, categoryColor, formatDate } from '../lib/blog'
import { TOOLS } from '../lib/tools'
import { usePageMeta } from '../lib/usePageMeta'
import { SITE_URL, useCanonical, useJsonLd } from '../lib/seo'

export default function Blog() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('All')

  usePageMeta(
    'PDF guides and how-tos — DocTrim Blog',
    'Practical guides to PDF file sizes, page sizes, editing limits, redaction and e-signatures — written by the team building DocTrim’s free browser tools.'
  )
  useCanonical('/blog')
  useJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'DocTrim Blog',
    url: `${SITE_URL}/blog`,
    description: 'Practical guides to PDF compression, editing, privacy and page geometry.',
    blogPost: POSTS.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.description,
      datePublished: p.date,
      url: `${SITE_URL}/blog/${p.slug}`,
    })),
  })

  const featured = POSTS.find((p) => p.featured) ?? POSTS[0]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return POSTS.filter((p) => {
      if (category !== 'All' && p.category !== category) return false
      if (!q) return true
      return [p.title, p.description, p.category, ...p.tags].join(' ').toLowerCase().includes(q)
    })
  }, [query, category])

  const isBrowsing = !query.trim() && category === 'All'

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="border-b border-line bg-surface">
        <div className="container-x py-14 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-bold uppercase tracking-wide text-brand">
                DocTrim Blog
              </span>
              <h1 className="h-display mt-5 text-[42px] leading-[1.06] sm:text-5xl lg:text-[56px]">
                PDF, explained <span className="text-brand">without the jargon.</span>
              </h1>
              <p className="mt-5 max-w-[600px] text-lg leading-relaxed text-ink-soft">
                The format everyone uses and nobody explains: where the megabytes come from, why
                pages print with white edges, what an edit really changes, and when a redaction
                isn’t one.
              </p>

              <div className="mt-9 grid max-w-[560px] grid-cols-3 gap-6 border-t border-line pt-6">
                {[
                  { value: `${POSTS.length}`, label: 'in-depth guides' },
                  { value: `${TOOLS.length}`, label: 'free PDF tools' },
                  { value: '0', label: 'sign-ups needed' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-2xl font-bold text-ink">{s.value}</p>
                    <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CSS-only visual: three guides stacked like a reading list */}
            <div className="relative mx-auto hidden w-full max-w-[400px] lg:block" aria-hidden="true">
              <div className="absolute -inset-8 rounded-[32px] bg-brand/[0.06]" />
              <div className="relative space-y-3">
                {POSTS.slice(0, 3).map((p, i) => (
                  <div
                    key={p.slug}
                    className={`relative rounded-xl border border-line bg-white p-4 shadow-card transition-transform duration-500 ${
                      i === 0 ? 'rotate-[-1.6deg]' : i === 1 ? 'rotate-[0.8deg] translate-x-3' : 'rotate-[-0.6deg] translate-x-1'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: categoryColor(p.category) }}
                      />
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">
                        {p.category}
                      </span>
                      <span className="ml-auto text-[10.5px] font-semibold text-ink-muted">
                        {p.minutes} min
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[13.5px] font-bold leading-snug text-ink">
                      {p.title}
                    </p>
                    <div className="mt-3 space-y-1.5">
                      <div className="h-1.5 w-full rounded-full bg-line" />
                      <div className="h-1.5 w-4/5 rounded-full bg-line" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute -bottom-5 left-4 flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 shadow-lift">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <ArrowRight size={12} />
                </span>
                <span className="text-[12.5px] font-bold text-ink">No fluff, no clickbait</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      {isBrowsing && featured && (
        <section className="container-x pt-12 lg:pt-16">
          <Reveal>
            <Link
              to={`/blog/${featured.slug}`}
              className="group grid overflow-hidden rounded-xl border border-line bg-white transition-[box-shadow,border-color] duration-300 hover:border-brand/30 hover:shadow-lift lg:grid-cols-[1.15fr_0.85fr]"
            >
              <div className="p-7 lg:p-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-ink px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-wide text-white">
                    Latest
                  </span>
                  <CategoryPill category={featured.category} />
                  <span className="text-[12.5px] font-semibold text-ink-muted">
                    {featured.minutes} min read
                  </span>
                </div>
                <h2 className="h-display mt-4 text-[26px] leading-tight text-ink transition-colors group-hover:text-brand lg:text-[34px]">
                  {featured.title}
                </h2>
                <p className="mt-3 max-w-[560px] text-[15.5px] leading-relaxed text-ink-soft">
                  {featured.description}
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <span className="btn-primary btn-md">
                    Read the guide <ArrowRight size={16} />
                  </span>
                  <time dateTime={featured.date} className="text-[13px] text-ink-muted">
                    {formatDate(featured.date)}
                  </time>
                </div>
              </div>

              {/* decorative page mock */}
              <div
                className="relative hidden overflow-hidden border-l border-line p-8 lg:block"
                style={{ background: `linear-gradient(150deg, ${categoryColor(featured.category)}12, #ffffff 65%)` }}
                aria-hidden="true"
              >
                <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(#E8E8EC_1px,transparent_1px),linear-gradient(90deg,#E8E8EC_1px,transparent_1px)] [background-size:26px_26px]" />
                <div className="relative mx-auto w-full max-w-[260px] rotate-[1.5deg] rounded-lg border border-line bg-white p-4 shadow-lift transition-transform duration-500 group-hover:rotate-0">
                  <div
                    className="h-1 w-10 rounded-full"
                    style={{ background: categoryColor(featured.category) }}
                  />
                  <p className="mt-3 text-[12.5px] font-bold leading-snug text-ink">
                    {featured.title}
                  </p>
                  <div className="mt-3 space-y-1.5">
                    {[100, 92, 96, 70, 100, 88, 60].map((w, i) => (
                      <div
                        key={i}
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${w}%`,
                          background: i % 4 === 0 ? '#D8D8DE' : '#EDEDF1',
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="h-1.5 w-16 rounded-full bg-line" />
                    <div className="h-5 w-12 rounded bg-brand/10" />
                  </div>
                </div>
              </div>
            </Link>
          </Reveal>
        </section>
      )}

      {/* Toolbar + grid */}
      <section className="container-x py-10 lg:py-14">
        <div className="mb-8 border-b border-line/80 py-3 lg:sticky lg:top-16 lg:z-30 lg:-mx-6 lg:bg-white/90 lg:px-6 lg:backdrop-blur-md">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCategory('All')}
                aria-pressed={category === 'All'}
                className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                  category === 'All'
                    ? 'border-ink bg-ink text-white'
                    : 'border-line bg-white text-ink-soft hover:border-ink/30 hover:text-ink'
                }`}
              >
                All guides
              </button>
              {CATEGORIES.map((c) => {
                const active = category === c
                const color = categoryColor(c)
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    aria-pressed={active}
                    className="rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors"
                    style={
                      active
                        ? { borderColor: color, background: color, color: '#fff' }
                        : { borderColor: '#E8E8EC', background: '#fff', color: '#3A3A3A' }
                    }
                  >
                    {c}
                  </button>
                )
              })}
            </div>

            <div className="relative w-full lg:w-[300px]">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <input
                type="text"
                inputMode="search"
                role="searchbox"
                aria-label="Search guides"
                placeholder="Search guides…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-full border border-line bg-white py-2 pl-10 pr-9 text-[14px] text-ink outline-none placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-surface hover:text-ink"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="text-[15px] font-bold text-ink">
            {query.trim() ? `Results for “${query.trim()}”` : category === 'All' ? 'All guides' : category}
          </h2>
          <p className="text-[13px] text-ink-muted">
            {filtered.length} of {POSTS.length} {POSTS.length === 1 ? 'guide' : 'guides'}
          </p>
        </div>

        {filtered.length > 0 ? (
          <StaggerGroup className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" stagger={0.05} amount={0.05}>
            {filtered.map((p) => (
              <StaggerItem key={p.slug} className="h-full">
                <PostCard post={p} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        ) : (
          <div className="card flex flex-col items-center px-6 py-16 text-center">
            <p className="text-lg font-bold text-ink">No guides match that search.</p>
            <p className="mt-1 max-w-[420px] text-[14.5px] text-ink-muted">
              Try a shorter phrase — “compress”, “merge”, “redact” or “signature”.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setCategory('All')
              }}
              className="btn-ghost btn-md mt-5"
            >
              Show all guides
            </button>
          </div>
        )}
      </section>

      <CTASection />
    </div>
  )
}
