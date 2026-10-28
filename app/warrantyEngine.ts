// warrantyEngine.ts — server-only. The model logic must never ship to the
// browser; the client talks to /api/evaluate and receives results only.
import 'server-only';

import type {
  EvaluationResult,
  HazardShape,
} from '../lib/publicTypes';

export type { EvaluationResult };

export interface CategoryConfig {
  name: string;
  failureRate: number; // Baseline 5-year total risk percentage
  accidentalShare: number; // Portion of total failures due to accidental damage
  repairRatio: number; // Repair cost as ratio of price
  hazard: HazardShape;
  aclRules: {
    priceTiers: [number, number];
    years: [number, number, number];
  };
}

export const DEFAULT_HAZARD: HazardShape = {
  infantStrength: 0.6,
  infantDecay: 1.2,
  background: 0.2,
  wearOutStrength: 0.5,
  accidentalFrontLoad: 0.5,
};

export const CATEGORIES: Record<string, CategoryConfig> = {
  smartphones: {
    name: 'Smartphones & Mobile Devices',
    failureRate: 25,
    accidentalShare: 0.4,
    repairRatio: 0.35,
    hazard: { ...DEFAULT_HAZARD },
    aclRules: {
      priceTiers: [500, 1500],
      years: [2, 3, 4],
    },
  },
  laptops: {
    name: 'Laptops & Computers',
    failureRate: 20,
    accidentalShare: 0.3,
    repairRatio: 0.4,
    hazard: { ...DEFAULT_HAZARD },
    aclRules: {
      priceTiers: [800, 2000],
      years: [2, 3, 5],
    },
  },
  tvs: {
    name: 'TVs & Home Entertainment',
    failureRate: 12,
    accidentalShare: 0.1,
    repairRatio: 0.5,
    hazard: { ...DEFAULT_HAZARD },
    aclRules: {
      priceTiers: [800, 2500],
      years: [3, 5, 7],
    },
  },
  appliances: {
    name: 'Whitegoods & Appliances',
    failureRate: 15,
    accidentalShare: 0.05,
    repairRatio: 0.45,
    hazard: { ...DEFAULT_HAZARD },
    aclRules: {
      priceTiers: [600, 2000],
      years: [3, 5, 8],
    },
  },
  audio: {
    name: 'Audio & Headphones',
    failureRate: 18,
    accidentalShare: 0.25,
    repairRatio: 0.3,
    hazard: { ...DEFAULT_HAZARD },
    aclRules: {
      priceTiers: [300, 1000],
      years: [2, 3, 4],
    },
  },
};

// Ordered category list + defaults for the client (no model parameters).
export function publicCategoryList(): {
  key: string;
  name: string;
  defaults: { failureRate: number; accidentalShare: number; repairRatio: number };
}[] {
  return Object.entries(CATEGORIES).map(([key, cat]) => ({
    key,
    name: cat.name,
    defaults: {
      failureRate: cat.failureRate,
      accidentalShare: Math.round(cat.accidentalShare * 100),
      repairRatio: Math.round(cat.repairRatio * 100),
    },
  }));
}

export function getEstimatedAclYears(categoryKey: string, price: number): number {
  const cat = CATEGORIES[categoryKey] || CATEGORIES.smartphones;
  const [tier1, tier2] = cat.aclRules.priceTiers;
  const [yrLow, yrMid, yrHigh] = cat.aclRules.years;

  if (price < tier1) return yrLow;
  if (price <= tier2) return yrMid;
  return yrHigh;
}

export interface EvaluationInput {
  productPrice: number;
  productCategory: string;
  mfrYears: number;
  extendedWarrantyYears: number;
  ccExtensionMonths: number;
  ccExcess: number;
  ownershipYears: number;
  jurisdiction: 'australia' | 'other';
  includesAccidental: boolean;
  frictionCost: number;
  // Optional user-tuned assumptions; fall back to category defaults
  failureRate?: number;
  accidentalShare?: number;
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

  const isAustralia = jurisdiction === 'australia';
  const catConfig = CATEGORIES[productCategory] || CATEGORIES.smartphones;

  // Tunable assumptions (fall back to category defaults)
  const failureRate = input.failureRate ?? catConfig.failureRate;
  const accidentalShare = clamp(input.accidentalShare ?? catConfig.accidentalShare, 0, 1);
  const repairRatio = input.repairRatio ?? catConfig.repairRatio;
  const hazard: HazardShape = { ...DEFAULT_HAZARD, ...(input.hazard ?? {}) };

  const repairCost = productPrice * repairRatio;

  const estimatedAclYears = isAustralia
    ? getEstimatedAclYears(productCategory, productPrice)
    : 0;

  // Total failure probability scales with ownership duration along the hazard
  // curve: a 5-year baseline rate is the reference point, and shorter/longer
  // ownership periods accumulate risk unevenly (front- and end-loaded).
  const totalYears = Math.max(1, Math.round(ownershipYears));
  const hazardWeights = hazardWeightsFor(hazard, totalYears);
  const cumulativeRisk = hazardWeights.reduce((a, b) => a + b, 0);
  const baseline5Risk = failureRate / 100;
  const scale5 = hazardWeightsFor(hazard, 5).reduce((a, b) => a + b, 0);
  const totalFailureProb = Math.min(1, (baseline5Risk / scale5) * cumulativeRisk);

  const defectShare = 1 - accidentalShare;
  const totalDefectProb = totalFailureProb * defectShare;
  const totalAccidentalProb = totalFailureProb * accidentalShare;

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
  let ccRisk = 0;
  let ewOverlapRisk = 0;
  let ewPostAclRisk = 0;
  let ewNetRisk = 0;
  let ewOverlapDefect = 0;
  let ewOverlapAcc = 0;
  let ewPostDefect = 0;
  let ewPostAcc = 0;
  let uncoveredRisk = 0;
  let uncoveredDefect = 0;
  let uncoveredAcc = 0;
  const allCoverEndMonths = Math.max(
    mfrMonths,
    isAustralia ? aclMonths : 0,
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

    if (isAustralia && endMonth <= aclMonths) {
      aclRisk += pDefect;
    }

    const activeEwStartMonth = startMonth;
    const activeEwEndMonth = Math.min(endMonth, ewEndMonths);

    if (activeEwStartMonth <= activeEwEndMonth) {
      const activeEwMonthsCount = activeEwEndMonth - activeEwStartMonth + 1;
      const monthFraction = activeEwMonthsCount / 12;
      const ewDefectInYear = pDefect * monthFraction;
      const ewAccidentalInYear = includesAccidental ? pAccidental * monthFraction : 0;

      // Free cover runs from purchase too: maker's warranty first, then ACL.
      const freeEnd = Math.max(mfrMonths, isAustralia ? aclMonths : 0);
      const overlapEnd = Math.min(activeEwEndMonth, freeEnd);
      if (overlapEnd >= activeEwStartMonth) {
        const overlapMonthsInYear = overlapEnd - activeEwStartMonth + 1;
        const f = overlapMonthsInYear / activeEwMonthsCount;
        ewOverlapRisk += (ewDefectInYear + ewAccidentalInYear) * f;
        ewOverlapDefect += ewDefectInYear * f;
        ewOverlapAcc += ewAccidentalInYear * f;
        if (includesAccidental) ewNetRisk += ewAccidentalInYear * f;
      }

      const postAclStart = Math.max(activeEwStartMonth, freeEnd + 1);
      if (postAclStart <= activeEwEndMonth) {
        const postMonthsInYear = activeEwEndMonth - postAclStart + 1;
        const f = postMonthsInYear / activeEwMonthsCount;
        ewPostAclRisk += (ewDefectInYear + ewAccidentalInYear) * f;
        ewPostDefect += ewDefectInYear * f;
        ewPostAcc += ewAccidentalInYear * f;
        ewNetRisk += (ewDefectInYear + ewAccidentalInYear) * f;
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

  const mfrEV = mfrRisk * repairCost;
  const aclEV = isAustralia ? aclRisk * Math.max(0, repairCost - frictionCost) : 0;
  const ewEV = ewNetRisk * repairCost;
  const ccEV = ccRisk * Math.max(0, repairCost - ccExcess);

  // Net value matrix at price-scaled excess levels. The premium axis adapts to
  // the break-even range so positive and net-neutral combinations are visible.
  const excessLevels = scaledExcessLevels(productPrice);

  const fairAt = (exc: number) => ewNetRisk * Math.max(0, repairCost - exc);
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

  const freeCoverEnd = Math.max(mfrMonths, isAustralia ? aclMonths : 0);
  const overlapMonths = Math.max(0, Math.min(freeCoverEnd, ewEndMonths));
  const postAclMonths = Math.max(0, ewEndMonths - freeCoverEnd);

  return {
    repairCost: Math.round(repairCost),
    estimatedAclYears,
    totalFailureRatePct: Number((totalFailureProb * 100).toFixed(1)),
    defectFailureRatePct: Number((totalFailureProb * defectShare * 100).toFixed(1)),
    accidentalFailureRatePct: Number((totalFailureProb * (1 - defectShare) * 100).toFixed(1)),
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
      overlapAccidentalRiskPercentage: Number((ewOverlapAcc * 100).toFixed(1)),
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
      netRiskProb: ewNetRisk,
    },
    assumed: {
      failureRate,
      accidentalShare,
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
