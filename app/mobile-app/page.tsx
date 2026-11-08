import type { Metadata } from 'next';
import Link from 'next/link';
import SiteNav from '../SiteNav';
import { getCategoryRule, getEwPricingConfig, getCalculatorDefaults, getUsTierRule } from '../jurisdictionRules.server';
import { evaluateWarranty, type EvaluationInput } from '../warrantyEngine';
import { ewPrice, ewExcess } from '../../lib/ewPricingModel';
import PhoneFrame from '../PhoneFrame';
import PlanMatrix, { type MatrixCell } from '../PlanMatrix';
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
  state: 'MA',
};

export default async function MobileAppPage() {
  const [pricing, category, defaults, usTier] = await Promise.all([
    getEwPricingConfig(),
    getCategoryRule(DEMO.category),
    getCalculatorDefaults(),
    getUsTierRule(DEMO.state),
  ]);

  const accidentalExcess = ewExcess(pricing, DEMO.price);
  const PLAN_YEARS = [3, 4, 5];

  const evalPlan = (years: number, includesAccidental: boolean) =>
    evaluateWarranty({
      productPrice: DEMO.price,
      productCategory: DEMO.category,
      mfrYears: DEMO.mfrYears,
      extendedWarrantyYears: years,
      ownershipYears: years,
      jurisdiction: 'united-states',
      ccExtensionMonths: defaults.ccExtensionMonths,
      ccExcess: defaults.ccExcess,
      frictionCost: defaults.frictionCost,
      purchaseProtectionDays: defaults.purchaseProtectionDays,
      includesAccidental,
      quotedExcess: includesAccidental ? accidentalExcess : 0,
      categoryRule: category,
      usTier,
    } satisfies EvaluationInput);

  const cellFor = (years: number, includesAccidental: boolean): MatrixCell => ({
    marketPrice: Math.round(
      ewPrice(pricing, DEMO.price, DEMO.category, years - DEMO.mfrYears, includesAccidental)
    ),
    fairPrice: Math.round(evalPlan(years, includesAccidental).breakEven.atQuotedExcess),
  });

  const matrixRows = [
    { title: 'Defects only', cells: PLAN_YEARS.map((y) => cellFor(y, false)) },
    { title: 'Defects + accidental', cells: PLAN_YEARS.map((y) => cellFor(y, true)) },
  ];

  const repairCost = evalPlan(DEMO.mfrYears + DEMO.extraYears, true).repairCost;

  const plans: PlanInfo[] = [
    {
      key: 'defect-only',
      title: 'Defects only',
      tagline: 'Covers the product when it breaks on its own',
      marketPrice: matrixRows[0].cells[0].marketPrice,
      fairPrice: matrixRows[0].cells[0].fairPrice,
      accent: 'navy',
    },
    {
      key: 'with-accidental',
      title: 'Defects + accidental',
      tagline: 'Also covers drops, spills and cracks',
      marketPrice: matrixRows[1].cells[0].marketPrice,
      fairPrice: matrixRows[1].cells[0].fairPrice,
      excess: accidentalExcess,
      accent: 'teal',
    },
  ];

  const excessExceedsRepair = accidentalExcess >= repairCost;

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

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-16">
        <div className="mb-10 text-center">
          <h1 className="font-display text-2xl md:text-4xl font-bold leading-tight mb-3">
            The ThingyCare mobile app
          </h1>
          <p className="text-sm md:text-base text-tc-muted max-w-xl mx-auto leading-relaxed">
            Know if a warranty is worth it, right at the register. This preview shows a registered
            product and whether its protection plans make sense.
          </p>
        </div>

        <PhoneFrame>
          <div className="flex items-center gap-2 px-5 py-3 border-b border-tc-border bg-tc-bg">
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden>
              <path d="M8 2 2 8l6 6" stroke="#36949b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h2 className="font-display font-bold text-lg">My Thingy</h2>
          </div>

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

          <div className="mx-5 mt-4">
            <PlanMatrix years={PLAN_YEARS} rows={matrixRows} />
            <div className="grid grid-cols-1 gap-3 mt-3">
              {plans.map((p) => (
                <PlanCard key={p.key} plan={p} />
              ))}
            </div>
            <p className="text-[11px] text-tc-muted leading-relaxed mt-3 text-center">
              {excessExceedsRepair
                ? `A typical repair for this item costs about $${repairCost}, which is less than the $${accidentalExcess} excess. So accident cover pays out little or nothing here.`
                : 'Accidental cover costs more because it also pays for drops and spills. Compare the two options above.'}
            </p>
          </div>
        </PhoneFrame>

        <div className="text-center pt-10">
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
