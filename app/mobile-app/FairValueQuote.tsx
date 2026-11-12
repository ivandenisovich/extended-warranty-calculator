'use client';

import { useState } from 'react';
import { ewExcess, ewPrice, type EwPricingConfig } from '../../lib/ewPricingModel';

const YEAR_OPTIONS = [1, 2, 3];

const labelCls = 'text-[10px] font-semibold uppercase tracking-wide text-tc-muted';
const pillCls = (active: boolean) =>
  `min-w-12 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
    active
      ? 'bg-tc-navy text-white border-tc-navy'
      : 'bg-white text-tc-navy border-tc-border hover:border-tc-navy'
  }`;

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

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className={labelCls}>Extra years</span>
          <div className="flex gap-1.5">
            {YEAR_OPTIONS.map((y) => (
              <button
                key={y}
                type="button"
                aria-pressed={years === y}
                onClick={() => setYears(y)}
                className={pillCls(years === y)}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className={labelCls}>Accidental damage</span>
          <div className="flex gap-1.5">
            {[
              { value: false, label: 'No' },
              { value: true, label: 'Yes' },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                aria-pressed={accidental === opt.value}
                onClick={() => setAccidental(opt.value)}
                className={pillCls(accidental === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 h-9">
          <label htmlFor="excess-input" className={labelCls}>
            Excess per claim
          </label>
          <div className="flex items-center gap-1 w-28">
            <span className={`text-sm ${accidental ? 'text-tc-navy' : 'text-tc-muted'}`}>$</span>
            <input
              id="excess-input"
              type="number"
              min={0}
              disabled={!accidental}
              value={excess}
              onChange={(e) => setExcess(Number(e.target.value))}
              className="w-full rounded-lg border border-tc-border px-2 py-1.5 text-sm text-tc-navy disabled:bg-tc-bg disabled:text-tc-muted focus:outline-none focus:border-tc-navy"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 h-20 rounded-xl bg-tc-bg px-4 flex flex-col items-center justify-center text-center">
        <div className={labelCls}>Fair cost</div>
        <div className="font-numeric font-bold text-3xl text-tc-navy leading-tight">${fairCost}</div>
        <div className="text-xs text-tc-muted truncate max-w-full">
          {years} extra {years === 1 ? 'year' : 'years'}
          {accidental ? `, $${excess} excess` : ', defects only'}
        </div>
      </div>
    </div>
  );
}
