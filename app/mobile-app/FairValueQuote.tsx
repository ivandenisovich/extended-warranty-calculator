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
const planCardCls = (active: boolean) =>
  `flex flex-col rounded-xl border p-3 transition-colors ${
    active ? 'border-tc-navy bg-tc-teal-light' : 'border-tc-border bg-white'
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

  const defectsCost = Math.round(ewPrice(pricing, price, categoryKey, years, false));
  const accidentalCost = Math.round(ewPrice(pricing, price, categoryKey, years, true));
  const fairCost = accidental ? accidentalCost : defectsCost;

  return (
    <div className="mx-5 mt-4 bg-white rounded-2xl p-4 shadow-sm border border-tc-border">
      <h4 className="font-display font-bold text-sm mb-4">What should a paid warranty cost?</h4>

      <div className="flex items-center justify-between gap-3 mb-4">
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

      <div className="grid grid-cols-2 gap-2">
        <div className={planCardCls(!accidental)}>
          <button
            type="button"
            aria-pressed={!accidental}
            onClick={() => setAccidental(false)}
            className="text-left"
          >
            <div className="text-xs font-semibold text-tc-navy">Defects only</div>
            <div className="font-numeric font-bold text-xl text-tc-navy">${defectsCost}</div>
          </button>
          <div className="mt-2 h-10 flex items-end text-[11px] text-tc-muted">No excess on defects</div>
        </div>

        <div className={planCardCls(accidental)}>
          <button
            type="button"
            aria-pressed={accidental}
            onClick={() => setAccidental(true)}
            className="text-left"
          >
            <div className="text-xs font-semibold text-tc-navy">Plus accidental damage</div>
            <div className="font-numeric font-bold text-xl text-tc-navy">${accidentalCost}</div>
          </button>
          <div className="mt-2 h-10 flex items-end">
            {accidental ? (
              <label className="flex w-full items-center justify-between gap-2 text-[11px] text-tc-muted">
                Excess per claim
                <span className="flex items-center gap-1 w-20">
                  <span className="text-sm text-tc-navy">$</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={excess}
                    onChange={(e) => setExcess(Math.max(0, Number(e.target.value)))}
                    aria-label="Excess per claim"
                    className="w-full rounded-lg border border-tc-border px-2 py-1 text-sm text-tc-navy focus:outline-none focus:border-tc-navy"
                  />
                </span>
              </label>
            ) : (
              <div className="text-[11px] text-tc-muted">Excess ${excess} per claim</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 h-20 rounded-xl bg-tc-bg px-4 flex flex-col items-center justify-center text-center">
        <div className={labelCls}>Fair cost</div>
        <div className="font-numeric font-bold text-3xl text-tc-navy leading-tight">${fairCost}</div>
        <div className="text-xs text-tc-muted truncate max-w-full">
          {years} extra {years === 1 ? 'year' : 'years'}
          {accidental ? `, accidental damage, $${excess} excess` : ', defects only'}
        </div>
      </div>
    </div>
  );
}
