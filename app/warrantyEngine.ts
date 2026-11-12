// warrantyEngine.ts — server-only. The model logic must never ship to the
// browser; the client talks to /api/evaluate and receives results only.
import 'server-only';

import type {
  CategoryRule,
  EvaluationResult,
  HazardShape,
  Jurisdiction,
  JurisdictionRule,
  UsTierRule,
} from '../lib/publicTypes';
import { fallbackRule } from '../lib/jurisdictionRules';
import { fallbackCategoryRule } from '../lib/categoryRules';

export type { EvaluationResult };

// The estimate comes from the category's price tiers: below tier1_price ->
// years_low, up to tier2_price -> years_mid, above -> years_high.
export function getEstimatedAclYears(cat: CategoryRule, price: number): number {
  if (price < cat.tier1_price) return cat.years_low;
  if (price <= cat.tier2_price) return cat.years_mid;
  return cat.years_high;
}

export interface EvaluationInput {
  productPrice: number;
  productCategory: string;
  mfrYears: number;
  extendedWarrantyYears: number;
  ccExtensionMonths: number;
  ccExcess: number;
  ownershipYears: number;
  jurisdiction: Jurisdiction;
  includesAccidental: boolean;
  frictionCost: number;
  // False removes statutory consumer rights from the calculation (the user
  // chose not to count them); defaults to counting them.
  includeStatutoryRights?: boolean;
  // The category's estimate parameters, loaded from the category_rules
  // database table (fallback copy used if unreachable).
  categoryRule?: CategoryRule;
  // The jurisdiction's statutory-law parameters, loaded from the
  // jurisdiction_rules database table (fallback copy used if unreachable).
  rule?: JurisdictionRule;
  // For US purchases: the state's consumer-rights tier, loaded from the
  // us_consumer_tiers table via the state's mapping. Replaces the
  // jurisdiction placeholder rule when present.
  usTier?: UsTierRule;
  // Credit card purchase protection: covers accidental damage for N days from purchase
  purchaseProtectionDays?: number;
  // Quoted paid-warranty excess, applied to accidental-damage claims only
  // (defect claims pay nothing). When > 0, its accident claims also lose to
  // the card's excess-free purchase protection during the overlap.
  quotedExcess?: number;
  // Days per year the item travels overseas: there, claiming under ACL is
  // impractical, so a slice of overlap-period defects earns the paid warranty value
  daysOutsideAustralia?: number;
  // Optional user-tuned assumptions; fall back to category defaults
  failureRate?: number;
  accidentRate?: number;
  repairRatio?: number;
  hazard?: Partial<HazardShape>;
}

// Premium axis for the matrix: bracket the $0-excess break-even premium with
// steps above and below it, so at least one positive or neutral combination
// exists whenever one is possible. Prices are rounded to friendly amounts.
function adaptivePremiums(atZeroExcess: number): number[] {
  const be = Math.max(1, atZeroExcess);
  const nice = (v: number) => {
    if (v < 20) return Math.round(v);
    if (v < 100) return Math.round(v / 5) * 5;
    return Math.round(v / 10) * 10;
  };
  const set = new Set<number>([
    0,
    nice(be * 0.5),
    nice(be),
    nice(be * 1.5),
    nice(be * 2),
    nice(be * 3),
  ]);
  return [...set].sort((a, b) => a - b);
}

// Excess options scale with purchase price: roughly 1% to 10% in 8 steps,
// rounded to friendly amounts, never approaching the cost of replacement.
function scaledExcessLevels(price: number): number[] {
  const steps = [0.01, 0.02, 0.03, 0.04, 0.05, 0.065, 0.08, 0.1];
  const raw = steps.map((s) => price * s);
  const out = raw.map((v, i) => {
    if (i === 0) return 0; // First level is always $0 excess
    if (v < 20) return Math.round(v / 5) * 5;
    if (v < 100) return Math.round(v / 10) * 10;
    return Math.round(v / 25) * 25;
  });
  // De-duplicate rounded values while keeping order
  return out.filter((v, i) => i === 0 || v > out[i - 1]);
}

export function evaluateWarranty(input: EvaluationInput): EvaluationResult {
  const {
    productPrice,
    productCategory,
    mfrYears,
    extendedWarrantyYears,
    ccExtensionMonths,
    ccExcess,
    ownershipYears,
    jurisdiction,
    includesAccidental,
    frictionCost,
  } = input;
  const daysOutsideAustralia = Math.min(365, Math.max(0, input.daysOutsideAustralia ?? 0));

  const rule: JurisdictionRule = input.rule ?? fallbackRule(jurisdiction);
  const cat: CategoryRule = input.categoryRule ?? fallbackCategoryRule(productCategory);
  const usTier: UsTierRule | undefined = input.usTier;
  // A US state's tier rule replaces the 'united-states' placeholder
  const hasStatutory =
    input.includeStatutoryRights !== false &&
    (usTier
      ? usTier.duration_model !== 'none'
      : rule.flat_years !== 0 || rule.duration_model === 'category_estimate');
  const isUk = rule.value_model === 'uk_step_decline';
  const isEu = rule.value_model === 'eu_reversal_step';

  // Tunable assumptions (fall back to category defaults)
  const failureRate = input.failureRate ?? cat.failure_rate;
  const accidentRate = clamp(input.accidentRate ?? cat.accident_rate, 0, 100) / 100;
  const repairRatio = input.repairRatio ?? cat.repair_ratio;
  const hazard: HazardShape = {
    infantStrength: cat.infant_strength,
    infantDecay: cat.infant_decay,
    background: cat.background,
    wearOutStrength: cat.wear_out_strength,
    accidentalFrontLoad: cat.accidental_front_load,
    ...(input.hazard ?? {}),
  };

  const repairCost = productPrice * repairRatio;

  // Statutory duration from the jurisdiction rule: flat, or the category
  // estimate bounded by the rule's floor and cap.
  const rawEstimate = getEstimatedAclYears(cat, productPrice);
  const estimatedAclYears = !hasStatutory
    ? 0
    : usTier
      ? usTier.duration_model === 'flat'
        ? (usTier.flat_years ?? 0)
        : Math.min(usTier.cap_years ?? Infinity, rawEstimate)
      : rule.duration_model === 'flat'
        ? (rule.flat_years ?? 0)
        : Math.max(rule.min_years ?? 0, Math.min(rule.cap_years ?? Infinity, rawEstimate));

  // Total failure probability scales with ownership duration along the hazard
  // curve: a 5-year baseline rate is the reference point, and shorter/longer
  // ownership periods accumulate risk unevenly (front- and end-loaded).
  const totalYears = Math.max(1, Math.round(ownershipYears));
  const hazardWeights = hazardWeightsFor(hazard, totalYears);
  const cumulativeRisk = hazardWeights.reduce((a, b) => a + b, 0);
  const baseline5Risk = failureRate / 100;
  const scale5 = hazardWeightsFor(hazard, 5).reduce((a, b) => a + b, 0);
  const totalFailureProb = Math.min(1, (baseline5Risk / scale5) * cumulativeRisk);

  const totalDefectProb = Math.min(1, (failureRate / 100 / scale5) * cumulativeRisk);
  const totalAccidentalProb = accidentRate === 0 ? 0 : Math.min(1, (accidentRate / scale5) * cumulativeRisk);
  const overseasFraction = hasStatutory ? clamp(daysOutsideAustralia / 365, 0, 1) : 0;

  const mfrMonths = mfrYears * 12;
  const aclMonths = estimatedAclYears * 12;
  // The paid warranty runs from purchase, so it overlaps both the maker's
  // warranty and your ACL rights. It ends `extendedWarrantyYears` after buy.
  const ewEndMonths = extendedWarrantyYears * 12;
  const ccEndMonths = mfrMonths + ccExtensionMonths;

  const defectWeights = hazardWeights.map((w) => w / cumulativeRisk);
  const accidentalWeights = accidentalWeightsFor(hazard.accidentalFrontLoad, totalYears);

  const annualTimeline: EvaluationResult['annualTimeline'] = [];
  let mfrRisk = 0;
  let aclRisk = 0;
  let aclValueRisk = 0;
  let ccRisk = 0;
  let ewOverlapRisk = 0;
  let ewPostAclRisk = 0;
  let ewOverlapDefect = 0;
  let ewOverlapOverseasDefect = 0;
  let ewOverlapAcc = 0;
  let ewPostDefect = 0;
  let ewPostAcc = 0;
  let uncoveredRisk = 0;
  let uncoveredDefect = 0;
  let uncoveredAcc = 0;
  const allCoverEndMonths = Math.max(
    mfrMonths,
    hasStatutory ? aclMonths : 0,
    ewEndMonths
  );
  const uncoveredStartMonth = allCoverEndMonths + 1;

  for (let y = 1; y <= totalYears; y++) {
    const pDefect = defectWeights[y - 1] * totalDefectProb;
    const pAccidental = accidentalWeights[y - 1] * totalAccidentalProb;

    const startMonth = (y - 1) * 12 + 1;
    const endMonth = y * 12;

    if (endMonth <= mfrMonths) {
      mfrRisk += pDefect;
    }

    if (hasStatutory && endMonth <= aclMonths) {
      aclRisk += pDefect;
    }

    // Statutory value per the rule's value model: UK steps down at month 6
    // (haircut_size of value lost) then declines linearly to zero; EU steps
    // down at the reversal month then holds at (1 - haircut_size);
    // Australia/NZ stay at full value.
    if (rule.value_model === 'uk_step_decline' || rule.value_model === 'eu_reversal_step') {
      const coveredEnd = Math.min(endMonth, aclMonths);
      const stepMonth = rule.step_month ?? 6;
      const postStepValue = 1 - (rule.haircut_size ?? 0.25);
      let valueSum = 0;
      for (let m = startMonth; m <= coveredEnd; m++) {
        if (m <= stepMonth) {
          valueSum += 1;
        } else if (rule.value_model === 'uk_step_decline') {
          valueSum += (postStepValue * (aclMonths - m)) / (aclMonths - stepMonth);
        } else {
          valueSum += postStepValue;
        }
      }
      aclValueRisk += (pDefect / 12) * valueSum;
    }

    const activeEwStartMonth = startMonth;
    const activeEwEndMonth = Math.min(endMonth, ewEndMonths);

    if (activeEwStartMonth <= activeEwEndMonth) {
      const activeEwMonthsCount = activeEwEndMonth - activeEwStartMonth + 1;
      const monthFraction = activeEwMonthsCount / 12;
      const ewDefectInYear = pDefect * monthFraction;
      const ewAccidentalInYear = includesAccidental ? pAccidental * monthFraction : 0;

      // Free cover runs from purchase too: maker's warranty first, then statutory rights.
      const freeEnd = Math.max(mfrMonths, hasStatutory ? aclMonths : 0);
      const overlapEnd = Math.min(activeEwEndMonth, freeEnd);
      if (overlapEnd >= activeEwStartMonth) {
        const overlapMonthsInYear = overlapEnd - activeEwStartMonth + 1;
        const f = overlapMonthsInYear / activeEwMonthsCount;
        ewOverlapRisk += (ewDefectInYear + ewAccidentalInYear) * f;
        ewOverlapDefect += ewDefectInYear * f;
        const overseasDefect = ewDefectInYear * f * overseasFraction;
        ewOverlapOverseasDefect += overseasDefect;
        ewOverlapAcc += ewAccidentalInYear * f;
      }

      const postAclStart = Math.max(activeEwStartMonth, freeEnd + 1);
      if (postAclStart <= activeEwEndMonth) {
        const postMonthsInYear = activeEwEndMonth - postAclStart + 1;
        const f = postMonthsInYear / activeEwMonthsCount;
        ewPostAclRisk += (ewDefectInYear + ewAccidentalInYear) * f;
        ewPostDefect += ewDefectInYear * f;
        ewPostAcc += ewAccidentalInYear * f;
      }
    }

    if (startMonth > mfrMonths && endMonth <= ccEndMonths) {
      ccRisk += pDefect;
    }

    if (startMonth <= allCoverEndMonths && endMonth > allCoverEndMonths) {
      const uncoveredMonthsInYear = endMonth - allCoverEndMonths;
      const f = uncoveredMonthsInYear / 12;
      uncoveredRisk += (pDefect + pAccidental) * f;
      uncoveredDefect += pDefect * f;
      uncoveredAcc += pAccidental * f;
    } else if (startMonth > allCoverEndMonths) {
      uncoveredRisk += pDefect + pAccidental;
      uncoveredDefect += pDefect;
      uncoveredAcc += pAccidental;
    }

    annualTimeline.push({
      year: y,
      label: `Yr ${y}`,
      defectRatePct: Number((pDefect * 100).toFixed(2)),
      accidentalRatePct: Number((pAccidental * 100).toFixed(2)),
      totalRatePct: Number(((pDefect + pAccidental) * 100).toFixed(2)),
    });
  }

  // Hassle avoided: overlap-period defects claimed on the warranty instead of
  // through your legal rights. The overseas slice was never ACL-usable, so it
  // saves no hassle and is excluded.
  const hassleAvoidance = hasStatutory
    ? (ewOverlapDefect - ewOverlapOverseasDefect) * frictionCost
    : 0;

  // Credit card purchase protection: accidental damage covered for ppDays from
  // purchase, with no excess. Risk is read off the same accident curve as the
  // "When failures happen" chart, pro-rated for the covered slice of each year.
  const ppDays = Math.min(3650, Math.max(0, input.purchaseProtectionDays ?? 0));
  const accidentRiskWithinDays = (days: number) =>
    accidentalWeights.reduce(
      (sum, w, i) => sum + w * totalAccidentalProb * clamp((days - i * 365) / 365, 0, 1),
      0
    );
  const ppAccRisk = accidentRiskWithinDays(ppDays);

  // Accident claims in the overlap always belong to the card's purchase
  // protection: it charges no excess, so it beats the paid warranty even when
  // the warranty's own excess is 0. That slice is worth $0 to the warranty.
  const ewPpOverlapAcc = accidentRiskWithinDays(
    Math.min(ppDays, (ewEndMonths / 12) * 365)
  );
  const ewAccTotal = ewOverlapAcc + ewPostAcc;
  const ewAccCounted = includesAccidental
    ? Math.max(0, ewAccTotal - ewPpOverlapAcc)
    : 0;

  // Credit card extended warranty: in the extra months the card adds, defect
  // claims go to the card for free, so that window is worth $0 to the paid
  // warranty (mirrors purchase protection vs accidental claims).
  const freeCoverEndMonths = Math.max(mfrMonths, hasStatutory ? aclMonths : 0);
  const ccOverlapStartMonth = freeCoverEndMonths + 1;
  const ccOverlapEndMonth = Math.min(ccEndMonths, ewEndMonths);
  let ewCcOverlapDefect = 0;
  for (let m = ccOverlapStartMonth; m <= ccOverlapEndMonth; m++) {
    const y = Math.ceil(m / 12);
    if (y > totalYears) break;
    ewCcOverlapDefect += (defectWeights[y - 1] * totalDefectProb) / 12;
  }

  // The quoted excess applies to accidental-damage claims only: defects pay
  // the full repair cost, accidents pay what's left after the excess.
  const ewNetRiskDefect =
    ewOverlapOverseasDefect + ewPostDefect - ewCcOverlapDefect;
  const ewNetRiskAcc = ewAccCounted;
  const ewNetRisk = ewNetRiskDefect + ewNetRiskAcc;

  const mfrEV = mfrRisk * repairCost;
  // A tier's value_factor devalues statutory claims (e.g. 0.75 when the
  // burden of proof sits with the customer)
  const aclFactor = usTier ? usTier.value_factor : 1;
  const aclEV = (isUk || isEu ? aclValueRisk : aclRisk) * repairCost * aclFactor;
  const ewEV = ewNetRisk * repairCost + hassleAvoidance;
  const ppEV = ppAccRisk * repairCost;
  const ccEV = ccRisk * Math.max(0, repairCost - ccExcess);

  // Net value matrix at price-scaled excess levels. The premium axis adapts to
  // the break-even range so positive and net-neutral combinations are visible.
  const excessLevels = scaledExcessLevels(productPrice);

  const fairAt = (exc: number) =>
    ewNetRiskDefect * repairCost + ewNetRiskAcc * Math.max(0, repairCost - exc) + hassleAvoidance;
  const breakEvenLevels = excessLevels.map((exc) => ({
    excess: exc,
    breakEvenPremium: Math.round(fairAt(exc) * 100) / 100,
  }));
  const atZeroExcess = breakEvenLevels[0]?.breakEvenPremium ?? 0;

  const premiums = adaptivePremiums(atZeroExcess);
  const grid: EvaluationResult['matrix']['grid'] = [];

  for (const prem of premiums) {
    const row: EvaluationResult['matrix']['grid'][number] = [];
    for (const exc of excessLevels) {
      const netValue = Math.round(fairAt(exc) - prem);
      row.push({
        premium: prem,
        excess: exc,
        netValue,
        status: netValue > 0 ? 'positive' : netValue === 0 ? 'neutral' : 'negative',
      });
    }
    grid.push(row);
  }

  const freeCoverEnd = freeCoverEndMonths;
  const overlapMonths = Math.max(0, Math.min(freeCoverEnd, ewEndMonths));
  const postAclMonths = Math.max(0, ewEndMonths - freeCoverEnd);

  return {
    repairCost: Math.round(repairCost),
    estimatedAclYears,
    totalFailureRatePct: Number((totalFailureProb * 100).toFixed(1)),
    defectFailureRatePct: Number((totalDefectProb * 100).toFixed(1)),
    accidentalFailureRatePct: Number((totalAccidentalProb * 100).toFixed(1)),
    mfrTrack: {
      riskPercentage: Number((mfrRisk * 100).toFixed(1)),
      expectedValue: Math.round(mfrEV),
    },
    aclTrack: {
      riskPercentage: Number((aclRisk * 100).toFixed(1)),
      expectedValue: Math.round(aclEV),
    },
    ewTrack: {
      totalRiskPercentage: Number(((ewOverlapRisk + ewPostAclRisk) * 100).toFixed(1)),
      overlapRiskPercentage: Number((ewOverlapRisk * 100).toFixed(1)),
      postAclRiskPercentage: Number((ewPostAclRisk * 100).toFixed(1)),
      overlapDefectRiskPercentage: Number((ewOverlapDefect * 100).toFixed(1)),
      overlapOverseasDefectRiskPercentage: Number((ewOverlapOverseasDefect * 100).toFixed(1)),
      overlapAclClaimableDefectRiskPercentage: Number(((ewOverlapDefect - ewOverlapOverseasDefect) * 100).toFixed(1)),
      overlapAccidentalRiskPercentage: Number((ewOverlapAcc * 100).toFixed(1)),
      accidentalRiskPercentage: Number((ewAccTotal * 100).toFixed(1)),
      ppOverlapAccidentalRiskPercentage: Number((ewPpOverlapAcc * 100).toFixed(1)),
      ccOverlapDefectRiskPercentage: Number((ewCcOverlapDefect * 100).toFixed(1)),
      ccOverlapMonths: Math.max(0, ccOverlapEndMonth - freeCoverEndMonths),
      postAclDefectRiskPercentage: Number((ewPostDefect * 100).toFixed(1)),
      postAclAccidentalRiskPercentage: Number((ewPostAcc * 100).toFixed(1)),
      netRiskPercentage: Number((ewNetRisk * 100).toFixed(1)),
      hasOverlap: overlapMonths > 0,
      hasPostAcl: postAclMonths > 0,
      overlapMonths,
      postAclMonths,
      expectedValue: Math.round(ewEV),
    },
    ccTrack: {
      riskPercentage: Number((ccRisk * 100).toFixed(1)),
      expectedValue: Math.round(ccEV),
    },
    ccPurchaseProtection: {
      days: ppDays,
      riskPercentage: Number((ppAccRisk * 100).toFixed(1)),
      expectedValue: Math.round(ppEV),
    },
    uncovered: {
      riskPercentage: Number((uncoveredRisk * 100).toFixed(1)),
      defectRiskPercentage: Number((uncoveredDefect * 100).toFixed(1)),
      accidentalRiskPercentage: Number((uncoveredAcc * 100).toFixed(1)),
      startMonth: uncoveredRisk > 0 ? uncoveredStartMonth : 0,
    },
    annualTimeline,
    matrix: {
      premiums,
      excesses: excessLevels,
      grid,
    },
    breakEven: {
      levels: breakEvenLevels,
      atZeroExcess,
      atQuotedExcess: fairAt(clamp(input.quotedExcess ?? 0, 0, Infinity)),
      netRiskProb: ewNetRisk,
      hassleAvoidance: Math.round(hassleAvoidance * 100) / 100,
    },
    assumed: {
      failureRate,
      accidentRate: accidentRate * 100,
      repairRatio,
      hazard,
    },
  };
}

// Relative failure weight per year for a given ownership length. The same
// shape parameters produce the bathtub: high early risk that decays, a
// steady background, and wear-out that grows quadratically toward the end.
function hazardWeightsFor(hazard: HazardShape, years: number): number[] {
  const weights: number[] = [];
  for (let y = 1; y <= years; y++) {
    const infant = hazard.infantStrength * Math.exp(-hazard.infantDecay * y);
    const wearOut = hazard.wearOutStrength * Math.pow(y / years, 2);
    weights.push(infant + hazard.background + wearOut);
  }
  return weights;
}

// Accidental damage weights: front-loaded when accidentalFrontLoad > 0
// (blend between uniform and all-in-year-1), uniform at 0.
function accidentalWeightsFor(frontLoad: number, years: number): number[] {
  const uniform = 1 / years;
  const weights: number[] = [];
  for (let y = 1; y <= years; y++) {
    const spike = Math.exp(-0.8 * (y - 1));
    const spikeSum = Array.from({ length: years }, (_, i) => Math.exp(-0.8 * i)).reduce((a, b) => a + b, 0);
    const spiked = spike / spikeSum;
    weights.push(uniform * (1 - frontLoad) + spiked * frontLoad);
  }
  return weights;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
