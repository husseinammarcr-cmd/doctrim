import ToolCard from '../components/ToolCard'
import { DIRECTORY, getTool } from '../lib/tools'

export default function AllTools() {
  return (
    <div className="bg-white">
      <div className="container-x py-12">
        <div className="mx-auto max-w-[640px] text-center">
          <h1 className="h-display text-4xl lg:text-5xl">All PDF Tools</h1>
          <p className="mt-3 text-lg text-ink-soft">
            Every tool you need to convert, compress, organize, edit and protect PDFs — free to start.
          </p>
        </div>

        <div className="mt-12 space-y-12">
          {DIRECTORY.map((group) => (
            <section key={group.title}>
              <h2 className="mb-5 text-xl font-bold text-ink">{group.title}</h2>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {group.slugs.map((slug) => {
                  const t = getTool(slug)!
                  return <ToolCard key={slug} tool={t} />
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
