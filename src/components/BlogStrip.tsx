import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PostCard from './blog/PostCard'
import { Reveal } from './motion/Reveal'
import { POSTS } from '../lib/blog'

/** Three latest guides, surfaced on the home page for internal linking. */
export default function BlogStrip() {
  const posts = POSTS.slice(0, 3)
  if (posts.length === 0) return null

  return (
    <section className="border-t border-line bg-white">
      <div className="container-x py-14">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-wide text-brand">From the blog</p>
              <h2 className="h-display mt-2 text-3xl lg:text-4xl">PDF guides that actually help</h2>
              <p className="mt-2 max-w-[560px] text-[16px] text-ink-soft">
                Why files get huge, why pages print with white edges, and what an edit really
                changes — written by the people who build the tools.
              </p>
            </div>
            <Link
              to="/blog"
              className="dt-link-arrow inline-flex items-center gap-1 text-[14px] font-semibold text-brand hover:underline"
            >
              All guides
              <span aria-hidden className="inline-block">
                <ArrowRight size={15} />
              </span>
            </Link>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}
        </div>
      </div>
    </section>
  )
}
