import type { Metadata } from 'next';
import Link from 'next/link';
import SiteNav from '../SiteNav';

export const metadata: Metadata = {
  title: 'How It Works | ThingyCare',
  robots: { index: false, follow: false },
};

function EquationCard({
  icon,
  label,
  tone,
}: {
  icon: string;
  label: string;
  tone: 'teal' | 'lime' | 'navy';
}) {
  const bg = tone === 'teal' ? 'bg-tc-teal-light' : tone === 'lime' ? 'bg-tc-lime/15' : 'bg-tc-navy text-white';
  return (
    <div className={`flex-1 rounded-xl p-4 text-center ${bg}`}>
      <div className="text-2xl mb-1" aria-hidden>{icon}</div>
      <div className="text-xs font-semibold uppercase tracking-wide">{label}</div>
    </div>
  );
}

function Op({ children }: { children: string }) {
  return (
    <div className="flex items-center justify-center text-tc-muted font-display text-xl" aria-hidden>
      {children}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-tc-surface border border-tc-border rounded-2xl p-5 md:p-8 shadow-sm">
      <h2 className="font-display text-lg md:text-xl font-bold mb-2">{title}</h2>
      {children}
    </section>
  );
}

export default function HowItWorks() {
  return (
    <main className="min-h-screen bg-tc-bg text-tc-navy">
      <header className="bg-tc-navy text-white">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex-1 flex items-center gap-3">
            <img
              src="/4107097-ThingyCare_Icon.svg"
              alt="ThingyCare logo"
              className="w-9 h-9 object-contain"
            />
            <div>
              <div className="font-display font-bold text-lg leading-tight">ThingyCare</div>
              <div className="text-xs text-white/60 leading-tight">Warranty Value Analyzer</div>
            </div>
          </div>
          <SiteNav />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8">
        <div>
          <h1 className="font-display text-2xl md:text-4xl font-bold leading-tight mb-3">
            How the calculator works
          </h1>
          <p className="text-sm md:text-base text-tc-muted leading-relaxed">
            No maths required — this page explains the thinking behind every number the calculator
            shows you. The actual figures we use are different for every product type, and they stay
            private, so nothing here can be used to copy the results.
          </p>
        </div>

        {/* The big idea */}
        <Section title="The big idea">
          <p className="text-sm text-tc-muted leading-relaxed">
            A warranty is a bet. The company is betting that nothing goes wrong with your product;
            you are betting that it does. Like any bet, there is a fair price — and it depends on two
            things: how likely it is that something breaks, and what fixing it would cost.
          </p>
          <p className="text-sm text-tc-muted leading-relaxed mt-3">
            The calculator works out that fair price, then compares it to what you have been asked to
            pay. That&apos;s the whole trick.
          </p>
          <div className="mt-6 flex items-stretch gap-2 sm:gap-3 text-center">
            <EquationCard icon="⚠️" label="How likely is a breakdown?" tone="teal" />
            <Op>×</Op>
            <EquationCard icon="🔧" label="What would a repair cost?" tone="teal" />
            <Op>=</Op>
            <EquationCard icon="💰" label="A fair price for the warranty" tone="navy" />
          </div>
        </Section>

        {/* Defects vs accidents */}
        <Section title="Two different ways things go wrong">
          <p className="text-sm text-tc-muted leading-relaxed">
            The calculator keeps two kinds of bad luck apart, because warranties treat them very
            differently.
          </p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-tc-border rounded-xl p-4">
              <div className="text-2xl mb-1" aria-hidden>⚙️</div>
              <h3 className="font-display text-sm font-bold mb-1">Defects</h3>
              <p className="text-xs text-tc-muted leading-relaxed">
                The product fails on its own — a manufacturing fault or a part that gives out. These
                are built into the product before it ever reaches you.
              </p>
            </div>
            <div className="border border-tc-border rounded-xl p-4">
              <div className="text-2xl mb-1" aria-hidden>📱</div>
              <h3 className="font-display text-sm font-bold mb-1">Accidents</h3>
              <p className="text-xs text-tc-muted leading-relaxed">
                Drops, spills, and other clumsy moments. These depend on you and your household, not
                on the product — so they are estimated separately.
              </p>
            </div>
          </div>
          <p className="text-sm text-tc-muted leading-relaxed mt-4">
            Every product type gets its own estimate for each. A wall-mounted TV is rarely dropped; a
            phone in a teenager&apos;s pocket is a different story.
          </p>
        </Section>

        {/* Bathtub curve */}
        <Section title="Breakdowns don't happen evenly">
          <p className="text-sm text-tc-muted leading-relaxed">
            Products tend to fail in a pattern that looks like a bathtub laid on its side. Lots of
            failures early (lemons that were faulty from the start), then a calm stretch, then more
            failures near the end of life as parts wear out.
          </p>
          <svg
            viewBox="0 0 600 200"
            className="mt-5 w-full rounded-xl border border-tc-border bg-white"
            role="img"
            aria-label="A bathtub-shaped curve: high at the start, low in the middle, rising again at the end, showing when failures happen over the years of ownership."
          >
            {/* axes */}
            <line x1="60" y1="20" x2="60" y2="160" stroke="#e5e9f0" strokeWidth="2" />
            <line x1="60" y1="160" x2="560" y2="160" stroke="#e5e9f0" strokeWidth="2" />
            {/* the curve */}
            <path
              d="M 60 30 C 140 40, 160 120, 300 130 C 420 138, 470 100, 560 45"
              fill="none"
              stroke="#36949b"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <text x="70" y="35" fontSize="13" fill="#5b6b82">Early faults (lemons)</text>
            <text x="250" y="152" fontSize="13" fill="#5b6b82" textAnchor="middle">The quiet years</text>
            <text x="548" y="70" fontSize="13" fill="#5b6b82" textAnchor="end">Wear-out</text>
            <text x="300" y="190" fontSize="12" fill="#5b6b82" textAnchor="middle">Time since you bought it →</text>
            <text x="26" y="90" fontSize="12" fill="#5b6b82" textAnchor="middle" transform="rotate(-90 26 90)">Chance of failure →</text>
          </svg>
          <p className="text-sm text-tc-muted leading-relaxed mt-4">
            Why this matters: a warranty that only lasts a year or two captures the early-fault burst
            and not much else — which makes it worth less than you might think.
          </p>
        </Section>

        {/* Overlap */}
        <Section title="You already have cover you didn't pay for">
          <p className="text-sm text-tc-muted leading-relaxed">
            Two things already protect you for free:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-tc-muted leading-relaxed list-disc pl-5">
            <li>
              <strong className="text-tc-navy">The manufacturer&apos;s warranty</strong> that comes
              with the product.
            </li>
            <li>
              <strong className="text-tc-navy">Your consumer rights under the law</strong> — in many
              countries, goods must last a reasonable length of time, no matter what the paperwork
              says. In the US this depends on your state.
            </li>
          </ul>
          <p className="text-sm text-tc-muted leading-relaxed mt-3">
            A paid warranty starts counting from the day you buy, so for a big chunk of its life it
            simply sits on top of cover you already had. Anything that happens during that overlap was
            going to be fixed for free anyway — so it adds nothing to what the paid warranty is worth.
          </p>
          {/* overlap diagram */}
          <svg
            viewBox="0 0 600 190"
            className="mt-5 w-full rounded-xl border border-tc-border bg-white"
            role="img"
            aria-label="A timeline showing the manufacturer's warranty and legal rights overlapping with the paid warranty, so only the tail end of the paid warranty adds new cover."
          >
            {/* time axis */}
            <line x1="40" y1="160" x2="560" y2="160" stroke="#e5e9f0" strokeWidth="2" />
            <text x="40" y="182" fontSize="12" fill="#5b6b82">Day you buy</text>
            <text x="560" y="182" fontSize="12" fill="#5b6b82" textAnchor="end">Years later →</text>
            {/* mfr warranty */}
            <rect x="40" y="30" width="200" height="34" rx="8" fill="#182c49" />
            <text x="52" y="52" fontSize="12" fill="#ffffff">Manufacturer's warranty (free)</text>
            {/* legal rights */}
            <rect x="40" y="76" width="380" height="34" rx="8" fill="#36949b" />
            <text x="52" y="98" fontSize="12" fill="#ffffff">Your legal rights (free)</text>
            {/* paid warranty */}
            <rect x="40" y="122" width="500" height="34" rx="8" fill="#76c422" />
            <rect x="40" y="122" width="380" height="34" rx="8" fill="url(#hatch)" />
            <defs>
              <pattern id="hatch" width="10" height="10" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <rect width="10" height="10" fill="#76c422" />
                <line x1="0" y1="0" x2="0" y2="10" stroke="#ffffff" strokeWidth="4" opacity="0.55" />
              </pattern>
            </defs>
            <text x="52" y="144" fontSize="12" fill="#182c49">Paid warranty — striped part overlaps free cover</text>
            <text x="432" y="144" fontSize="12" fill="#182c49">← only this stretch is new</text>
          </svg>
          <p className="text-sm text-tc-muted leading-relaxed mt-4">
            The calculator&apos;s job is to find the stretch where the paid warranty is the{' '}
            <em>only</em> thing covering you — and value the warranty on that stretch alone.
          </p>
        </Section>

        {/* Credit card */}
        <Section title="Your credit card may chip in too">
          <p className="text-sm text-tc-muted leading-relaxed">
            Many credit cards quietly include two perks when you pay with them:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-tc-muted leading-relaxed list-disc pl-5">
            <li>
              <strong className="text-tc-navy">Extended warranty:</strong> extra months added on top of
              the manufacturer&apos;s warranty — free.
            </li>
            <li>
              <strong className="text-tc-navy">Purchase protection:</strong> a short window right
              after purchase where drops and spills are covered — usually with no extra fee per claim.
            </li>
          </ul>
          <p className="text-sm text-tc-muted leading-relaxed mt-3">
            Where your card already pays, the paid warranty again adds nothing. The calculator
            subtracts these windows the same way it subtracts the legal overlap.
          </p>
        </Section>

        {/* Hassle */}
        <Section title="One honest bonus: less arguing">
          <p className="text-sm text-tc-muted leading-relaxed">
            There is one thing a paid warranty genuinely does that free cover doesn&apos;t: when
            something breaks, you call the warranty company instead of arguing with the retailer
            about what the law requires. If that peace of mind matters to you, the calculator lets
            you put a dollar value on the hassle you&apos;d avoid — and adds it to the fair price.
          </p>
        </Section>

        {/* Putting it together */}
        <Section title="Putting it all together">
          <p className="text-sm text-tc-muted leading-relaxed">
            Step by step, here is what happens when you press the button:
          </p>
          <ol className="mt-4 space-y-3 text-sm text-tc-muted leading-relaxed">
            {[
              'Estimate the chance of a defect and the chance of an accident for your product type.',
              'Spread those failures across the years you own the product, using the bathtub pattern.',
              'Walk through the timeline and, for each failure, work out who would pay for it: the manufacturer, the law, your credit card, the paid warranty, or nobody.',
              'Keep only what the paid warranty uniquely pays for, add the hassle saving, and that is the fair price.',
              'Compare the fair price with the price on the offer in front of you — and give you a verdict.',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-tc-teal text-white font-display text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-tc-muted leading-relaxed mt-5">
            Everything is an estimate based on general research about how products fail — not on
            insider data about any specific model or retailer. If you tune the assumptions in the
            expert settings, every number on the page updates instantly so you can see how fragile or
            sturdy the conclusion is.
          </p>
        </Section>

        <div className="text-center pt-2 pb-4">
          <Link
            href="/"
            className="inline-block bg-tc-teal hover:bg-tc-teal-dark text-white font-display font-bold text-sm rounded-full px-6 py-3 transition-colors"
          >
            Try the calculator
          </Link>
        </div>
      </div>
    </main>
  );
}
