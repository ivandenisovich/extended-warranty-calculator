import { getCategories } from '../categories';
import { getCalculatorDefaults, getEwPricingConfig } from '../jurisdictionRules.server';
import SiteNav from '../SiteNav';
import Link from 'next/link';
import type { Metadata } from 'next';
import MobileAppPreview from './MobileAppPreview';

export const metadata: Metadata = {
  title: 'Mobile App Preview | ThingyCare',
  robots: { index: false, follow: false },
};

export default async function MobileAppPage() {
  const [categories, defaults, pricing] = await Promise.all([
    getCategories(),
    getCalculatorDefaults(),
    getEwPricingConfig(),
  ]);

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
            Know if a warranty is worth it, right at the register. This preview uses the product
            you entered in the calculator.
          </p>
        </div>

        <MobileAppPreview categories={categories} defaults={defaults} pricing={pricing} />

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
