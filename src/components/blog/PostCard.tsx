import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { categoryColor, formatDate, type Post } from '../../lib/blog'

export function CategoryPill({ category, solid = false }: { category: string; solid?: boolean }) {
  const color = categoryColor(category)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-wide"
      style={
        solid
          ? { background: color, color: '#fff' }
          : { background: `${color}14`, color }
      }
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: solid ? '#fff' : color }} />
      {category}
    </span>
  )
}

export default function PostCard({ post }: { post: Post }) {
  const color = categoryColor(post.category)
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="card dt-card-hover group flex h-full flex-col overflow-hidden"
    >
      <div className="h-1 w-full" style={{ background: color }} />
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-2">
          <CategoryPill category={post.category} />
          <span className="text-[12.5px] font-semibold text-ink-muted">{post.minutes} min read</span>
        </div>

        <h3 className="mt-3.5 text-[19px] font-bold leading-snug text-ink transition-colors duration-200 group-hover:text-brand">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-[14.5px] leading-relaxed text-ink-muted">{post.description}</p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <time dateTime={post.date} className="text-[13px] text-ink-muted">
            {formatDate(post.date)}
          </time>
          <span className="dt-link-arrow inline-flex items-center gap-1 text-[13px] font-semibold text-brand">
            Read
            <span aria-hidden className="inline-block">
              <ArrowRight size={14} />
            </span>
          </span>
        </div>
      </div>
    </Link>
  )
}
