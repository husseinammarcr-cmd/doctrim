import { Link } from 'react-router-dom'
import Hero from '../components/Hero'
import ToolCard from '../components/ToolCard'
import FeatureSection, { type Feature } from '../components/FeatureSection'
import MobileSection from '../components/MobileSection'
import FreeSection from '../components/FreeSection'
import TrustSection from '../components/TrustSection'
import CTASection from '../components/CTASection'
import ToolsDirectory from '../components/ToolsDirectory'
import BlogStrip from '../components/BlogStrip'
import { Reveal, StaggerGroup, StaggerItem } from '../components/motion/Reveal'
import { POPULAR, TOOLS } from '../lib/tools'
import { usePageMeta } from '../lib/usePageMeta'
import { useCanonical } from '../lib/seo'

const FEATURES: Feature[] = [
  {
    title: 'Work Directly on Your Files',
    body: 'Edit, annotate, and sign your PDFs right in the browser. No downloads, no installs — just open a tool and get to work.',
    linkLabel: 'View all PDF tools',
    linkTo: '/pdf-tools',
    variant: 0,
  },
  {
    title: 'Digital Signatures Made Easy',
    body: 'Draw, type, or upload your signature and place it anywhere. Sign documents in seconds and send them on their way.',
    linkLabel: 'Sign a PDF',
    linkTo: '/sign-pdf',
    variant: 1,
  },
  {
    title: 'Create the Perfect Document',
    body: "File too big? Compress it. Need a specific format? Convert it. Things getting chaotic? Merge and split files, or remove excess pages. DocTrim has it all.",
    linkLabel: 'View all PDF tools',
    linkTo: '/pdf-tools',
    variant: 2,
  },
  {
    title: 'Manage Documents—All in One Place',
    body: 'Organize, rotate, and reorder pages with a visual editor. Keep every document tidy and ready to share.',
    linkLabel: 'Organize a PDF',
    linkTo: '/organize-pdf',
    variant: 3,
  },
]

export default function Home() {
  usePageMeta(
    'DocTrim — We make PDF easy.',
    'Free PDF tools that run in your browser: compress, merge, split, convert, sign and edit. No account, no subscription.'
  )
  useCanonical('/')

  return (
    <>
      <Hero />

      {/* Most popular tools */}
      <section className="bg-white">
        <div className="container-x py-14">
          <Reveal>
            <div className="mx-auto max-w-[640px] text-center">
              <h2 className="h-display text-4xl">Most Popular PDF Tools</h2>
              <p className="mt-3 text-lg text-ink-soft">
                {TOOLS.length} tools to convert, compress, and edit PDFs — all free, no sign-up required.
              </p>
            </div>
          </Reveal>
          <StaggerGroup className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
            {POPULAR.map((t) => (
              <StaggerItem key={t.slug} className="h-full">
                <ToolCard tool={t} />
              </StaggerItem>
            ))}
          </StaggerGroup>
          <Reveal delay={0.1}>
            <div className="mt-9 text-center">
              <Link to="/pdf-tools" className="btn-primary btn-lg">
                See All PDF Tools
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white">
        <Reveal>
          <div className="container-x pt-8 text-center">
            <h2 className="h-display text-4xl">Keep Your Simple Tasks Simple</h2>
            <p className="mx-auto mt-3 max-w-[680px] text-lg text-ink-soft">
              DocTrim is the first and only PDF software you'll love. We have all the tools you'll need to start, manage, and finish your work with digital documents.
            </p>
          </div>
        </Reveal>
        {FEATURES.map((f, i) => (
          <FeatureSection key={f.title} feature={f} reverse={i % 2 === 1} />
        ))}
      </section>

      <MobileSection />
      <FreeSection />
      <TrustSection />
      <BlogStrip />
      <CTASection />
      <ToolsDirectory compact />
    </>
  )
}
