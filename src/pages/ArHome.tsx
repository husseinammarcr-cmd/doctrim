import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ChevronDown, ShieldCheck, Sparkles, WifiOff } from 'lucide-react'
import ToolCard from '../components/ToolCard'
import ToolIcon from '../components/ToolIcon'
import { Reveal, StaggerGroup, StaggerItem } from '../components/motion/Reveal'
import { DIRECTORY, POPULAR, TOOLS, getTool } from '../lib/tools'
import { useI18n } from '../i18n'
import { usePageMeta } from '../lib/usePageMeta'
import { SITE_URL, useCanonical, useJsonLd } from '../lib/seo'

const FAQ = [
  { q: 'home.faq1q', a: 'home.faq1a' },
  { q: 'home.faq2q', a: 'home.faq2a' },
  { q: 'home.faq3q', a: 'home.faq3a' },
  { q: 'home.faq4q', a: 'home.faq4a' },
  { q: 'home.faq5q', a: 'home.faq5a' },
] as const

const FAQ_EN: Record<string, [string, string]> = {
  'home.faq1q': ['Is DocTrim really free?', 'Yes. Every tool is free, with no subscription, no daily limit and no watermark on your files.'],
  'home.faq1a': ['', ''],
  'home.faq2q': ['Do my files get uploaded?', 'Most tools run inside your browser and never send the file anywhere. A few tools (Word to PDF, OCR) run on the DocTrim server and the file is deleted right after processing.'],
  'home.faq2a': ['', ''],
  'home.faq3q': ['Do I need an account?', 'No sign-up, no email, no password. Open a tool, drop a file, get the result.'],
  'home.faq3a': ['', ''],
  'home.faq4q': ['Does it work on mobile?', 'Yes — every tool works in a mobile browser and the result can be saved to your device.'],
  'home.faq4a': ['', ''],
  'home.faq5q': ['What is the file size limit?', 'Browser tools handle files up to your device memory. Server tools accept up to 50 MB per file.'],
  'home.faq5a': ['', ''],
}


/** Hero illustration: a document card with floating tool tiles, RTL flow. */
function HeroArt() {
  const { toolName } = useI18n()
  const tiles = ['merge-pdf', 'compress-pdf', 'sign-pdf', 'edit-pdf']
  return (
    <div className="relative mx-auto hidden h-[420px] w-full max-w-[460px] lg:block" aria-hidden>
      <motion.div
        initial={{ opacity: 0, y: 18, rotate: -3 }}
        animate={{ opacity: 1, y: 0, rotate: -3 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-x-6 top-6 bottom-6 rounded-2xl border border-line bg-white shadow-[0_24px_60px_-30px_rgba(16,24,40,0.35)]"
      >
        <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
          <span className="h-2.5 w-2.5 rounded-full bg-accent-red" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent-yellow" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent-green" />
          <span className="ms-auto text-[11px] font-bold uppercase tracking-wide text-ink-muted">PDF</span>
        </div>
        <div className="px-6 py-6">
          <div className="h-3 w-24 rounded bg-ink/10" />
          <div className="mt-3 h-2.5 w-full rounded bg-ink/[0.07]" />
          <div className="mt-2 h-2.5 w-[86%] rounded bg-ink/[0.07]" />
          <div className="mt-2 h-2.5 w-[92%] rounded bg-ink/[0.07]" />
          <div className="mt-5 h-24 w-full rounded-lg bg-brand-lighter/70" />
          <div className="mt-4 h-2.5 w-full rounded bg-ink/[0.07]" />
          <div className="mt-2 h-2.5 w-[70%] rounded bg-ink/[0.07]" />
        </div>
      </motion.div>

      {tiles.map((slug, i) => {
        const tool = getTool(slug)!
        const pos = [
          'right-0 top-2',
          'left-0 top-28',
          'right-2 bottom-16',
          'left-6 bottom-2',
        ][i]
        return (
          <motion.div
            key={slug}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
            transition={{
              opacity: { duration: 0.4, delay: 0.25 + i * 0.08 },
              scale: { duration: 0.4, delay: 0.25 + i * 0.08 },
              y: { duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 },
            }}
            className={`absolute ${pos} flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 shadow-lift`}
          >
            <ToolIcon icon={tool.icon} color={tool.color} size={24} radius={6} />
            <span className="text-[12.5px] font-bold text-ink">{toolName(tool)}</span>
          </motion.div>
        )
      })}
    </div>
  )
}

export default function ArHome() {
  const { t, href, toolName, toolDesc, category } = useI18n()
  const [open, setOpen] = useState<number | null>(0)

  usePageMeta(
    'أدوات PDF مجانية بالعربية — دمج، ضغط، تحويل وتوقيع | DocTrim',
    '27 أداة PDF مجانية بالعربية تعمل داخل متصفحك: دمج وضغط وتحويل وتوقيع وتعديل ملفات PDF بدون حساب وبدون رفع ملفاتك.'
  )
  useCanonical('/ar')
  useJsonLd([
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({
        '@type': 'Question',
        name: t(f.q, FAQ_EN[f.q][0]),
        acceptedAnswer: { '@type': 'Answer', text: t(f.a, FAQ_EN[f.a][1]) },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [{ '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${SITE_URL}/ar` }],
    },
  ])

  const quick = ['merge-pdf', 'compress-pdf', 'pdf-to-word', 'sign-pdf']

  return (
    <div className="bg-white">
      {/* hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_-10%,#EAF1FF_0%,#FFFFFF_55%)]" />
        <div className="container-x relative grid items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="max-w-[700px]">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3.5 py-1.5 text-[13px] font-bold text-brand">
              <Sparkles size={14} /> {t('home.eyebrow', '100% free · no account')}
            </span>
            <h1 className="h-display mt-5 text-[40px] leading-[1.15] lg:text-[64px]">
              {t('home.title', 'PDF tools, in Arabic.')}
              <br />
              <span className="text-brand">{t('home.title2', 'No account, no uploads.')}</span>
            </h1>
            <p className="mt-5 max-w-[620px] text-lg leading-relaxed text-ink-soft">
              {t(
                'home.sub',
                'Compress, merge, convert, sign and edit PDFs right in your browser — 27 free tools that run on your own device.'
              )}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={href('/pdf-tools')} className="btn-primary btn-lg">
                {t('home.cta', 'Start now — free')}
              </Link>
              <Link to={href('/compress-pdf')} className="btn-outline btn-lg">
                {t('home.cta2', 'Compress a PDF')}
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-2">
              {quick.map((slug) => {
                const tool = getTool(slug)!
                return (
                  <Link
                    key={slug}
                    to={href(`/${slug}`)}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-[13.5px] font-semibold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
                  >
                    <ToolIcon icon={tool.icon} color={tool.color} size={18} radius={5} />
                    {toolName(tool)}
                  </Link>
                )
              })}
            </div>
          </div>
          <HeroArt />
        </div>
      </section>

      {/* trust */}
      <section className="border-b border-line bg-surface/50">
        <div className="container-x grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, k: 'browser' },
            { icon: WifiOff, k: 'free' },
            { icon: Sparkles, k: 'limit' },
            { icon: ShieldCheck, k: 'ar' },
          ].map(({ icon: Icon, k }) => (
            <div key={k} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                <Icon size={18} />
              </span>
              <div>
                <p className="text-[15px] font-bold text-ink">{t(`home.trust.${k}`, k)}</p>
                <p className="mt-1 text-[13.5px] leading-snug text-ink-muted">{t(`home.trust.${k}Sub`, '')}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* popular */}
      <section>
        <div className="container-x py-14">
          <Reveal>
            <div className="mx-auto max-w-[640px] text-center">
              <h2 className="h-display text-3xl lg:text-4xl">{t('home.popular', 'Most popular')}</h2>
              <p className="mt-3 text-lg text-ink-soft">
                {t('home.popularSub', '{n} tools to convert, compress and edit PDFs — all free, no sign-up.', { n: TOOLS.length })}
              </p>
            </div>
          </Reveal>
          <StaggerGroup className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
            {POPULAR.map((tool) => (
              <StaggerItem key={tool.slug} className="h-full">
                <ToolCard tool={tool} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* all tools by category */}
      <section className="border-t border-line bg-surface/40">
        <div className="container-x py-14">
          <Reveal>
            <h2 className="h-display text-center text-3xl lg:text-4xl">{t('tools.title', 'All PDF tools')}</h2>
          </Reveal>
          <div className="mt-10 space-y-10">
            {DIRECTORY.map((group) => (
              <div key={group.title}>
                <h3 className="mb-4 text-lg font-bold text-ink">{category(group.title)}</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {group.slugs.map((slug) => {
                    const tool = getTool(slug)!
                    return (
                      <Link
                        key={slug}
                        to={href(`/${slug}`)}
                        className="flex items-start gap-3 rounded-lg border border-line bg-white p-4 transition-colors hover:border-brand/40"
                      >
                        <ToolIcon icon={tool.icon} color={tool.color} size={34} radius={8} />
                        <span className="min-w-0">
                          <span className="block text-[15px] font-bold text-ink" dir="auto">
                            {toolName(tool)}
                          </span>
                          <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted" dir="auto">
                            {toolDesc(tool)}
                          </span>
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* faq */}
      <section className="border-t border-line">
        <div className="container-x py-14">
          <div className="mx-auto max-w-[760px]">
            <h2 className="h-display text-center text-3xl lg:text-4xl">{t('home.faq', 'FAQ')}</h2>
            <div className="mt-8 divide-y divide-line rounded-lg border border-line">
              {FAQ.map((f, i) => (
                <div key={f.q}>
                  <button
                    onClick={() => setOpen(open === i ? null : i)}
                    aria-expanded={open === i}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start"
                  >
                    <span className="text-[15.5px] font-bold text-ink">{t(f.q, FAQ_EN[f.q][0])}</span>
                    <ChevronDown size={18} className={`shrink-0 text-ink-muted transition-transform ${open === i ? 'rotate-180' : ''}`} />
                  </button>
                  {open === i && (
                    <p className="px-5 pb-5 text-[14.5px] leading-relaxed text-ink-soft">{t(f.a, FAQ_EN[f.a][1])}</p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-[14px] text-ink-muted">
              {t('help.more', 'هل تحتاج تفاصيل أكثر؟')}{' '}
              <Link to={href('/help')} className="font-semibold text-brand hover:underline">
                {t('nav.help', 'المساعدة')}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
