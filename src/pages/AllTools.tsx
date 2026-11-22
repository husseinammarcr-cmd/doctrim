import ToolCard from '../components/ToolCard'
import { DIRECTORY, getTool, TOOLS } from '../lib/tools'
import { Reveal, StaggerGroup, StaggerItem } from '../components/motion/Reveal'
import { useI18n } from '../i18n'
import { usePageMeta } from '../lib/usePageMeta'
import { useCanonical } from '../lib/seo'

export default function AllTools() {
  const { t, category, isAr } = useI18n()
  usePageMeta(
    t('tools.title', 'All PDF Tools'),
    t('tools.sub', 'Every tool you need to convert, compress, organize, edit and protect PDFs — all free, no sign-up.')
  )
  useCanonical(isAr ? '/ar/pdf-tools' : '/pdf-tools')

  return (
    <div className="bg-white">
      <div className="container-x py-12">
        <Reveal>
          <div className="mx-auto max-w-[640px] text-center">
            <h1 className="h-display text-4xl lg:text-5xl">{t('nav.allTools', 'All PDF Tools')}</h1>
            <p className="mt-3 text-lg text-ink-soft">
              {t('tools.sub', 'Every tool you need to convert, compress, organize, edit and protect PDFs — all free, no sign-up.')}
            </p>
            <p className="mt-2 text-[13px] font-semibold text-ink-muted">
              {isAr ? `${TOOLS.length} أداة — كلها مجانية` : `${TOOLS.length} tools — all free`}
            </p>
          </div>
        </Reveal>

        <div className="mt-12 space-y-12">
          {DIRECTORY.map((group) => (
            <section key={group.title}>
              <Reveal>
                <h2 className="mb-5 text-xl font-bold text-ink">{category(group.title)}</h2>
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
