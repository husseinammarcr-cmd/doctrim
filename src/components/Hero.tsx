import { Link } from 'react-router-dom'
import HeroIllustration from './HeroIllustration'

export default function Hero() {
  return (
    <section className="overflow-hidden">
      <div className="container-x grid items-center gap-10 pt-12 pb-6 lg:grid-cols-[45fr_55fr] lg:pt-16 lg:pb-8">
        <div>
          <h1 className="h-display text-5xl leading-[1.05] sm:text-6xl lg:text-[64px] font-black">
            We make PDF easy.
          </h1>
          <p className="mt-6 max-w-[520px] text-xl leading-relaxed text-ink-soft">
            All the tools you'll need to be more productive and work smarter with documents.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="#pricing" className="btn-primary btn-lg">Start Free Trial</a>
            <Link to="/pdf-tools" className="btn-outline btn-lg">Explore All PDF Tools</Link>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[560px]">
          <HeroIllustration />
        </div>
      </div>
    </section>
  )
}
