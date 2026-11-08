'use client';

import React from 'react';
import type { Assumptions } from './AssumptionsPanel';
import type { CategoryInfo } from './categories';
import type { CalculatorDefaults, Jurisdiction } from '../lib/publicTypes';
import { JURISDICTION_RULES, fallbackRule } from '../lib/jurisdictionRules';
import { US_STATES, usTierOf } from '../lib/usTierRules';
import { CALCULATOR_DEFAULTS } from '../lib/calculatorDefaults';
import { DEFAULT_HAZARD } from './warrantyTypes.client';

export interface FormState {
  productCategory: string;
  productPrice: number;
  ownershipYears: number;
  mfrYears: number;
  extendedWarrantyYears: number;
  jurisdiction: Jurisdiction;
  usState: string;
  purchaseProtectionDays: number;
  includesAccidental: boolean;
  frictionCost: number;
  daysOutsideAustralia: number;
  ccExtensionMonths: number;
  ccExcess: number;
  quotedPremium: number | '';
  quotedExcess: number;
  assumptions: Assumptions;
}

export function makeInitialState(
  categories: CategoryInfo[],
  overrides?: Partial<CalculatorDefaults>
): FormState {
  const first = categories[0];
  const d = { ...CALCULATOR_DEFAULTS, ...overrides };
  return {
    productCategory: first?.key ?? 'smartphones',
    productPrice: d.productPrice,
    ownershipYears: d.ownershipYears,
    mfrYears: d.mfrYears,
    extendedWarrantyYears: d.extendedWarrantyYears,
    jurisdiction: 'australia',
    usState: '',
    purchaseProtectionDays: d.purchaseProtectionDays,
    includesAccidental: true,
    frictionCost: d.frictionCost,
    daysOutsideAustralia: 0,
    ccExtensionMonths: d.ccExtensionMonths,
    ccExcess: d.ccExcess,
    quotedPremium: '',
    quotedExcess: d.quotedExcess,
    assumptions: {
      failureRate: first?.defaults.failureRate ?? 15,
      accidentRate: first?.defaults.accidentRate ?? 20,
      repairRatio: first?.defaults.repairRatio ?? 35,
      hazard: { ...DEFAULT_HAZARD },
    },
  };
}

export function categoryDefaults(categories: CategoryInfo[], key: string) {
  return (
    categories.find((c) => c.key === key)?.defaults ?? {
      failureRate: 15,
      accidentRate: 20,
      repairRatio: 35,
    }
  );
}

const inputCls =
  'w-full rounded-lg border border-tc-border bg-white px-3.5 py-2.5 text-sm text-tc-navy focus:outline-none focus:ring-2 focus:ring-tc-teal focus:border-transparent transition-shadow';
const labelCls = 'block text-xs font-semibold text-tc-navy mb-1.5 min-h-8';
const stepBadge =
  'w-7 h-7 rounded-full bg-tc-teal text-white font-display text-sm font-bold flex items-center justify-center shrink-0';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-tc-muted mt-1 leading-snug">{hint}</span>}
    </label>
  );
}

function StepCard({
  n,
  title,
  subtitle,
  children,
}: {
  n: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-tc-surface border border-tc-border rounded-2xl p-5 md:p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className={stepBadge}>{n}</div>
        <div>
          <h2 className="font-display text-base md:text-lg font-bold text-tc-navy">{title}</h2>
          {subtitle && <p className="text-xs text-tc-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function jurisdictionCountryName(j: Jurisdiction): string {
  return fallbackRule(j).display_name;
}

export function jurisdictionLawName(j: Jurisdiction): string {
  return fallbackRule(j).law_name;
}

export function lawShortName(j: Jurisdiction): string {
  return fallbackRule(j).law_short;
}

export default function InputFlow({
  categories,
  state,
  onChange,
  onOpenExpert,
}: {
  categories: CategoryInfo[];
  state: FormState;
  onChange: (next: FormState) => void;
  onOpenExpert: () => void;
}) {
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    onChange({ ...state, [key]: value });

  const handleCategoryChange = (key: string) => {
    const cat = categories.find((c) => c.key === key);
    if (!cat) return;
    onChange({
      ...state,
      productCategory: key,
      assumptions: {
        failureRate: cat.defaults.failureRate,
        accidentRate: cat.defaults.accidentRate,
        repairRatio: cat.defaults.repairRatio,
        hazard: { ...state.assumptions.hazard },
      },
    });
  };

  return (
    <div className="space-y-5">
      <StepCard n={1} title="What did you buy?" subtitle="We use this to estimate how likely a failure is, and what a repair typically costs.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Product type">
            <select
              value={state.productCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className={inputCls}
            >
              {categories.map((cat) => (
                <option key={cat.key} value={cat.key}>{cat.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Purchase price ($)">
            <input
              type="number"
              min={0}
              value={state.productPrice}
              onChange={(e) => set('productPrice', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field
            label="How long will you keep it? (years)"
            hint="The value of the warranty depends on how long you plan to keep the product"
          >
            <input
              type="number"
              min={1}
              max={10}
              value={state.ownershipYears}
              onChange={(e) => set('ownershipYears', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Manufacturer's warranty (years)" hint="Check the retailer or manufacturer's website.">
            <input
              type="number"
              min={0}
              value={state.mfrYears}
              onChange={(e) => set('mfrYears', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
        </div>
        <button
          onClick={onOpenExpert}
          className="mt-4 text-xs font-semibold text-tc-teal-dark hover:text-tc-navy underline underline-offset-2 transition-colors"
        >
          Expert settings: fine-tune failure assumptions
        </button>
      </StepCard>

      <StepCard n={2} title="What are your consumer rights?">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Country where you bought it"
            hint={
              state.jurisdiction === 'united-states'
                ? 'Implied-warranty rights differ by state. Pick your state to see its tier.'
                : `${jurisdictionLawName(state.jurisdiction)} provides additional protection for the “reasonable life” of the product.`
            }
          >
            <select
              value={state.jurisdiction}
              onChange={(e) => set('jurisdiction', e.target.value as Jurisdiction)}
              className={inputCls}
            >
              {JURISDICTION_RULES.map((r) => (
                <option key={r.jurisdiction} value={r.jurisdiction}>{r.display_name}</option>
              ))}
            </select>
          </Field>
          {state.jurisdiction === 'united-states' && (
            <Field
              label="State"
              hint={
                state.usState
                  ? `Tier ${usTierOf(state.usState)}: ${usTierOf(state.usState) === 1 ? 'expected-life implied warranty capped at 4 years, claims worth 75%' : usTierOf(state.usState) === 2 ? 'flat 1-year implied warranty on all items' : 'no implied warranty period'}.`
                  : 'Choose a state to resolve its consumer-rights tier.'
              }
            >
              <select
                value={state.usState}
                onChange={(e) => set('usState', e.target.value)}
                className={inputCls}
              >
                <option value="">Select a state…</option>
                {US_STATES.map((s) => (
                  <option key={s.state_code} value={s.state_code}>
                    {s.state_name} — Tier {s.tier}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      </StepCard>

      <StepCard n={3} title="Do you have credit card protection perks?" subtitle="Check your card's benefits guide — many cards include these automatically.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            label="Extra cover (months)"
            hint="Many cards extend the manufacturer's warranty if you paid with them."
          >
            <input
              type="number"
              min={0}
              value={state.ccExtensionMonths}
              onChange={(e) => set('ccExtensionMonths', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Credit card excess ($)" hint="What your card charges per claim, if anything.">
            <input
              type="number"
              min={0}
              value={state.ccExcess}
              onChange={(e) => set('ccExcess', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field
            label="Purchase Protection (days)"
            hint="Some cards cover newly bought items against theft or accidental damage for a period after purchase."
          >
            <input
              type="number"
              min={0}
              value={state.purchaseProtectionDays}
              onChange={(e) => set('purchaseProtectionDays', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
        </div>
      </StepCard>

      <StepCard n={4} title="What paid warranty have you been offered?" subtitle="The details from the offer or checkout page.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Extended warranty (years)" hint="Years of paid cover from the day you buy — it starts at purchase, not after the manufacturer's warranty ends.">
            <input
              type="number"
              min={0}
              value={state.extendedWarrantyYears}
              onChange={(e) => set('extendedWarrantyYears', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Warranty price ($)">
            <input
              type="number"
              min={0}
              value={state.quotedPremium}
              onChange={(e) => set('quotedPremium', e.target.value === '' ? '' : Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          {state.jurisdiction !== 'other' && (
            <Field
              label={`What avoiding ${lawShortName(state.jurisdiction)} hassle is worth to you ($)`}
              hint={`${jurisdictionCountryName(state.jurisdiction)} consumer law already covers major failures — a paid warranty saves you arguing with the retailer. This amount is added to the paid warranty's value, raising its fair price, break-even prices, the matrix results, and the verdict.`}
            >
              <input
                type="number"
                min={0}
                value={state.frictionCost}
                onChange={(e) => set('frictionCost', Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          )}
          {state.jurisdiction !== 'other' && (
            <Field
              label="How many days per year will you have this item with you overseas?"
              hint={`Paid warranties often let you make claims overseas, but ${jurisdictionLawName(state.jurisdiction)} doesn't provide this.`}
            >
              <input
                type="number"
                min={0}
                max={365}
                value={state.daysOutsideAustralia}
                onChange={(e) => set('daysOutsideAustralia', Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          )}
        </div>
        <div className="flex items-start gap-6 mt-4 flex-wrap">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={state.includesAccidental}
              onChange={(e) => set('includesAccidental', e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-tc-border text-tc-teal focus:ring-tc-teal"
            />
            <span className="text-sm text-tc-navy leading-snug">
              The extended warranty covers accidental damage (drops, spills)
            </span>
          </label>
          {state.includesAccidental && (
            <label className="block w-40">
              <span className={labelCls}>Excess for accidental damage ($)</span>
              <input
                type="number"
                min={0}
                value={state.quotedExcess}
                onChange={(e) => set('quotedExcess', Number(e.target.value))}
                className={inputCls}
              />
              <span className="block text-[11px] text-tc-muted mt-1 leading-snug">
                What you pay out of pocket per accidental-damage claim. Defect and fault claims pay no excess.
              </span>
            </label>
          )}
        </div>
      </StepCard>
    </div>
  );
}
