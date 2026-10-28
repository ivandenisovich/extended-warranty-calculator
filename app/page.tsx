// app/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { evaluateWarranty, CATEGORIES } from './warrantyEngine';
import InputFlow, { INITIAL_STATE, type FormState } from './InputFlow';
import NumbersSection from './NumbersSection';
import VerdictBanner, { computeVerdict } from './VerdictBanner';
import LinkAnalyzer from './LinkAnalyzer';
import type { ExtractedProduct } from './extractTypes';
import type { Assumptions } from './AssumptionsPanel';

export default function Home() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [linkPanelOpen, setLinkPanelOpen] = useState(true);
  const [expertOpen, setExpertOpen] = useState(false);
  const [productName, setProductName] = useState<string | null>(null);

  const evaluation = useMemo(
    () =>
      evaluateWarranty({
        productPrice: Number(form.productPrice) || 0,
        productCategory: form.productCategory,
        mfrYears: Number(form.mfrYears) || 0,
        extendedWarrantyYears: Number(form.extendedWarrantyYears) || 0,
        ccExtensionMonths: Number(form.ccExtensionMonths) || 0,
        ccExcess: Number(form.ccExcess) || 0,
        ownershipYears: Number(form.ownershipYears) || 1,
        jurisdiction: form.jurisdiction,
        includesAccidental: form.includesAccidental,
        frictionCost: Number(form.frictionCost) || 0,
        failureRate: Number(form.assumptions.failureRate) || 0,
        accidentalShare: (Number(form.assumptions.accidentalShare) || 0) / 100,
        repairRatio: (Number(form.assumptions.repairRatio) || 0) / 100,
        hazard: form.assumptions.hazard,
      }),
    [form]
  );

  const verdict = useMemo(
    () =>
      computeVerdict(
        evaluation,
        typeof form.quotedPremium === 'number' ? form.quotedPremium : 0,
        form.quotedExcess
      ),
    [evaluation, form.quotedPremium, form.quotedExcess]
  );

  const applyProduct = (product: ExtractedProduct) => {
    setForm((prev) => ({
      ...prev,
      productPrice: product.price ?? prev.productPrice,
      productCategory: product.categoryKey ?? prev.productCategory,
    }));
    if (product.name) setProductName(product.name);
    setLinkPanelOpen(false);
  };

  return (
    <main className="min-h-screen bg-tc-bg text-tc-navy">
      {/* Header */}
      <header className="bg-tc-navy text-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-tc-lime flex items-center justify-center font-display font-bold text-tc-navy text-lg">
            T
          </div>
          <div>
            <div className="font-display font-bold text-lg leading-tight">ThingyCare</div>
            <div className="text-xs text-white/60 leading-tight">Warranty Value Analyzer</div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Hero + link analyzer */}
        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-4xl font-bold text-tc-navy mb-2 leading-tight">
            Is that extended warranty <span className="text-tc-teal">actually worth it?</span>
          </h1>
          <p className="text-sm md:text-base text-tc-muted max-w-2xl leading-relaxed">
            Answer a few questions — or paste a product link — and we&apos;ll tell you what the warranty
            would be worth based on real failure rates, repair costs, and your legal rights.
          </p>
        </div>

        {linkPanelOpen ? (
          <div className="mb-8">
            <LinkAnalyzer onApply={applyProduct} onDismiss={() => setLinkPanelOpen(false)} />
          </div>
        ) : (
          <button
            onClick={() => setLinkPanelOpen(true)}
            className="mb-8 text-xs font-semibold text-tc-teal hover:text-tc-teal-dark underline underline-offset-2 transition-colors"
          >
            ← Analyse another product link
          </button>
        )}

        {/* Verdict first, once there is a quote to judge */}
        {verdict && (
          <div className="mb-8">
            <VerdictBanner info={verdict} />
          </div>
        )}

        {productName && (
          <div className="mb-6 inline-flex items-center gap-2 bg-tc-teal-light text-tc-teal-dark rounded-full px-4 py-1.5 text-sm font-semibold">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {productName}
          </div>
        )}

        {/* Guided inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7">
            <InputFlow
              state={form}
              onChange={setForm}
              onOpenExpert={() => {
                setExpertOpen(true);
                document.getElementById('numbers')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </div>

          {/* Live summary rail */}
          <aside className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
            <div className="bg-tc-navy text-white rounded-2xl p-5 md:p-6 shadow-sm">
              <h3 className="font-display text-base font-bold mb-4">What the maths says</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between items-baseline gap-3">
                  <dt className="text-white/70">Typical repair cost</dt>
                  <dd className="font-numeric font-bold text-lg">${evaluation.repairCost}</dd>
                </div>
                <div className="flex justify-between items-baseline gap-3">
                  <dt className="text-white/70">Chance it breaks in {form.ownershipYears} yrs</dt>
                  <dd className="font-numeric font-bold text-lg">{evaluation.totalFailureRatePct}%</dd>
                </div>
                {form.jurisdiction === 'australia' && (
                  <div className="flex justify-between items-baseline gap-3">
                    <dt className="text-white/70">Estimated coverage Australian Consumer Law</dt>
                    <dd className="font-numeric font-bold text-lg">
                      {evaluation.estimatedAclYears} {evaluation.estimatedAclYears === 1 ? 'yr' : 'yrs'}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between items-baseline gap-3 pt-3 border-t border-white/15">
                  <dt className="text-white/70">Risk only the paid warranty covers</dt>
                  <dd className="font-numeric font-bold text-lg text-tc-lime">
                    {evaluation.ewTrack.netRiskPercentage}%
                  </dd>
                </div>
                <div className="flex justify-between items-baseline gap-3">
                  <dt className="text-white/70">Fair price ($0 excess)</dt>
                  <dd className="font-numeric font-bold text-lg text-tc-lime">
                    ${evaluation.breakEven.atZeroExcess.toFixed(2)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-tc-teal-light rounded-2xl p-5 text-sm text-tc-navy leading-relaxed">
              <strong className="font-display block mb-1">Why this matters</strong>
              In Australia, consumer guarantees already force retailers to fix major faults for a
              reasonable lifespan — a right you have whether or not you buy the warranty. The warranty&apos;s
              real value is only the risk that isn&apos;t already covered.
            </div>
          </aside>
        </div>

        {/* Detailed numbers */}
        <div id="numbers" className="mt-10">
          <h2 className="font-display text-xl md:text-2xl font-bold text-tc-navy mb-4">
            See the numbers
          </h2>
          <NumbersSection
            evaluation={evaluation}
            ownershipYears={form.ownershipYears}
            mfrYears={form.mfrYears}
            ccExtensionMonths={form.ccExtensionMonths}
            ccExcess={form.ccExcess}
            assumptions={form.assumptions}
            onAssumptionsChange={(a: Assumptions) => setForm((p) => ({ ...p, assumptions: a }))}
            categoryKey={form.productCategory}
            expertOpen={expertOpen}
            onToggleExpert={() => setExpertOpen((o) => !o)}
          />
        </div>

        <footer className="mt-12 pt-6 border-t border-tc-border text-xs text-tc-muted leading-relaxed">
          Estimates only — based on general failure-rate research, not on this specific model. Nothing
          you enter is saved or sent anywhere except the retailer page you ask us to read.
        </footer>
      </div>
    </main>
  );
}
