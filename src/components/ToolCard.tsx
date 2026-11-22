import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import ToolIcon from './ToolIcon'
import { springSoft } from '../lib/motion'
import type { Tool } from '../lib/tools'

const MotionLink = motion(Link)

export default function ToolCard({ tool }: { tool: Tool }) {
  return (
    <MotionLink
      to={`/${tool.slug}`}
      whileHover={{ y: -4 }}
      whileTap={{ y: -1, scale: 0.995 }}
      transition={springSoft}
      className="card group flex items-start gap-4 p-6 transition-[box-shadow,border-color] duration-300 hover:border-brand/30 hover:shadow-lift"
    >
      <span className="transition-transform duration-300 ease-out group-hover:-rotate-3 group-hover:scale-105">
        <ToolIcon icon={tool.icon} color={tool.color} size={42} radius={10} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[17px] font-bold text-ink group-hover:text-brand">{tool.name}</h3>
          <ChevronRight size={18} className="shrink-0 text-ink-muted transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-brand" />
        </div>
        <p className="mt-1 text-[14px] leading-snug text-ink-muted">{tool.desc}</p>
      </div>
    </MotionLink>
  )
}
