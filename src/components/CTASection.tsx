import { Link } from 'react-router-dom'

export default function CTASection() {
  return (
    <section className="bg-white">
      <div className="container-x py-16 text-center">
        <h2 className="h-display text-4xl lg:text-[40px]">Free PDF Tools, No Strings Attached</h2>
        <p className="mx-auto mt-3 max-w-[600px] text-lg text-ink-soft">
          No account to create, no card to enter, no subscription to cancel. Pick a tool and finish your document in
          seconds.
        </p>
        <Link to="/pdf-tools" className="btn-primary btn-lg mt-7">
          Browse All Free Tools
        </Link>
      </div>
    </section>
  )
}
