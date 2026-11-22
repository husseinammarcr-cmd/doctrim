import ToolCard from '../components/ToolCard'
import { DIRECTORY, getTool } from '../lib/tools'
import { Reveal, StaggerGroup, StaggerItem } from '../components/motion/Reveal'

export default function AllTools() {
  return (
    <div className="bg-white">
      <div className="container-x py-12">
        <Reveal>
          <div className="mx-auto max-w-[640px] text-center">
            <h1 className="h-display text-4xl lg:text-5xl">All PDF Tools</h1>
            <p className="mt-3 text-lg text-ink-soft">
              Every tool you need to convert, compress, organize, edit and protect PDFs — all free, no sign-up.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 space-y-12">
          {DIRECTORY.map((group) => (
            <section key={group.title}>
              <Reveal>
                <h2 className="mb-5 text-xl font-bold text-ink">{group.title}</h2>
              </Reveal>
              <StaggerGroup className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
                {group.slugs.map((slug) => {
                  const t = getTool(slug)!
                  return (
                    <StaggerItem key={slug} className="h-full">
                      <ToolCard tool={t} />
                    </StaggerItem>
                  )
                })}
              </StaggerGroup>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
