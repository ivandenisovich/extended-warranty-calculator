'use client';

import { useEffect, useState } from 'react';
import type { CategoryInfo } from '../categories';
import type { EwPricingConfig } from '../../lib/ewPricingModel';
import { loadCalculator, type StoredCalculator } from '../calculatorStorage';
import { jurisdictionCountryName } from '../InputFlow';
import CoverGridView from './CoverGrid';
import { summariseCoverGrid, type CoverGrid } from './coverGrid';

export default function MobileProductScreen({
  categories,
  pricing,
}: {
  categories: CategoryInfo[];
  pricing: EwPricingConfig;
}) {
  const [stored, setStored] = useState<StoredCalculator | null | undefined>(undefined);
  const [grid, setGrid] = useState<CoverGrid | null>(null);
  const [gridFailed, setGridFailed] = useState(false);

  useEffect(() => {
    const saved = loadCalculator();
    setStored(saved);
    if (!saved) return;
    let cancelled = false;
    summariseCoverGrid(saved.form, pricing)
      .then((result) => {
        if (!cancelled) setGrid(result);
      })
      .catch(() => {
        if (!cancelled) setGridFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pricing]);

  if (stored === undefined) return null;

  if (stored === null) {
    return (
      <p className="mx-5 mt-6 text-sm text-tc-muted text-center">
        Enter a product in the calculator to see it here.
      </p>
    );
  }

  const { form, productName } = stored;
  const price = Number(form.productPrice) || 0;
  const mfrYears = Number(form.mfrYears) || 0;
  const categoryName = categories.find((c) => c.key === form.productCategory)?.name ?? form.productCategory;

  return (
    <>
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
          <h3 className="font-display font-bold text-lg leading-tight pr-2">{productName ?? categoryName}</h3>
          <span className="font-numeric font-bold text-tc-lime-dark text-xl">${price.toFixed(0)}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted">Manufacturer warranty</div>
            <div className="font-semibold">
              {mfrYears} {mfrYears === 1 ? 'year' : 'years'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted">Location</div>
            <div className="font-semibold">{jurisdictionCountryName(form.jurisdiction)}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted">Price paid</div>
            <div className="font-semibold font-numeric">${price.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted">Category</div>
            <div className="font-semibold">{categoryName}</div>
          </div>
        </div>
      </div>

      <div className="mx-5 mt-4">
        <h4 className="font-display font-bold text-sm mb-3">Is a paid warranty worth it?</h4>
        {grid && <CoverGridView grid={grid} />}
        {!grid && !gridFailed && <p className="text-sm text-tc-muted text-center">Calculating…</p>}
        {gridFailed && (
          <p className="text-sm text-tc-red text-center">
            Couldn&apos;t work out the warranty options. Reload this page to try again.
          </p>
        )}
      </div>
    </>
  );
}
