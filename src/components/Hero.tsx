import { Link } from 'react-router-dom'
import HeroIllustration from './HeroIllustration'

export default function Hero() {
  return (
    <section className="overflow-hidden">
      <div className="container-x grid items-center gap-10 pt-12 pb-6 lg:grid-cols-[45fr_55fr] lg:pt-16 lg:pb-8">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-light px-3.5 py-1.5 text-[13px] font-bold text-brand">
            100% free · no account needed
          </span>
          <h1 className="h-display mt-4 text-5xl leading-[1.05] sm:text-6xl lg:text-[64px] font-black">
            We make PDF easy.
          </h1>
          <p className="mt-6 max-w-[520px] text-xl leading-relaxed text-ink-soft">
            All the tools you'll need to be more productive with documents — free, unlimited, and with no sign-up.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/pdf-tools" className="btn-primary btn-lg">
              Start Now — Free
            </Link>
            <Link to="/compress-pdf" className="btn-outline btn-lg">
              Compress a PDF
            </Link>
          </div>
          <p className="mt-4 text-[14px] text-ink-muted">
            No login. No registration. No subscription. Just drop a file and go.
          </p>
        </div>
        <div className="relative mx-auto w-full max-w-[560px]">
          <HeroIllustration />
        </div>
      </div>
    </section>
  )
}
