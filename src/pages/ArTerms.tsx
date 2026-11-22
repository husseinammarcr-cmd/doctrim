import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { usePageMeta } from '../lib/usePageMeta'
import { useCanonical } from '../lib/seo'

const BLOCKS: { h: string; p: string[] }[] = [
  {
    h: 'الخدمة',
    p: [
      'DocTrim موقع يوفر أدوات لمعالجة ملفات PDF داخل المتصفح أو على سيرفراته، مجاناً وبدون حساب.',
      'أنت مسؤول عن الملفات التي ترفعها أو تعالجها، وعن امتلاكك الحق في تعديلها.',
    ],
  },
  {
    h: 'الاستخدام المقبول',
    p: [
      'لا يجوز استخدام الموقع في أي نشاط غير قانوني، أو لمعالجة محتوى لا تملك حق التعامل معه، أو لمحاولة إرباك الخدمة أو تجاوز حدودها التقنية.',
      'قد نوقف الطلبات الآلية الكثيفة أو التي تضر بالخدمة.',
    ],
  },
  {
    h: 'الملفات والنتائج',
    p: [
      'الملفات التي تُعالج داخل المتصفح لا تصل إلينا إطلاقاً. الملفات التي تُعالج على السيرفر تُحذف فور إرجاع النتيجة، ولا نضمن بقاء أي نسخة للاسترجاع.',
      'نزّل الناتج واحفظه — لا يمكننا استعادته لك لاحقاً.',
    ],
  },
  {
    h: 'حدود المسؤولية',
    p: [
      'نقدّم الأدوات «كما هي» ونسعى لأن تكون دقيقة، لكننا لا نضمن خلوّ الناتج من الأخطاء أو ملاءمته لغرض معيّن. راجع الناتج قبل استخدامه في مستند رسمي أو قانوني.',
      'لا نتحمّل مسؤولية أي خسارة ناتجة عن استخدام الموقع أو عدم القدرة على استخدامه.',
    ],
  },
  {
    h: 'التغييرات',
    p: [
      'قد نضيف أدوات أو نغيّرها أو نوقفها في أي وقت. استمرارك في استخدام الموقع بعد التغييرات يعني قبولك لها.',
      'النسخة الإنجليزية من الشروط على /terms هي المرجع في حال أي اختلاف في الصياغة.',
    ],
  },
]

export default function ArTerms() {
  const { href } = useI18n()
  usePageMeta(
    'شروط الاستخدام — DocTrim',
    'الشروط التي تنطبق عند استخدام DocTrim: طبيعة الخدمة، حقوقك على ملفاتك، الاستخدام المقبول، وحدود المسؤولية.'
  )
  useCanonical('/ar/terms')

  return (
    <div className="bg-white">
      <div className="container-x max-w-[820px] py-12">
        <p className="text-[13px] font-bold uppercase tracking-wide text-brand">قانوني</p>
        <h1 className="h-display mt-2 text-4xl lg:text-5xl">شروط الاستخدام</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          هذه خلاصة عربية للشروط. النسخة الإنجليزية هي النص المرجعي.
        </p>
        <p className="mt-1 text-[13px] text-ink-muted">آخر تحديث: نوفمبر 2026</p>

        <div className="mt-9 space-y-8">
          {BLOCKS.map((b) => (
            <section key={b.h}>
              <h2 className="text-[20px] font-bold text-ink">{b.h}</h2>
              <div className="mt-2.5 space-y-2.5">
                {b.p.map((p) => (
                  <p key={p} className="text-[15px] leading-relaxed text-ink-soft">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-line pt-6 text-[14px]">
          <Link to={href('/privacy')} className="font-semibold text-brand hover:underline">
            سياسة الخصوصية
          </Link>
          <span className="text-ink-muted">·</span>
          <Link to="/terms" className="text-ink-soft hover:text-brand">
            English version
          </Link>
        </div>
      </div>
    </div>
  )
}
