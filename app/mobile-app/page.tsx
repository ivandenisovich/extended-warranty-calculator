import type { Metadata } from 'next';
import SiteNav from '../SiteNav';
import PhoneFrame from '../PhoneFrame';
import { getCategories } from '../categories';
import { getEwPricingConfig } from '../jurisdictionRules.server';
import MobileProductScreen from './MobileProductScreen';

export const metadata: Metadata = {
  title: 'Mobile App Preview | ThingyCare',
  robots: { index: false, follow: false },
};

export default async function MobileAppPage() {
  const [categories, pricing] = await Promise.all([getCategories(), getEwPricingConfig()]);

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
        <PhoneFrame>
          <MobileProductScreen categories={categories} pricing={pricing} />
        </PhoneFrame>
      </div>
    </main>
  );
}
