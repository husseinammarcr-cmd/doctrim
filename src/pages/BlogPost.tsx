import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  Link2,
  Linkedin,
  Twitter,
} from 'lucide-react'
import NotFound from './NotFound'
import PostCard, { CategoryPill } from '../components/blog/PostCard'
import ToolIcon from '../components/ToolIcon'
import { Reveal } from '../components/motion/Reveal'
import { adjacentPosts, categoryColor, formatDateLong, getPost, relatedPosts, type Post } from '../lib/blog'
import { renderMarkdown } from '../lib/markdown'
import { getTool } from '../lib/tools'
import { usePageMeta } from '../lib/usePageMeta'
import { SITE_URL, useCanonical, useJsonLd } from '../lib/seo'

export default function BlogPost() {
  const { slug } = useParams()
  const post = getPost(slug)
  if (!post) return <NotFound />
  return <PostView post={post} />
}

function PostView({ post }: { post: Post }) {
  const navigate = useNavigate()
  const articleRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [activeId, setActiveId] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const { html, toc } = useMemo(() => renderMarkdown(post.body), [post.body])
  const tool = post.tool ? getTool(post.tool) : undefined
  const related = useMemo(() => relatedPosts(post, 3), [post])
  const { newer, older } = useMemo(() => adjacentPosts(post), [post])

  usePageMeta(`${post.title} — DocTrim Blog`, post.description)
  useCanonical(`/blog/${post.slug}`)
  useJsonLd([
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.date,
      author: { '@type': 'Organization', name: 'DocTrim' },
      publisher: { '@type': 'Organization', name: 'DocTrim', url: SITE_URL },
      mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
      keywords: post.tags.join(', '),
      articleSection: post.category,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
      ],
    },
  ])

  /* reading progress + active TOC entry */
  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current
      if (!el) return
      const start = el.offsetTop - 120
      const total = el.offsetHeight - window.innerHeight * 0.6
      const p = total > 0 ? (window.scrollY - start) / total : 0
      setProgress(Math.min(1, Math.max(0, p)))

      let current = ''
      for (const item of toc) {
        const h = document.getElementById(item.id)
        if (h && h.getBoundingClientRect().top <= 140) current = item.id
      }
      setActiveId(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [toc])

  /* keep in-article links client-side so the nav does not reload the SPA */
  const onArticleClick = (e: MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest('a')
    if (!anchor) return
    const href = anchor.getAttribute('href') ?? ''
    if (href.startsWith('/') && !href.startsWith('//')) {
      e.preventDefault()
      navigate(href)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked — the URL is in the address bar */
    }
  }

  const shareUrl = `${SITE_URL}/blog/${post.slug}`
  const shareText = encodeURIComponent(post.title)

  return (
    <div className="bg-white">
      {/* progress line, pinned under the sticky header */}
      <div className="fixed inset-x-0 top-16 z-40 h-[2px] bg-transparent" aria-hidden="true">
        <div
          className="h-full bg-brand transition-[width] duration-150 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Header */}
      <section className="border-b border-line bg-surface">
        <div className="container-x py-12 lg:py-16">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted">
            <Link to="/" className="hover:text-brand">
              Home
            </Link>
            <ChevronRight size={13} />
            <Link to="/blog" className="hover:text-brand">
              Blog
            </Link>
            <ChevronRight size={13} />
            <span className="truncate text-ink-soft">{post.category}</span>
          </nav>

          <div className="mt-6 max-w-[860px]">
            <div className="flex flex-wrap items-center gap-3">
              <CategoryPill category={post.category} solid />
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted">
                <Clock size={13} /> {post.minutes} min read
              </span>
            </div>
            <h1 className="h-display mt-4 text-[34px] leading-[1.12] sm:text-[42px] lg:text-[46px]">
              {post.title}
            </h1>
            <p className="mt-4 max-w-[720px] text-lg leading-relaxed text-ink-soft">{post.description}</p>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-[12px] font-bold text-white">
                  DT
                </span>
                <div>
                  <p className="text-[14px] font-bold text-ink">DocTrim Team</p>
                  <p className="text-[12.5px] text-ink-muted">
                    <time dateTime={post.date}>{formatDateLong(post.date)}</time>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on X"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
                >
                  <Twitter size={15} />
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on LinkedIn"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
                >
                  <Linkedin size={15} />
                </a>
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
                >
                  {copied ? <Check size={14} /> : <Link2 size={14} />}
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="container-x py-10 lg:py-14">
        <div className="grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
          {/* TOC */}
          {toc.length > 1 && (
            <nav className="hidden lg:block" aria-label="On this page">
              <div className="sticky top-28">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                  On this page
                </p>
                <ul className="space-y-1 border-l border-line">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className={`-ml-px block border-l py-1 pl-3 text-[13px] leading-snug transition-colors ${
                          item.level === 3 ? 'pl-5 text-[12.5px]' : ''
                        } ${
                          activeId === item.id
                            ? 'border-brand font-semibold text-brand'
                            : 'border-transparent text-ink-soft hover:border-ink/30 hover:text-ink'
                        }`}
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 rounded-lg border border-line bg-surface p-3">
                  <p className="text-[12px] font-bold uppercase tracking-wide text-ink-muted">In a hurry?</p>
                  <p className="mt-1 text-[13px] leading-snug text-ink-soft">
                    Skip to the tool and get the file done.
                  </p>
                  <Link
                    to={tool ? `/${tool.slug}` : '/pdf-tools'}
                    className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline"
                  >
                    {tool ? tool.name : 'All PDF tools'} <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </nav>
          )}

          <div className="min-w-0">
            {/* mobile TOC */}
            {toc.length > 1 && (
              <details className="mb-6 rounded-lg border border-line bg-surface px-4 py-3 lg:hidden">
                <summary className="cursor-pointer text-[14px] font-bold text-ink">
                  On this page ({toc.length})
                </summary>
                <ul className="mt-3 space-y-1.5">
                  {toc.map((item) => (
                    <li key={item.id} className={item.level === 3 ? 'pl-4' : ''}>
                      <a href={`#${item.id}`} className="text-[13.5px] text-ink-soft hover:text-brand">
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div
              ref={articleRef}
              onClick={onArticleClick}
              className="dt-article max-w-[720px]"
              dangerouslySetInnerHTML={{ __html: html }}
            />

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-line pt-6">
                <span className="text-[12px] font-bold uppercase tracking-wide text-ink-muted">Tags</span>
                {post.tags.map((t) => (
                  <span key={t} className="rounded-full bg-surface px-2.5 py-1 text-[12.5px] text-ink-soft">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Tool CTA */}
            <div className="mt-8 overflow-hidden rounded-xl border border-line bg-white">
              <div className="h-1 w-full" style={{ background: categoryColor(post.category) }} />
              <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
                {tool && <ToolIcon icon={tool.icon} color={tool.color} size={44} radius={11} />}
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold uppercase tracking-wide text-ink-muted">
                    Do it in your browser
                  </p>
                  <p className="mt-1 text-[16px] font-bold text-ink">
                    {tool ? tool.name : 'All DocTrim PDF tools'}
                  </p>
                  <p className="mt-0.5 text-[13.5px] text-ink-muted">
                    {tool ? tool.desc : 'Compress, merge, convert and edit — free, no sign-up.'}
                  </p>
                </div>
                <Link to={tool ? `/${tool.slug}` : '/pdf-tools'} className="btn-primary btn-md shrink-0">
                  Open tool <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            {/* Author */}
            <div className="mt-8 flex flex-col gap-3 rounded-xl border border-line bg-surface p-6 sm:flex-row">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">
                DT
              </span>
              <div>
                <p className="text-[15px] font-bold text-ink">DocTrim Team</p>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">
                  We build the free browser tools this blog writes about — every claim here is
                  checked against the code that actually ships.{' '}
                  <Link to="/about" className="whitespace-nowrap font-semibold text-brand hover:underline">
                    About DocTrim
                  </Link>
                </p>
              </div>
            </div>

            {/* Prev / next */}
            {(newer || older) && (
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {newer ? (
                  <Link
                    to={`/blog/${newer.slug}`}
                    className="group card p-4 transition-colors hover:border-brand/30"
                  >
                    <p className="flex items-center gap-1 text-[12px] font-bold uppercase tracking-wide text-ink-muted">
                      <ArrowLeft size={12} /> Newer
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-[14px] font-bold leading-snug text-ink group-hover:text-brand">
                      {newer.title}
                    </p>
                  </Link>
                ) : (
                  <span className="hidden sm:block" />
                )}
                {older && (
                  <Link
                    to={`/blog/${older.slug}`}
                    className="group card p-4 text-right transition-colors hover:border-brand/30"
                  >
                    <p className="flex items-center justify-end gap-1 text-[12px] font-bold uppercase tracking-wide text-ink-muted">
                      Older <ArrowRight size={12} />
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-[14px] font-bold leading-snug text-ink group-hover:text-brand">
                      {older.title}
                    </p>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-line bg-surface">
          <div className="container-x py-12 lg:py-16">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="h-display text-2xl lg:text-3xl">Keep reading</h2>
                <Link to="/blog" className="dt-link-arrow inline-flex items-center gap-1 text-[14px] font-semibold text-brand">
                  All guides
                  <span aria-hidden>
                    <ArrowRight size={14} />
                  </span>
                </Link>
              </div>
            </Reveal>
            <div className="mt-7 grid gap-6 md:grid-cols-3">
              {related.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
