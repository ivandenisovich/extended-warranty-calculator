'use client';

import { useState } from 'react';
import { ewExcess, ewPrice, type EwPricingConfig } from '../../lib/ewPricingModel';

const YEAR_OPTIONS = [1, 2, 3];

export default function FairValueQuote({
  price,
  categoryKey,
  pricing,
}: {
  price: number;
  categoryKey: string;
  pricing: EwPricingConfig;
}) {
  const [years, setYears] = useState(2);
  const [accidental, setAccidental] = useState(false);
  const [excess, setExcess] = useState(() => ewExcess(pricing, price));

  const fairCost = Math.round(ewPrice(pricing, price, categoryKey, years, accidental));

  return (
    <div className="mx-5 mt-4 bg-white rounded-2xl p-4 shadow-sm border border-tc-border">
      <h4 className="font-display font-bold text-sm mb-4">What should a paid warranty cost?</h4>

      <div className="mb-4">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted mb-2">
          Extra years of cover
        </div>
        <div className="grid grid-cols-3 gap-2">
          {YEAR_OPTIONS.map((y) => (
            <button
              key={y}
              type="button"
              aria-pressed={years === y}
              onClick={() => setYears(y)}
              className={`rounded-xl py-2 text-sm font-semibold border transition-colors ${
                years === y
                  ? 'bg-tc-navy text-white border-tc-navy'
                  : 'bg-white text-tc-navy border-tc-border hover:border-tc-navy'
              }`}
            >
              {y} {y === 1 ? 'year' : 'years'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted mb-2">
          Accidental damage cover
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: false, label: 'No' },
            { value: true, label: 'Yes' },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              aria-pressed={accidental === opt.value}
              onClick={() => setAccidental(opt.value)}
              className={`rounded-xl py-2 text-sm font-semibold border transition-colors ${
                accidental === opt.value
                  ? 'bg-tc-navy text-white border-tc-navy'
                  : 'bg-white text-tc-navy border-tc-border hover:border-tc-navy'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {accidental && (
        <label className="block mb-4">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-tc-muted mb-2">
            Excess per accidental claim ($)
          </span>
          <input
            type="number"
            min={0}
            value={excess}
            onChange={(e) => setExcess(Number(e.target.value))}
            className="w-full rounded-xl border border-tc-border px-3 py-2 text-sm text-tc-navy focus:outline-none focus:border-tc-navy"
          />
        </label>
      )}

      <div className="rounded-xl bg-tc-bg p-4 text-center">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted">Fair cost</div>
        <div className="font-numeric font-bold text-3xl text-tc-navy mt-1">${fairCost}</div>
        <div className="text-xs text-tc-muted mt-1">
          {years} extra {years === 1 ? 'year' : 'years'}
          {accidental ? `, accidental damage with $${excess} excess` : ', defects only'}
        </div>
      </div>
    </div>
  );
}
