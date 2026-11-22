import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Search } from 'lucide-react'
import ToolCard from '../components/ToolCard'
import { getTool } from '../lib/tools'
import { usePageMeta } from '../lib/usePageMeta'
import { useI18n } from '../i18n'

export default function NotFound() {
  const { isAr, t, href } = useI18n()
  usePageMeta(
    isAr ? 'الصفحة غير موجودة — DocTrim' : 'Page not found — DocTrim',
    isAr
      ? 'هذه الصفحة غير موجودة. ارجع إلى أدوات PDF المجانية أو تصفّح دليل الأدوات.'
      : 'This page does not exist. Jump back into the free PDF tools or search the tools directory.'
  )

  return (
    <div className="bg-white">
      <section className="border-b border-line bg-surface">
        <div className="container-x py-20 lg:py-28">
          <div className="mx-auto max-w-[620px] text-center">
            <p className="text-[84px] font-black leading-none tracking-tighter text-brand/15 lg:text-[120px]">
              404
            </p>
            <h1 className="h-display mt-2 text-4xl leading-tight lg:text-5xl">
              {isAr ? 'هذه الصفحة غير موجودة.' : 'This page went missing.'}
            </h1>
            <p className="mt-4 text-lg text-ink-soft">
              {isAr
                ? 'قد يكون الرابط قديماً أو مكتوباً بشكل خاطئ، أو يشير إلى أداة لم تُطلق بعد. لا شيء معطّل من جهتك — وملفاتك ما زالت على جهازك.'
                : 'The link may be old, mistyped, or pointing at a tool that has not shipped yet. Nothing is broken on your side — and your files are still on your device.'}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to={href('/')} className="btn-primary btn-lg">
                <ArrowLeft size={18} className="rtl:rotate-180" /> {isAr ? 'إلى الرئيسية' : 'Back to home'}
              </Link>
              <Link to={href('/pdf-tools')} className="btn-ghost btn-lg">
                <Search size={18} /> {isAr ? 'تصفّح كل الأدوات' : 'Browse all tools'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-x py-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="h-display text-2xl">{isAr ? 'الأكثر استخداماً الآن' : 'Popular right now'}</h2>
          <Link to="/pdf-tools" className="hidden items-center gap-1 text-[14px] font-semibold text-brand hover:underline sm:flex">
            {t('nav.allTools', 'All PDF tools')} <ArrowRight size={15} className="rtl:rotate-180" />
          </Link>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {['merge-pdf', 'compress-pdf', 'split-pdf', 'sign-pdf', 'crop-pdf', 'rotate-pdf'].map((slug) => {
            const t = getTool(slug)
            return t ? <ToolCard key={slug} tool={t} /> : null
          })}
        </div>
      </section>
    </div>
  )
}
