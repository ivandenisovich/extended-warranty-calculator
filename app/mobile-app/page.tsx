import type { Metadata } from 'next';
import Link from 'next/link';
import SiteNav from '../SiteNav';
import { getCategoryRule, getEwPricingConfig, getCalculatorDefaults, getUsTierRule } from '../jurisdictionRules.server';
import { evaluateWarranty, type EvaluationInput } from '../warrantyEngine';
import { ewPrice, ewExcess } from '../../lib/ewPricingModel';
import PhoneFrame from '../PhoneFrame';
import VerdictGauge from '../VerdictGauge';
import PlanCard, { type PlanInfo } from '../PlanCard';

export const metadata: Metadata = {
  title: 'Mobile App Preview | ThingyCare',
  robots: { index: false, follow: false },
};

// The demo product shown in the phone frame. Prices and verdicts are
// computed live from the same models the calculator uses.
const DEMO = {
  name: 'SoundCore P40i Earbuds',
  price: 129,
  category: 'audio',
  purchased: '16 Nov 2025',
  location: 'Boston, MA',
  mfrYears: 1,
  extraYears: 2,
};

export default async function MobileAppPage() {
  const [pricing, category, defaults, usTier] = await Promise.all([
    getEwPricingConfig(),
    getCategoryRule(DEMO.category),
    getCalculatorDefaults(),
    getUsTierRule('MA'),
  ]);

  const extendedYears = DEMO.mfrYears + DEMO.extraYears;

  const evalPlan = (includesAccidental: boolean, quotedExcess: number) =>
    evaluateWarranty({
      productPrice: DEMO.price,
      productCategory: DEMO.category,
      mfrYears: DEMO.mfrYears,
      extendedWarrantyYears: extendedYears,
      ownershipYears: defaults.ownershipYears,
      jurisdiction: 'united-states',
      ccExtensionMonths: defaults.ccExtensionMonths,
      ccExcess: defaults.ccExcess,
      frictionCost: defaults.frictionCost,
      purchaseProtectionDays: defaults.purchaseProtectionDays,
      includesAccidental,
      quotedExcess,
      categoryRule: category,
      usTier,
    } satisfies EvaluationInput);

  const defectOnlyEval = evalPlan(false, 0);
  const withAccidentalEval = evalPlan(true, ewExcess(pricing, DEMO.price));

  const plans: PlanInfo[] = [
    {
      key: 'defect-only',
      title: 'Defects only',
      tagline: 'Fixes it when it breaks on its own',
      marketPrice: Math.round(ewPrice(pricing, DEMO.price, DEMO.category, DEMO.extraYears, false)),
      fairPrice: Math.round(defectOnlyEval.breakEven.atQuotedExcess),
      accent: 'navy',
    },
    {
      key: 'with-accidental',
      title: 'Defects + accidental',
      tagline: 'Also covers drops, spills and cracks',
      marketPrice: Math.round(ewPrice(pricing, DEMO.price, DEMO.category, DEMO.extraYears, true)),
      fairPrice: Math.round(withAccidentalEval.breakEven.atQuotedExcess),
      excess: ewExcess(pricing, DEMO.price),
      accent: 'teal',
    },
  ];

  // Headline verdict uses the accidental-inclusive plan (the typical offer).
  const headline = plans[1];
  const headlineRatio = headline.marketPrice / Math.max(headline.fairPrice, 0.01);
  const verdict = headlineRatio <= 1 ? 'worth-it' : headlineRatio <= 1.25 ? 'borderline' : 'skip-it';

  return (
    <main className="min-h-screen bg-tc-bg text-tc-navy">
      <header className="bg-tc-navy text-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center gap-3">
          <img
            src="/4107097-ThingyCare_Icon.svg"
            alt="ThingyCare logo"
            className="w-9 h-9 object-contain"
          />
          <div className="flex-1">
            <div className="font-display font-bold text-lg leading-tight">ThingyCare</div>
            <div className="text-xs text-white/60 leading-tight">Warranty Value Analyzer</div>
          </div>
          <SiteNav active="mobile-app" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl md:text-4xl font-bold leading-tight mb-3">
            The ThingyCare mobile app
          </h1>
          <p className="text-sm md:text-base text-tc-muted max-w-xl mx-auto leading-relaxed">
            Know if a warranty is worth it — right at the register. This is a preview of the
            ThingyCare app showing a registered product and whether its protection plans make sense.
          </p>
        </div>

        <PhoneFrame>
          {/* status bar */}
          <div className="flex items-center justify-between px-6 pt-3 pb-1 text-xs font-semibold text-tc-navy">
            <span>9:41</span>
            <div className="w-20 h-6 bg-tc-navy rounded-full" />
            <span className="flex gap-0.5 items-center">
              <span className="w-1.5 h-3 bg-tc-lime rounded-sm" />
              <span className="w-1.5 h-3 bg-tc-lime rounded-sm" />
              <span className="w-1.5 h-3 bg-tc-lime rounded-sm" />
              <span className="w-1.5 h-3 bg-tc-border rounded-sm" />
            </span>
          </div>
          {/* app header */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-tc-border">
            <span className="text-tc-teal font-display text-xl leading-none">‹</span>
            <h2 className="font-display font-bold text-lg">My Thingy</h2>
          </div>
          {/* hero photo with badges */}
          <div className="px-5 pt-4">
            <div className="relative rounded-2xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.pexels.com/photos/3921864/pexels-photo-3921864.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
                alt="Wireless earbuds in a charging case on a marble surface"
                className="w-full h-44 object-cover"
              />
              <span className="absolute top-3 left-3 bg-tc-lime text-tc-navy text-xs font-bold px-3 py-1.5 rounded-full shadow">
                ✓ Registered
              </span>
              <span className="absolute top-3 right-3 bg-tc-orange text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">
                1 protection needs attention
              </span>
            </div>
          </div>
          {/* product details card */}
          <div className="mx-5 mt-4 bg-white rounded-2xl p-4 shadow-sm border border-tc-border">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-display font-bold text-lg leading-tight pr-2">{DEMO.name}</h3>
              <span className="font-numeric font-bold text-tc-lime-dark text-xl">${DEMO.price}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted">Purchased</div>
                <div className="font-semibold">{DEMO.purchased}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted">Location</div>
                <div className="font-semibold">{DEMO.location}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted">Price paid</div>
                <div className="font-semibold font-numeric">${DEMO.price}.00</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted">Category</div>
                <div className="font-semibold">{category.name}</div>
              </div>
            </div>
          </div>

          {/* verdict section (replaces the stars) */}
          <div className="mx-5 mt-4 mb-6">
            <VerdictGauge
              marketPrice={headline.marketPrice}
              fairPrice={headline.fairPrice}
              verdict={verdict}
            />
            <div className="grid grid-cols-1 gap-3 mt-3">
              {plans.map((p) => (
                <PlanCard key={p.key} plan={p} />
              ))}
            </div>
            <p className="text-[11px] text-tc-muted leading-relaxed mt-3 text-center">
              Accidental cover costs about 75% more — worth it for drop-prone items like phones and
              headphones. Estimates only, based on how products typically fail.
            </p>
          </div>
        </PhoneFrame>

        <div className="text-center pt-8 pb-4">
          <Link
            href="/"
            className="inline-block bg-tc-teal hover:bg-tc-teal-dark text-white font-display font-bold text-sm rounded-full px-6 py-3 transition-colors"
          >
            Try the full calculator
          </Link>
        </div>
      </div>
    </main>
  );
}
