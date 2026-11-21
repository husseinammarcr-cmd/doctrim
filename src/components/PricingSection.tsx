import { Check, User, Users } from 'lucide-react'

const PLANS = [
  {
    name: 'Pro',
    icon: User,
    price: '7.50',
    unit: 'per month',
    tagline: 'For individuals who want unlimited PDF power.',
    features: [
      'Unlimited access to all PDF tools',
      'No ads, no daily limits',
      'Compress, convert & e-sign',
      'OCR for scanned documents',
      'Priority processing',
    ],
    highlight: false,
  },
  {
    name: 'Team',
    icon: Users,
    price: '6.00',
    unit: 'per user / month',
    tagline: 'For teams that work with documents together.',
    features: [
      'Everything in Pro',
      'Centralized billing & admin',
      'Team member management',
      'Shared templates & workflows',
      'Dedicated support',
    ],
    highlight: true,
  },
]

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-white">
      <div className="container-x py-16">
        <div className="mx-auto max-w-[640px] text-center">
          <h2 className="h-display text-4xl lg:text-[40px]">Plans &amp; Pricing</h2>
          <p className="mt-3 text-lg text-ink-soft">
            Get unlimited access to DocTrim tools for you and your team with pricing that's right for you.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-[820px] gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`card relative flex flex-col p-8 ${plan.highlight ? 'border-brand shadow-lift' : ''}`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-8 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
                  Most popular
                </span>
              )}
              <div className="flex items-center gap-2">
                <plan.icon size={20} className="text-ink" />
                <h3 className="text-2xl font-bold text-ink">{plan.name}</h3>
              </div>
              <p className="mt-2 text-[15px] text-ink-muted">{plan.tagline}</p>
              <div className="mt-5 flex items-end gap-1">
                <span className="text-4xl font-black text-ink">${plan.price}</span>
                <span className="pb-1 text-[14px] text-ink-muted">{plan.unit}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[15px] text-ink-soft">
                    <Check size={18} className="mt-0.5 shrink-0 text-brand" />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#pricing" className={`btn-lg mt-7 w-full ${plan.highlight ? 'btn-primary' : 'btn-outline'}`}>
                Start Free Trial
              </a>
              <p className="mt-3 text-center text-[13px] text-ink-muted">7-day free trial · cancel anytime</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
