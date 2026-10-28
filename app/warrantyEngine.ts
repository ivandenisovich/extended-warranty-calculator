// warrantyEngine.ts

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

// Shape of failure risk over the ownership period. Weights are relative and
// normalised, so only proportions matter.
export interface HazardShape {
  infantStrength: number; // Early-defect burst strength
  infantDecay: number; // How fast the early burst fades per year
  background: number; // Steady random-failure rate across all years
  wearOutStrength: number; // Wear-out failures near end of ownership
  accidentalFrontLoad: number; // 0 = accidental risk spread evenly, 1 = all in year 1
}

export const DEFAULT_HAZARD: HazardShape = {
  infantStrength: 0.6,
  infantDecay: 1.2,
  background: 0.2,
  wearOutStrength: 0.5,
  accidentalFrontLoad: 0,
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

export interface AnnualPoint {
  year: number;
  label: string;
  defectRatePct: number;
  accidentalRatePct: number;
  totalRatePct: number;
}

export interface TrackSummary {
  riskPercentage: number;
  expectedValue: number;
}

export interface EwTrackSummary {
  totalRiskPercentage: number;
  overlapRiskPercentage: number; // Mfr end to ACL end
  postAclRiskPercentage: number; // ACL end to EW end
  netRiskPercentage: number;    // Defect post-ACL + Accidental full lifetime
  hasOverlap: boolean;
  hasPostAcl: boolean;
  overlapMonths: number;
  postAclMonths: number;
  expectedValue: number;
}

export interface MatrixCell {
  premium: number;
  excess: number;
  netValue: number;
  isPositive: boolean;
}

export interface EvaluationResult {
  repairCost: number;
  estimatedAclYears: number;
  totalFailureRatePct: number;
  defectSharePct: number;
  accidentalSharePct: number;
  mfrTrack: TrackSummary;
  aclTrack: TrackSummary;
  ewTrack: EwTrackSummary;
  ccTrack: TrackSummary;
  annualTimeline: AnnualPoint[];
  matrix: {
    premiums: number[];
    excesses: number[];
    grid: MatrixCell[][];
  };
  breakEven: {
    // Break-even premium for each price-scaled excess level
    levels: { excess: number; breakEvenPremium: number }[];
    atZeroExcess: number;
    // Net risk the EW actually covers, as a probability (0-1)
    netRiskProb: number;
  };
  assumed: {
    failureRate: number;
    accidentalShare: number;
    repairRatio: number;
    hazard: HazardShape;
  };
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
  const ewEndMonths = mfrMonths + extendedWarrantyYears * 12;
  const ccEndMonths = mfrMonths + ccExtensionMonths;

  const defectWeights = hazardWeights.map((w) => w / cumulativeRisk);
  const accidentalWeights = accidentalWeightsFor(hazard.accidentalFrontLoad, totalYears);

  const annualTimeline: AnnualPoint[] = [];
  let mfrRisk = 0;
  let aclRisk = 0;
  let ccRisk = 0;
  let ewOverlapRisk = 0;
  let ewPostAclRisk = 0;
  let ewNetRisk = 0;

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

    const activeEwStartMonth = Math.max(startMonth, mfrMonths + 1);
    const activeEwEndMonth = Math.min(endMonth, ewEndMonths);

    if (activeEwStartMonth <= activeEwEndMonth) {
      const activeEwMonthsCount = activeEwEndMonth - activeEwStartMonth + 1;
      const monthFraction = activeEwMonthsCount / 12;
      const ewDefectInYear = pDefect * monthFraction;
      const ewAccidentalInYear = includesAccidental ? pAccidental * monthFraction : 0;

      const overlapEnd = Math.min(activeEwEndMonth, aclMonths);
      if (overlapEnd >= activeEwStartMonth) {
        const overlapMonthsInYear = overlapEnd - activeEwStartMonth + 1;
        const f = overlapMonthsInYear / activeEwMonthsCount;
        ewOverlapRisk += (ewDefectInYear + ewAccidentalInYear) * f;
        if (includesAccidental) ewNetRisk += ewAccidentalInYear * f;
      }

      const postAclStart = Math.max(activeEwStartMonth, aclMonths + 1);
      if (postAclStart <= activeEwEndMonth) {
        const postMonthsInYear = activeEwEndMonth - postAclStart + 1;
        const f = postMonthsInYear / activeEwMonthsCount;
        ewPostAclRisk += (ewDefectInYear + ewAccidentalInYear) * f;
        ewNetRisk += (ewDefectInYear + ewAccidentalInYear) * f;
      }
    }

    if (startMonth > mfrMonths && endMonth <= ccEndMonths) {
      ccRisk += pDefect;
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

  // Net value matrix at price-scaled excess levels
  const excessLevels = scaledExcessLevels(productPrice);
  const premiums = [60, 110, 160, 210, 260, 310, 360];
  const grid: MatrixCell[][] = [];

  for (const prem of premiums) {
    const row: MatrixCell[] = [];
    for (const exc of excessLevels) {
      const netEv = ewNetRisk * Math.max(0, repairCost - exc);
      const netValue = Math.round(netEv - prem);
      row.push({
        premium: prem,
        excess: exc,
        netValue,
        isPositive: netValue > 0,
      });
    }
    grid.push(row);
  }

  // Break-even premium: fair price = expected covered payout at each excess
  const breakEvenLevels = excessLevels.map((exc) => ({
    excess: exc,
    breakEvenPremium: Math.round(ewNetRisk * Math.max(0, repairCost - exc)),
  }));
  const atZeroExcess = breakEvenLevels[0]?.breakEvenPremium ?? 0;

  const overlapMonths = Math.max(0, Math.min(aclMonths, ewEndMonths) - mfrMonths);
  const postAclMonths = Math.max(0, ewEndMonths - Math.max(mfrMonths, aclMonths));

  return {
    repairCost: Math.round(repairCost),
    estimatedAclYears,
    totalFailureRatePct: Number((totalFailureProb * 100).toFixed(1)),
    defectSharePct: Math.round(defectShare * 100),
    accidentalSharePct: Math.round(accidentalShare * 100),
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
