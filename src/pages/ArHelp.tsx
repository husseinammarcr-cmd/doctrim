import { Link } from 'react-router-dom'
import { ArrowLeft, Server, ShieldCheck, WifiOff } from 'lucide-react'
import { useI18n } from '../i18n'
import { usePageMeta } from '../lib/usePageMeta'
import { useCanonical, useJsonLd } from '../lib/seo'

const SECTIONS: { icon: typeof ShieldCheck; title: string; items: string[] }[] = [
  {
    icon: ShieldCheck,
    title: 'أين تُعالج ملفاتي؟',
    items: [
      'معظم الأدوات — الدمج، التقسيم، التدوير، ترتيب الصفحات، الضغط، التوقيع، القص، الترقيم، العلامة المائية، والقارئ — تعمل بالكامل داخل متصفحك. الملف لا يُرفع إلى أي سيرفر. في محرر PDF تبقى الإضافات والأشكال والصور والتوقيعات في المتصفح، بينما خطوة إعادة كتابة النص الأصلي تتم على سيرفرنا.',
      'أدوات التحويل المكتبي (Word وExcel وPowerPoint إلى PDF)، والتحويل من PDF إلى Word أو Excel أو PowerPoint، والتعرّف الضوئي على النص (OCR)، والحماية وفك الحماية وتسوية الطبقات (Flatten): تُعالج على سيرفر DocTrim ثم تُحذف الملفات مباشرة بعد انتهاء المعالجة.',
      'لا نحتفظ بنسخة من ملفاتك، ولا نستخدمها لأي غرض آخر.',
    ],
  },
  {
    icon: WifiOff,
    title: 'حدود الاستخدام',
    items: [
      'لا حد يومي على الاستخدام اليدوي. كل الأدوات مجانية بالكامل وبدون علامة مائية على الناتج.',
      'الملفات التي تُعالج على السيرفر: حتى 50 ميغابايت للملف الواحد. إعادة كتابة النص في محرر PDF لا تحتفظ بنسخة بعد الطلب، وأي ملف مؤقت ينتهي خلال 30 دقيقة كحد أقصى.',
      'الأدوات التي تعمل داخل المتصفح تحدّها ذاكرة جهازك — الملفات الكبيرة جداً (مئات الصفحات مع صور كثيفة) قد تكون أبطأ على الجوال.',
      'قد تُطبَّق حدود مؤقتة على الطلبات الآلية الكثيفة أو الطلبات المتزامنة لحماية الخدمة. إذا وصلت الحدّ ستظهر لك مدة الانتظار ثم يعود العدّاد للعمل تلقائياً.',
    ],
  },
  {
    icon: Server,
    title: 'مشاكل شائعة',
    items: [
      '«تعذّر قراءة الملف»: غالباً الملف محمي بكلمة مرور أو تالف. جرّب فتحه في قارئ PDF أولاً، أو استخدم أداة إزالة الحماية إن كنت تعرف كلمة المرور.',
      'نتيجة التعديل لا تبدو مطابقة: PDF يخزّن النص كإحداثيات لا كفقرات، لذلك استبدال كلمة لا يعيد ترتيب السطر. التفاصيل في مقال «تعديل النص داخل PDF».',
      'الضغط لا يقلّل الحجم كثيراً: الملف قد يكون ممسوحاً بجودة عالية. جرّب مستوى «أقصى» مع الملفات الممسوحة.',
      'التحويل من PDF إلى Word يعطي تنسيقاً غير مثالي: الأداة تحاول إعادة بناء الفقرات، والنتيجة تعتمد على بنية الملف الأصلي.',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'الخصوصية والتتبّع',
    items: [
      'لا حساب ولا تسجيل. لا نبيع بياناتك ولا نستخدم أدوات تتبّع عبر المواقع.',
      'نستخدم إحصاءات من طرفنا الأول (بدون كوكيز وبدون تخزين عنوان IP) لمعرفة أي الأدوات تُستخدم وأين تحدث الأخطاء — بلا أسماء ملفات ولا محتوى. نحتفظ بها 180 يوماً كحد أقصى ثم تُحذف تلقائياً.',
      'الإعلانات، حين تُعرض، تأتي عبر Google AdSense وقد تستخدم Google وشركاؤها كوكيزها لعرض إعلانات مبنية على زياراتك السابقة. يمكنك إيقاف الإعلانات المخصّصة من إعدادات إعلانات Google، وحجب الكوكيز لا يعطّل أي أداة.',
      'يمكنك تعطيل الإحصاءات كلياً عبر تفعيل خيار «عدم التتبّع» (Do Not Track) في متصفحك.',
    ],
  },
]

export default function ArHelp() {
  const { t, href } = useI18n()
  usePageMeta(
    'المساعدة — أسئلة شائعة عن DocTrim بالعربية',
    'كيف تعمل أدوات DocTrim، هل تُرفع ملفاتك، حدود حجم الملفات، حل المشاكل الشائعة، ولماذا كل شيء مجاني بدون حساب.'
  )
  useCanonical('/ar/help')
  useJsonLd({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: SECTIONS.flatMap((s) =>
      s.items.map((item) => ({
        '@type': 'Question',
        name: s.title,
        acceptedAnswer: { '@type': 'Answer', text: item },
      }))
    ),
  })

  return (
    <div className="bg-white">
      <div className="container-x py-12">
        <Link to={href('/')} className="inline-flex items-center gap-1 text-[14px] font-semibold text-ink-muted hover:text-brand">
          <ArrowLeft size={15} className="rtl:rotate-180" /> {t('nav.allTools', 'كل الأدوات')}
        </Link>
        <div className="mt-5 max-w-[720px]">
          <h1 className="h-display text-4xl lg:text-5xl">{t('help.title', 'المساعدة')}</h1>
          <p className="mt-3 text-lg text-ink-soft">{t('help.sub', 'أجوبة سريعة عن طريقة عمل DocTrim وملفاتك وحدود الاستخدام.')}</p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {SECTIONS.map((s) => (
            <section key={s.title} className="rounded-lg border border-line p-6">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light text-brand">
                  <s.icon size={18} />
                </span>
                <h2 className="text-[17px] font-bold text-ink">{s.title}</h2>
              </div>
              <ul className="space-y-3">
                {s.items.map((item) => (
                  <li key={item} className="text-[14.5px] leading-relaxed text-ink-soft">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-lg bg-surface p-6 text-center">
          <p className="text-[15px] font-semibold text-ink">لم تجد جوابك؟</p>
          <p className="mt-1 text-[14px] text-ink-muted">
            كل الأدوات تعمل بدون حساب — جرّبها على ملفك مباشرة، أو اقرأ{' '}
            <Link to={href('/privacy')} className="font-semibold text-brand hover:underline">سياسة الخصوصية</Link>.
            لأي سؤال راسلنا على{' '}
            <a href="mailto:Support@doctrim.com" className="font-semibold text-brand hover:underline">
              Support@doctrim.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
