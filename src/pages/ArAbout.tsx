import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { usePageMeta } from '../lib/usePageMeta'
import { useCanonical } from '../lib/seo'
import { TOOLS } from '../lib/tools'

export default function ArAbout() {
  const { href } = useI18n()
  usePageMeta(
    'من نحن — DocTrim',
    'DocTrim مشروع صغير مستقل يبني أدوات PDF مجانية تحترم الخصوصية، ومعظمها يعمل داخل المتصفح — بدون حساب وبدون تثبيت وبدون اشتراك.'
  )
  useCanonical('/ar/about')

  return (
    <div className="bg-white">
      <div className="container-x max-w-[820px] py-14">
        <p className="text-[13px] font-bold uppercase tracking-wide text-brand">من نحن</p>
        <h1 className="h-display mt-2 text-4xl lg:text-5xl">أدوات PDF بلا تعقيد.</h1>

        <div className="mt-6 space-y-4 text-[16px] leading-relaxed text-ink-soft">
          <p>
            DocTrim مشروع صغير مستقل. الفكرة بسيطة: المهمة الواحدة على ملف PDF — ضغطه، دمجه، تقسيمه،
            توقيعه، تحويله — يجب أن تنتهي في أقل من دقيقة، بدون حساب، وبدون رفع الملف إلى سيرفر إلا
            عندما تكون المعالجة على السيرفر ضرورية فعلاً.
          </p>
          <p>
            لهذا بُنيت معظم الأدوات ({TOOLS.length} أداة) لتعمل داخل المتصفح: المحرك يقرأ ملفك ويعدّله
            ويخرج الناتج على جهازك. عشر أدوات تحتاج معالجة على السيرفر (التحويل المكتبي، والتحويل من
            PDF، والتعرّف الضوئي، والحماية وفك الحماية وFlatten) ترسل الملف إلى سيرفر واحد مخصّص،
            ويُحذف مباشرة بعد إرجاع النتيجة — وكذلك خطوة إعادة كتابة النص في محرر PDF.
          </p>
          <p>
            لا نبيع بيانات، ولا نضع علامة مائية، ولا نخفي الميزات خلف اشتراك. التكلفة تُغطّى من الموقع
            نفسه، والأدوات تبقى مجانية بالكامل.
          </p>
          <p>
            الموقع متاح بالعربية والإنجليزية. النسخة العربية ليست ترجمة آلية — كل صفحة مكتوبة بالعربية،
            وكل أداة لها عنوان ووصف عربي، وكل مقال له نسخة عربية.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { v: `${TOOLS.length}`, l: 'أداة مجانية' },
            { v: '0', l: 'حسابات أو تسجيلات' },
            { v: '100%', l: 'بدون علامة مائية' },
          ].map((s) => (
            <div key={s.l} className="rounded-lg border border-line p-5">
              <p className="text-2xl font-bold text-ink">{s.v}</p>
              <p className="mt-1 text-[13.5px] text-ink-muted">{s.l}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6 text-[14px]">
          <Link to={href('/pdf-tools')} className="btn-primary btn-md">
            تصفّح الأدوات
          </Link>
          <Link to={href('/help')} className="font-semibold text-brand hover:underline">
            المساعدة
          </Link>
          <span className="text-ink-muted">·</span>
          <Link to="/about" className="text-ink-soft hover:text-brand">
            English version
          </Link>
        </div>
      </div>
    </div>
  )
}
