import type { FormState } from './InputFlow';

export function buildEvaluationBody(form: FormState) {
  return {
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
  };
}
