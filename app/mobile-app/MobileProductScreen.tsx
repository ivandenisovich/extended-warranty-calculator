'use client';

import { useEffect, useState } from 'react';
import type { CategoryInfo } from '../categories';
import type { EwPricingConfig } from '../../lib/ewPricingModel';
import { loadCalculator, type StoredCalculator } from '../calculatorStorage';
import { jurisdictionCountryName } from '../InputFlow';
import { US_STATES } from '../../lib/usTierRules';
import ProductInfoCard from './ProductInfoCard';
import WarrantyGridSection from './WarrantyGridSection';
import FairValueQuote from './FairValueQuote';

export default function MobileProductScreen({
  categories,
  pricing,
  variant,
}: {
  categories: CategoryInfo[];
  pricing: EwPricingConfig;
  variant: 'grid' | 'quote';
}) {
  const [stored, setStored] = useState<StoredCalculator | null | undefined>(undefined);

  useEffect(() => {
    setStored(loadCalculator());
  }, []);

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
  const price = Number(form.productPrice) || 0;

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

      <ProductInfoCard categoryName={categoryName} price={price} location={location} />

      {variant === 'grid' ? (
        <WarrantyGridSection form={form} pricing={pricing} />
      ) : (
        <FairValueQuote price={price} categoryKey={form.productCategory} pricing={pricing} />
      )}
    </>
  );
}
