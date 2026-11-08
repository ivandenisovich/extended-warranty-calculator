'use client';

import { useEffect, useState } from 'react';
import PhoneFrame from '../PhoneFrame';
import PlanCard from '../PlanCard';
import PlanMatrix from '../PlanMatrix';
import type { CategoryInfo } from '../categories';
import type { CalculatorDefaults } from '../../lib/publicTypes';
import type { EwPricingConfig } from '../../lib/ewPricingModel';
import { loadCalculator } from '../calculatorStorage';
import { jurisdictionCountryName, makeInitialState, type FormState } from '../InputFlow';
import { summarisePlans, type PlanSummary } from './planSummary';

interface Loaded {
  form: FormState;
  productName: string | null;
  summary: PlanSummary;
}

export default function MobileAppPreview({
  categories,
  defaults,
  pricing,
}: {
  categories: CategoryInfo[];
  defaults: CalculatorDefaults;
  pricing: EwPricingConfig;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const stored = loadCalculator();
    const form = stored?.form ?? makeInitialState(categories, defaults, pricing);
    summarisePlans(form, pricing)
      .then((summary) => {
        if (!cancelled) setLoaded({ form, productName: stored?.productName ?? null, summary });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [categories, defaults, pricing]);

  const categoryName = (key: string) => categories.find((c) => c.key === key)?.name ?? key;

  return (
    <div className="mx-auto">
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

        {failed && (
          <p className="mx-5 mt-6 text-sm text-tc-red text-center">
            Couldn&apos;t work out the plans. Check your calculator entries and reload this page.
          </p>
        )}

        {!failed && !loaded && (
          <p className="mx-5 mt-6 text-sm text-tc-muted text-center">Calculating…</p>
        )}

        {loaded && (
          <>
            <div className="mx-5 mt-4 bg-white rounded-2xl p-4 shadow-sm border border-tc-border">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-display font-bold text-lg leading-tight pr-2">
                  {loaded.productName ?? categoryName(loaded.form.productCategory)}
                </h3>
                <span className="font-numeric font-bold text-tc-lime-dark text-xl">
                  ${Number(loaded.form.productPrice).toFixed(0)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted">Manufacturer warranty</div>
                  <div className="font-semibold">
                    {Number(loaded.form.mfrYears)} {Number(loaded.form.mfrYears) === 1 ? 'year' : 'years'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted">Location</div>
                  <div className="font-semibold">{jurisdictionCountryName(loaded.form.jurisdiction)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted">Price paid</div>
                  <div className="font-semibold font-numeric">${Number(loaded.form.productPrice).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted">Category</div>
                  <div className="font-semibold">{categoryName(loaded.form.productCategory)}</div>
                </div>
              </div>
            </div>

            <div className="mx-5 mt-4">
              <PlanMatrix years={loaded.summary.matrixYears} rows={loaded.summary.matrixRows} />
              <div className="grid grid-cols-1 gap-3 mt-4">
                {loaded.summary.plans.map((p) => (
                  <PlanCard key={p.key} plan={p} />
                ))}
              </div>
              <p className="text-[11px] text-tc-muted leading-relaxed mt-3 text-center">
                {loaded.summary.accidentalExcess >= loaded.summary.repairCost
                  ? `A typical repair for this item costs about $${loaded.summary.repairCost}, which is less than the $${loaded.summary.accidentalExcess} excess. So accident cover pays out little or nothing here.`
                  : 'Accidental cover costs more because it also pays for drops and spills. Compare the two options above.'}
              </p>
            </div>
          </>
        )}
      </PhoneFrame>
    </div>
  );
}
