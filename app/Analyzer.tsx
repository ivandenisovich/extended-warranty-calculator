'use client';

import { useEffect, useRef, useState } from 'react';
import type { EvaluationResult, Jurisdiction } from '../lib/publicTypes';
import { computeVerdict } from './VerdictBanner';
import InputFlow, {
  categoryDefaults,
  jurisdictionCountryName,
  jurisdictionLawName,
  makeInitialState,
  type FormState,
} from './InputFlow';
import NumbersSection from './NumbersSection';
import VerdictBanner from './VerdictBanner';
import LinkAnalyzer from './LinkAnalyzer';
import type { CategoryInfo } from './categories';
import type { ExtractedProduct } from './extractTypes';
import type { Assumptions } from './AssumptionsPanel';
import type { CalculatorDefaults } from '../lib/publicTypes';

export default function Analyzer({
  categories,
  defaults,
}: {
  categories: CategoryInfo[];
  defaults: CalculatorDefaults;
}) {
  const [form, setForm] = useState<FormState>(() => makeInitialState(categories, defaults));
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [evalError, setEvalError] = useState(false);
  const [linkPanelOpen, setLinkPanelOpen] = useState(true);
  const [expertOpen, setExpertOpen] = useState(false);
  const [productName, setProductName] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productPrice: Number(form.productPrice) || 0,
          productCategory: form.productCategory,
          mfrYears: Number(form.mfrYears) || 0,
          extendedWarrantyYears: Number(form.extendedWarrantyYears) || 0,
          ccExtensionMonths: Number(form.ccExtensionMonths) || 0,
          ccExcess: Number(form.ccExcess) || 0,
          purchaseProtectionDays: Number(form.purchaseProtectionDays) || 0,
          ownershipYears: Number(form.ownershipYears) || 1,
          jurisdiction: form.jurisdiction,
          quotedExcess: typeof form.quotedExcess === 'number' ? form.quotedExcess : 0,
          usState: form.jurisdiction === 'united-states' ? form.usState : undefined,
          includesAccidental: form.includesAccidental,
          frictionCost: Number(form.frictionCost) || 0,
          daysOutsideAustralia: Number(form.daysOutsideAustralia) || 0,
          assumptions: {
            failureRate: Number(form.assumptions.failureRate) || 0,
            accidentRate: Number(form.assumptions.accidentRate) || 0,
            repairRatio: Number(form.assumptions.repairRatio) || 0,
            hazard: form.assumptions.hazard,
          },
        }),
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(String(res.status));
          return res.json();
        })
        .then((data: { ok: boolean; evaluation?: EvaluationResult }) => {
          if (data.ok && data.evaluation) {
            setEvaluation(data.evaluation);
            setEvalError(false);
          }
        })
        .catch((err: unknown) => {
          if ((err as { name?: string })?.name === 'AbortError') return;
          setEvalError(true);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [form]);

  const verdict =
    evaluation
      ? computeVerdict(
          evaluation,
          typeof form.quotedPremium === 'number' ? form.quotedPremium : 0
        )
      : null;

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
    <>
      {linkPanelOpen ? (
        <div className="mb-8">
          <LinkAnalyzer onApply={applyProduct} onDismiss={() => setLinkPanelOpen(false)} />
        </div>
      ) : (
        <button
          onClick={() => setLinkPanelOpen(true)}
          className="mb-8 text-xs font-semibold text-tc-teal-dark hover:text-tc-navy underline underline-offset-2 transition-colors"
        >
          ← Analyse another product link
        </button>
      )}

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

      {evalError && (
        <div className="mb-6 rounded-xl bg-tc-red/10 border border-tc-red/30 px-4 py-3 text-sm text-tc-navy">
          Something went wrong calculating the numbers. Check your entries and try again.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <InputFlow
            categories={categories}
            state={form}
            onChange={setForm}
            onOpenExpert={() => {
              setExpertOpen(true);
              document.getElementById('numbers')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </div>

        <aside className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          <div className="bg-tc-navy text-white rounded-2xl p-5 md:p-6 shadow-sm">
            <h3 className="font-display text-base font-bold mb-4">What the maths says</h3>
            {!evaluation ? (
              <p className="text-sm text-white/70">Calculating…</p>
            ) : (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between items-baseline gap-3">
                  <dt className="text-white/70">Typical repair cost</dt>
                  <dd className="font-numeric font-bold text-lg">${evaluation.repairCost}</dd>
                </div>
                <div className="flex justify-between items-baseline gap-3">
                  <dt className="text-white/70">Chance it breaks in {form.ownershipYears} yrs</dt>
                  <dd className="font-numeric font-bold text-lg">{evaluation.totalFailureRatePct}%</dd>
                </div>
                <div className="flex justify-between items-baseline gap-3 pl-3 text-xs text-white/70">
                  <dt>Defects &amp; faults</dt>
                  <dd className="font-numeric">{evaluation.defectFailureRatePct}%</dd>
                </div>
                <div className="flex justify-between items-baseline gap-3 pl-3 text-xs text-white/70">
                  <dt>Accidental damage</dt>
                  <dd className="font-numeric">{evaluation.accidentalFailureRatePct}%</dd>
                </div>
                {(form.jurisdiction !== 'other' && form.jurisdiction !== 'united-states') && (
                  <div className="flex justify-between items-baseline gap-3">
                    <dt className="text-white/70">Estimated coverage {jurisdictionLawName(form.jurisdiction)}</dt>
                    <dd className="font-numeric font-bold text-lg">
                      {evaluation.estimatedAclYears} {evaluation.estimatedAclYears === 1 ? 'yr' : 'yrs'}
                    </dd>
                  </div>
                )}
                {form.jurisdiction === 'united-states' && form.usState && evaluation.estimatedAclYears > 0 && (
                  <div className="flex justify-between items-baseline gap-3">
                    <dt className="text-white/70">Implied warranty in {form.usState}</dt>
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
            )}
          </div>

          <div className="bg-tc-teal-light rounded-2xl p-5 text-sm text-tc-navy leading-relaxed">
            <strong className="font-display block mb-1">Why this matters</strong>
            {form.jurisdiction === 'united-states'
              ? `In the US, implied-warranty rights depend on the state. Tier 1 states read the product's expected life from the category table, capped at 4 years, with claims worth 75% because you carry the burden of proof. California gives every item a flat 1-year implied warranty. Other states have no implied warranty period. The warranty's real value is only the risk that isn't already covered.`
              : form.jurisdiction === 'new-zealand'
              ? 'In New Zealand, consumer guarantees already force retailers to fix major faults for a reasonable lifespan — a right you have whether or not you buy the warranty. The warranty’s real value is only the risk that isn’t already covered.'
              : form.jurisdiction === 'england' || form.jurisdiction === 'wales' || form.jurisdiction === 'scotland'
                ? `In ${jurisdictionCountryName(form.jurisdiction)}, the law already says goods must last a reasonable length and stay free of faults — after six months you may need to prove the fault was there from the start, and the right's value declines toward the end of the period. The warranty's real value is only the risk that isn't already covered.`
                : form.jurisdiction === 'france' || form.jurisdiction === 'germany' || form.jurisdiction === 'spain' || form.jurisdiction === 'portugal' || form.jurisdiction === 'sweden' || form.jurisdiction === 'finland' || form.jurisdiction === 'netherlands' || form.jurisdiction === 'eu-other'
                  ? `In ${jurisdictionCountryName(form.jurisdiction)}, EU law gives you a legal guarantee of at least two years against faults. After the reversal period (${form.jurisdiction === 'france' || form.jurisdiction === 'germany' || form.jurisdiction === 'spain' || form.jurisdiction === 'portugal' || form.jurisdiction === 'sweden' ? 'two years' : 'one year'}) the burden of proof passes to you, which reduces the guarantee's value by a quarter. This model does not attempt to model the Right to Repair Guarantee Extension, where a repair adds extra warranty time. The warranty's real value is only the risk that isn't already covered.`
                  : 'In Australia, consumer guarantees already force retailers to fix major faults for a reasonable lifespan — a right you have whether or not you buy the warranty. The warranty’s real value is only the risk that isn’t already covered.'}
          </div>
        </aside>
      </div>

      <div id="numbers" className="mt-10">
        <h2 className="font-display text-xl md:text-2xl font-bold text-tc-navy mb-4">
          See the numbers
        </h2>
        {evaluation ? (
          <NumbersSection
            evaluation={evaluation}
            ownershipYears={form.ownershipYears}
            mfrYears={form.mfrYears}
            ccExtensionMonths={form.ccExtensionMonths}
            ccExcess={form.ccExcess}
            includesAccidental={form.includesAccidental}
            daysOutsideAustralia={form.daysOutsideAustralia}
            jurisdiction={form.jurisdiction}
            assumptions={form.assumptions}
            onAssumptionsChange={(a: Assumptions) => setForm((p) => ({ ...p, assumptions: a }))}
            categoryDefaults={categoryDefaults(categories, form.productCategory)}
            expertOpen={expertOpen}
            onToggleExpert={() => setExpertOpen((o) => !o)}
          />
        ) : (
          <p className="text-sm text-tc-muted">Calculating…</p>
        )}
      </div>
    </>
  );
}
