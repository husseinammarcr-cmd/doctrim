import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { usePageMeta } from '../lib/usePageMeta'
import { useCanonical } from '../lib/seo'

const BLOCKS: { h: string; p: string[] }[] = [
  {
    h: 'باختصار',
    p: [
      'لا حساب، لا بريد إلكتروني، لا كوكيز إعلانية. معظم الأدوات تعالج ملفك داخل متصفحك ولا يُرسل إلى أي سيرفر.',
      'الأدوات التي تحتاج معالجة على السيرفر (تحويل Office، OCR، الحماية) تُعالج على سيرفر DocTrim وتُحذف الملفات مباشرة بعد انتهاء الطلب.',
    ],
  },
  {
    h: 'الملفات',
    p: [
      'الملفات التي تُعالج داخل المتصفح لا تغادر جهازك إطلاقاً — لا نصوّرها ولا نخزّنها ولا نطّلع عليها.',
      'الملفات التي تُعالج على السيرفر تُستقبل على جهاز واحد مخصّص لهذا الغرض، تُعالج في مجلد مؤقت، ثم يُحذف المجلد بعد إرجاع النتيجة. لا نحتفظ بنسخ احتياطية ولا بأرشيف.',
    ],
  },
  {
    h: 'الإحصاءات',
    p: [
      'نستخدم إحصاءات من طرفنا الأول لمعرفة الصفحات والأدوات المستخدمة ولرصد الأخطاء. لا نستخدم Google Analytics ولا أي خدمة تتبّع خارجية.',
      'ما يُسجَّل: اسم الحدث (فتح صفحة، إضافة ملف، نجاح أو فشل المعالجة، تنزيل)، المسار، اسم الأداة، ومدة المعالجة. لا أسماء ملفات ولا محتوى ملفات ولا نصوص.',
      'عنوان IP لا يُخزَّن. يُحوَّل إلى بصمة مشفّرة بمفتاح يتغيّر كل يوم فقط لعدّ الزوار الفريدين، ولا يمكن ربطه بزيارة في يوم آخر.',
      'يمكنك إيقاف الإحصاءات تماماً بتفعيل «عدم التتبّع» (Do Not Track) في متصفحك.',
    ],
  },
  {
    h: 'ما يُخزَّن في متصفحك',
    p: [
      'نحفظ اختيار اللغة فقط (عربي/إنجليزي) في الذاكرة المحلية للمتصفح حتى لا نسألك كل مرة. لا شيء آخر يُخزَّن على جهازك، ويمكنك مسحه من إعدادات المتصفح في أي وقت.',
    ],
  },
  {
    h: 'أطراف أخرى',
    p: [
      'الخطوط تُحمّل من Google Fonts، وهذا الطلب التقني يمر عبر خوادم Google. لا نرسل إليها أي بيانات عن ملفاتك أو استخدامك للأدوات.',
      'لا نبيع أي بيانات، ولا نشاركها مع معلنين، ولا نستخدم أدوات تتبّع عبر المواقع.',
    ],
  },
  {
    h: 'التغييرات والتواصل',
    p: [
      'إذا تغيّرت هذه السياسة سنحدّث هذه الصفحة. النسخة الإنجليزية من السياسة متاحة على /privacy، وهي المرجع في حال أي اختلاف في الصياغة.',
    ],
  },
]

export default function ArPrivacy() {
  const { t, href } = useI18n()
  usePageMeta(
    'سياسة الخصوصية — DocTrim',
    'كيف يتعامل DocTrim مع ملفاتك: معالجة داخل المتصفح، بدون حساب، بدون تتبّع عبر المواقع، وحذف الملفات من السيرفر فوراً.'
  )
  useCanonical('/ar/privacy')

  return (
    <div className="bg-white">
      <div className="container-x max-w-[820px] py-12">
        <p className="text-[13px] font-bold uppercase tracking-wide text-brand">قانوني</p>
        <h1 className="h-display mt-2 text-4xl lg:text-5xl">{t('privacy.title', 'الخصوصية')}</h1>
        <p className="mt-3 text-lg text-ink-soft">{t('privacy.sub', 'كيف نتعامل مع ملفاتك وبياناتك، باختصار وبدون تعقيد.')}</p>
        <p className="mt-2 text-[13px] text-ink-muted">آخر تحديث: نوفمبر 2026</p>

        <div className="mt-10 space-y-8">
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
          <Link to={href('/help')} className="font-semibold text-brand hover:underline">
            {t('nav.help', 'المساعدة')}
          </Link>
          <span className="text-ink-muted">·</span>
          <Link to="/privacy" className="text-ink-soft hover:text-brand">
            English version
          </Link>
        </div>
      </div>
    </div>
  )
}
