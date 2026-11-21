import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import ToolIcon from './ToolIcon'
import type { Tool } from '../lib/tools'

export default function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      to={`/${tool.slug}`}
      className="card group flex items-start gap-4 p-6 transition-shadow hover:shadow-lift"
    >
      <ToolIcon icon={tool.icon} color={tool.color} size={42} radius={10} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[17px] font-bold text-ink group-hover:text-brand">{tool.name}</h3>
          <ChevronRight size={18} className="shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
        </div>
        <p className="mt-1 text-[14px] leading-snug text-ink-muted">{tool.desc}</p>
      </div>
    </Link>
  )
}
