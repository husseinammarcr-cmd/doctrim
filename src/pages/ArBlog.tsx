import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock } from 'lucide-react'
import { Reveal, StaggerGroup, StaggerItem } from '../components/motion/Reveal'
import { categoryColor, categoryLabel, formatDateLong, postsFor, CATEGORIES, type Post } from '../lib/blog'
import { TOOLS } from '../lib/tools'
import { useI18n } from '../i18n'
import { usePageMeta } from '../lib/usePageMeta'
import { SITE_URL, useCanonical, useJsonLd } from '../lib/seo'

function Card({ post, featured = false }: { post: Post; featured?: boolean }) {
  const { href } = useI18n()
  return (
    <Link
      to={href(`/blog/${post.slug}`)}
      className={`group flex flex-col overflow-hidden rounded-xl border border-line bg-white transition-[box-shadow,border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-lift ${
        featured ? 'lg:flex-row' : ''
      }`}
    >
      <div
        className={`shrink-0 ${featured ? 'h-2 lg:h-auto lg:w-2' : 'h-1.5 w-full'}`}
        style={{ background: categoryColor(post.category) }}
      />
      <div className={`flex flex-1 flex-col p-6 ${featured ? 'lg:p-8' : ''}`}>
        <div className="flex flex-wrap items-center gap-2.5 text-[12.5px] font-semibold text-ink-muted">
          <span
            className="rounded-full px-2.5 py-1 text-[11.5px] font-bold text-white"
            style={{ background: categoryColor(post.category) }}
          >
            {categoryLabel(post.category, 'ar')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={12} /> {post.minutes} دقائق
          </span>
          <span aria-hidden>·</span>
          <span>{formatDateLong(post.date, 'ar')}</span>
        </div>
        <h2
          className={`mt-3 font-bold leading-snug text-ink transition-colors group-hover:text-brand ${
            featured ? 'text-[26px] lg:text-[30px]' : 'text-[19px]'
          }`}
        >
          {post.title}
        </h2>
        <p className={`mt-2.5 leading-relaxed text-ink-soft ${featured ? 'text-[16px]' : 'text-[14.5px]'}`}>
          {post.description}
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-brand">
          اقرأ المقال <ArrowRight size={14} className="rtl:rotate-180" />
        </span>
      </div>
    </Link>
  )
}

export default function ArBlog() {
  const { href, t } = useI18n()
  const posts = postsFor('ar')
  const [cat, setCat] = useState('All')

  usePageMeta(
    'مدونة DocTrim — أدلة PDF بالعربية',
    'أدلة عملية بالعربية عن حجم ملفات PDF وحجم الصفحات وحدود التعديل والحجب والتوقيع الإلكتروني — مكتوبة من فريق DocTrim.'
  )
  useCanonical('/ar/blog')
  useJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'مدونة DocTrim',
    url: `${SITE_URL}/ar/blog`,
    inLanguage: 'ar',
    description: 'أدلة عملية عن ضغط PDF وتعديله وخصوصيته وهندسة صفحاته.',
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.description,
      datePublished: p.date,
      url: `${SITE_URL}/ar/blog/${p.slug}`,
    })),
  })

  const featured = posts.find((p) => p.featured) ?? posts[0]
  const rest = posts.filter((p) => p.slug !== featured?.slug && (cat === 'All' || p.category === cat))

  return (
    <div className="bg-white">
      <section className="border-b border-line bg-surface">
        <div className="container-x py-14 lg:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-bold text-brand">
            مدونة DocTrim
          </span>
          <h1 className="h-display mt-5 max-w-[780px] text-[38px] leading-[1.2] sm:text-5xl lg:text-[56px]">
            PDF مشروح <span className="text-brand">بلا تعقيد.</span>
          </h1>
          <p className="mt-5 max-w-[620px] text-lg leading-relaxed text-ink-soft">
            الصيغة التي يستخدمها الجميع ولا يشرحها أحد: من أين تأتي الميغابايتات، ولماذا تُطبع الصفحات
            بهوامش بيضاء، وماذا يتغيّر فعلاً عند «تعديل» نص، ومتى لا يكون الحجب حجباً.
          </p>
          <div className="mt-9 grid max-w-[560px] grid-cols-3 gap-6 border-t border-line pt-6">
            {[
              { value: `${posts.length}`, label: 'مقالات مفصّلة' },
              { value: `${TOOLS.length}`, label: 'أداة مجانية' },
              { value: '0', label: 'تسجيلات مطلوبة' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-ink">{s.value}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x py-12">
        {featured && (
          <Reveal>
            <Card post={featured} featured />
          </Reveal>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-2">
          {['All', ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full border px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors ${
                cat === c
                  ? 'border-brand bg-brand text-white'
                  : 'border-line bg-white text-ink-soft hover:border-brand/40 hover:text-brand'
              }`}
            >
              {c === 'All' ? 'الكل' : categoryLabel(c, 'ar')}
            </button>
          ))}
        </div>

        <StaggerGroup className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
          {rest.map((p) => (
            <StaggerItem key={p.slug} className="h-full">
              <Card post={p} />
            </StaggerItem>
          ))}
        </StaggerGroup>

        {rest.length === 0 && (
          <p className="mt-10 text-center text-[15px] text-ink-muted">لا مقالات في هذا التصنيف بعد.</p>
        )}

        <div className="mt-14 rounded-xl border border-line bg-surface/60 p-6 text-center">
          <p className="text-[16px] font-bold text-ink">{t('help.more', 'هل تحتاج تفاصيل أكثر؟')}</p>
          <p className="mt-1.5 text-[14.5px] text-ink-soft">
            كل الأدوات تعمل بدون حساب —{' '}
            <Link to={href('/pdf-tools')} className="font-semibold text-brand hover:underline">
              تصفّح الأدوات
            </Link>{' '}
            أو{' '}
            <Link to={href('/help')} className="font-semibold text-brand hover:underline">
              اقرأ صفحة المساعدة
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  )
}
