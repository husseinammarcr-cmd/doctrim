import { Link } from 'react-router-dom'
import ToolIcon from './ToolIcon'
import { DIRECTORY, getTool } from '../lib/tools'
import { Reveal, StaggerGroup, StaggerItem } from './motion/Reveal'

export default function ToolsDirectory({ compact = false }: { compact?: boolean }) {
  return (
    <section className="bg-white">
      <div className="container-x py-14">
        {!compact && (
          <Reveal>
            <div className="mb-8 text-center">
              <h2 className="h-display text-4xl">All PDF Tools</h2>
              <p className="mt-2 text-lg text-ink-soft">Everything you need to work with PDFs, in one place.</p>
            </div>
          </Reveal>
        )}
        <StaggerGroup className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7" stagger={0.05} amount={0.08}>
          {DIRECTORY.map((group) => (
            <StaggerItem key={group.title}>
              <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-ink-muted">{group.title}</p>
              <ul className="space-y-2.5">
                {group.slugs.map((slug) => {
                  const t = getTool(slug)!
                  return (
                    <li key={slug}>
                      <Link to={`/${slug}`} className="dt-dir-link flex items-center gap-2 text-[14px] text-ink-soft hover:text-brand">
                        <ToolIcon icon={t.icon} color={t.color} size={22} radius={6} />
                        <span className="truncate">{t.name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  )
}
