import { getCategories } from './categories';
import Analyzer from './Analyzer';

export default function Home() {
  const categories = getCategories();

  return (
    <main className="min-h-screen bg-tc-bg text-tc-navy">
      {/* Header */}
      <header className="bg-tc-navy text-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center gap-3">
          <img
            src="/4107097-ThingyCare_Icon.svg"
            alt="ThingyCare logo"
            className="w-9 h-9 object-contain"
          />
          <div>
            <div className="font-display font-bold text-lg leading-tight">ThingyCare</div>
            <div className="text-xs text-white/60 leading-tight">Warranty Value Analyzer</div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-4xl font-bold text-tc-navy mb-2 leading-tight">
            Is that extended warranty <span className="text-tc-teal-dark">actually worth it?</span>
          </h1>
          <p className="text-sm md:text-base text-tc-muted max-w-2xl leading-relaxed">
            Answer a few questions — or paste a product link — and we&apos;ll tell you what the warranty
            would be worth based on real failure rates, repair costs, and your legal rights.
          </p>
        </div>

        <Analyzer categories={categories} />

        <footer className="mt-12 pt-6 border-t border-tc-border text-xs text-tc-muted leading-relaxed">
          Estimates only — based on general failure-rate research, not on this specific model. Nothing
          you enter is saved or sent anywhere except the retailer page you ask us to read.
        </footer>
      </div>
    </main>
  );
}
