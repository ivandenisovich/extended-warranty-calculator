'use client';

import { useEffect, useState } from 'react';
import type { CategoryInfo } from '../categories';
import type { EwPricingConfig } from '../../lib/ewPricingModel';
import { loadCalculator, type StoredCalculator } from '../calculatorStorage';
import CoverGridView from './CoverGrid';
import ProductInfoCard from './ProductInfoCard';
import { jurisdictionCountryName } from '../InputFlow';
import { US_STATES } from '../../lib/usTierRules';
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

  const { form } = stored;
  const categoryName = categories.find((c) => c.key === form.productCategory)?.name ?? form.productCategory;
  const stateName = US_STATES.find((s) => s.state_code === form.usState)?.state_name;
  const location =
    form.jurisdiction === 'united-states' && stateName
      ? stateName
      : jurisdictionCountryName(form.jurisdiction);

  return (
    <>
      <div className="px-5 pt-4">
        <div className="relative rounded-2xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.pexels.com/photos/3921864/pexels-photo-3921864.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
            alt="Placeholder product photo"
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

      <ProductInfoCard
        categoryName={categoryName}
        price={Number(form.productPrice) || 0}
        location={location}
      />

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
