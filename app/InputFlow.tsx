'use client';

import React, { useState } from 'react';
import { CATEGORIES } from './warrantyEngine';
import type { Assumptions } from './AssumptionsPanel';

export interface FormState {
  productCategory: string;
  productPrice: number;
  ownershipYears: number;
  mfrYears: number;
  extendedWarrantyYears: number;
  jurisdiction: 'australia' | 'other';
  includesAccidental: boolean;
  frictionCost: number;
  ccExtensionMonths: number;
  ccExcess: number;
  quotedPremium: number | '';
  quotedExcess: number;
  assumptions: Assumptions;
}

export const INITIAL_STATE: FormState = {
  productCategory: 'smartphones',
  productPrice: 1200,
  ownershipYears: 5,
  mfrYears: 1,
  extendedWarrantyYears: 5,
  jurisdiction: 'australia',
  includesAccidental: true,
  frictionCost: 50,
  ccExtensionMonths: 12,
  ccExcess: 50,
  quotedPremium: '',
  quotedExcess: 0,
  assumptions: {
    failureRate: CATEGORIES.smartphones.failureRate,
    accidentalShare: Math.round(CATEGORIES.smartphones.accidentalShare * 100),
    repairRatio: Math.round(CATEGORIES.smartphones.repairRatio * 100),
    hazard: { infantStrength: 0.6, infantDecay: 1.2, background: 0.2, wearOutStrength: 0.5, accidentalFrontLoad: 0.5 },
  },
};

const inputCls =
  'w-full rounded-lg border border-tc-border bg-white px-3.5 py-2.5 text-sm text-tc-navy focus:outline-none focus:ring-2 focus:ring-tc-teal focus:border-transparent transition-shadow';
const labelCls = 'block text-xs font-semibold text-tc-navy mb-1.5';
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

export default function InputFlow({
  state,
  onChange,
  onOpenExpert,
}: {
  state: FormState;
  onChange: (next: FormState) => void;
  onOpenExpert: () => void;
}) {
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    onChange({ ...state, [key]: value });

  const handleCategoryChange = (key: string) => {
    const cat = CATEGORIES[key] ?? CATEGORIES.smartphones;
    onChange({
      ...state,
      productCategory: key,
      assumptions: {
        failureRate: cat.failureRate,
        accidentalShare: Math.round(cat.accidentalShare * 100),
        repairRatio: Math.round(cat.repairRatio * 100),
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
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <option key={key} value={key}>{cat.name}</option>
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
          <Field label="Country" hint="Australian Consumer Law provides additional protection for the “reasonable life” of the product.">
            <select
              value={state.jurisdiction}
              onChange={(e) => set('jurisdiction', e.target.value as 'australia' | 'other')}
              className={inputCls}
            >
              <option value="australia">Australia</option>
              <option value="other">Somewhere else</option>
            </select>
          </Field>
        </div>
        <button
          onClick={onOpenExpert}
          className="mt-4 text-xs font-semibold text-tc-teal hover:text-tc-teal-dark underline underline-offset-2 transition-colors"
        >
          Expert settings: fine-tune failure assumptions
        </button>
      </StepCard>

      <StepCard n={2} title="What does the warranty promise?" subtitle="Check the product page or the paperwork — every field here matters.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Maker's warranty (years)" hint="Usually 1.">
            <input
              type="number"
              min={0}
              value={state.mfrYears}
              onChange={(e) => set('mfrYears', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Extended warranty (years)" hint="Years of paid cover from the day you buy — it starts at purchase, not after the maker's warranty ends.">
            <input
              type="number"
              min={0}
              value={state.extendedWarrantyYears}
              onChange={(e) => set('extendedWarrantyYears', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field
            label="Extra cover from your credit card (months)"
            hint="Many cards extend the maker's warranty if you paid with them."
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
        </div>
        <label className="flex items-start gap-2.5 mt-4 cursor-pointer">
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
      </StepCard>

      <StepCard n={3} title="What does it cost?" subtitle="The price on the checkout page, and any excess per claim.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Warranty price ($)">
            <input
              type="number"
              min={0}
              value={state.quotedPremium}
              onChange={(e) => set('quotedPremium', e.target.value === '' ? '' : Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Excess per claim ($)" hint="What you pay out of pocket when you make a claim.">
            <input
              type="number"
              min={0}
              value={state.quotedExcess}
              onChange={(e) => set('quotedExcess', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
        </div>
        {state.jurisdiction === 'australia' && (
          <div className="mt-4">
            <Field
              label="What avoiding ACL hassle is worth to you ($)"
              hint="Australian consumer guarantees already cover major failures — a paid warranty saves you arguing with the retailer. How much is that peace of mind worth?"
            >
              <input
                type="number"
                min={0}
                value={state.frictionCost}
                onChange={(e) => set('frictionCost', Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>
        )}
      </StepCard>
    </div>
  );
}
