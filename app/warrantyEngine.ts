// warrantyEngine.ts

export interface CategoryConfig {
  name: string;
  failureRate: number; // Baseline 5-year total risk percentage
  accidentalShare: number; // Portion of total failures due to accidental damage
  repairRatio: number; // Repair cost as ratio of price
  aclRules: {
    priceTiers: [number, number];
    years: [number, number, number];
  };
}

export const CATEGORIES: Record<string, CategoryConfig> = {
  smartphones: {
    name: 'Smartphones & Mobile Devices',
    failureRate: 25,
    accidentalShare: 0.4,
    repairRatio: 0.35,
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
  const repairCost = productPrice * catConfig.repairRatio;

  const estimatedAclYears = isAustralia
    ? getEstimatedAclYears(productCategory, productPrice)
    : 0;

  const totalFailureRatePct = (catConfig.failureRate / 5) * ownershipYears;
  const totalFailureProb = totalFailureRatePct / 100;

  const accidentalShare = catConfig.accidentalShare;
  const defectShare = 1 - accidentalShare;

  const totalDefectProb = totalFailureProb * defectShare;
  const totalAccidentalProb = totalFailureProb * accidentalShare;

  const totalYears = Math.max(1, Math.round(ownershipYears));
  const mfrMonths = mfrYears * 12;
  const aclMonths = estimatedAclYears * 12;
  const ewEndMonths = mfrMonths + extendedWarrantyYears * 12;
  const ccEndMonths = mfrMonths + ccExtensionMonths;

  const annualAccidentalProb = totalAccidentalProb / totalYears;

  const rawBathtubWeights: number[] = [];
  let sumBathtubWeights = 0;

  for (let y = 1; y <= totalYears; y++) {
    const infant = 0.6 * Math.exp(-1.2 * y);
    const background = 0.2;
    const wearOut = 0.5 * Math.pow(y / totalYears, 2);
    const w = infant + background + wearOut;
    rawBathtubWeights.push(w);
    sumBathtubWeights += w;
  }

  const annualTimeline: AnnualPoint[] = [];
  let mfrRisk = 0;
  let aclRisk = 0;
  let ccRisk = 0;

  // Extended warranty risks split into overlap (during ACL) and post-ACL
  let ewOverlapRisk = 0; // Months: mfrMonths -> min(aclMonths, ewEndMonths)
  let ewPostAclRisk = 0; // Months: max(mfrMonths, aclMonths) -> ewEndMonths

  for (let y = 1; y <= totalYears; y++) {
    const pDefect = (rawBathtubWeights[y - 1] / sumBathtubWeights) * totalDefectProb;
    const pAccidental = annualAccidentalProb;
    const pTotal = pDefect + pAccidental;

    const startMonth = (y - 1) * 12 + 1;
    const endMonth = y * 12;

    // Manufacturer warranty coverage (defects only)
    if (endMonth <= mfrMonths) {
      mfrRisk += pDefect;
    }

    // Statutory ACL coverage (defects only, Australia)
    if (isAustralia && endMonth <= aclMonths) {
      aclRisk += pDefect;
    }

    // Extended Warranty coverage:
    // Evaluate monthly within current year range
    const activeEwStartMonth = Math.max(startMonth, mfrMonths + 1);
    const activeEwEndMonth = Math.min(endMonth, ewEndMonths);

    if (activeEwStartMonth <= activeEwEndMonth) {
      const activeEwMonthsCount = activeEwEndMonth - activeEwStartMonth + 1;
      const monthFraction = activeEwMonthsCount / 12;

      for (let m = activeEwStartMonth; m <= activeEwEndMonth; m++) {
        const mDefect = pDefect / 12;
        const mAccidental = pAccidental / 12;

        if (m <= aclMonths) {
          // During ACL period
          ewOverlapRisk += includesAccidental ? (mDefect + mAccidental) : mDefect;
        } else {
          // Post-ACL period
          ewPostAclRisk += includesAccidental ? (mDefect + mAccidental) : mDefect;
        }
      }
    }

    // Credit Card extension coverage
    if (startMonth > mfrMonths && endMonth <= ccEndMonths) {
      ccRisk += pDefect;
    }

    annualTimeline.push({
      year: y,
      label: `Yr ${y}`,
      defectRatePct: Number((pDefect * 100).toFixed(2)),
      accidentalRatePct: Number((pAccidental * 100).toFixed(2)),
      totalRatePct: Number((pTotal * 100).toFixed(2)),
    });
  }

  // Calculate Extended Warranty Net Risk:
  // - Manufacturing defects included ONLY after ACL expires
  // - Accidental damage included for the FULL lifetime of the extended warranty (if covered)
  let ewNetRisk = 0;
  for (let y = 1; y <= totalYears; y++) {
    const pDefect = (rawBathtubWeights[y - 1] / sumBathtubWeights) * totalDefectProb;
    const pAccidental = annualAccidentalProb;
    const startMonth = (y - 1) * 12 + 1;
    const endMonth = y * 12;

    const activeEwStartMonth = Math.max(startMonth, mfrMonths + 1);
    const activeEwEndMonth = Math.min(endMonth, ewEndMonths);

    if (activeEwStartMonth <= activeEwEndMonth) {
      for (let m = activeEwStartMonth; m <= activeEwEndMonth; m++) {
        const mDefect = pDefect / 12;
        const mAccidental = pAccidental / 12;

        // Include accidental damage if applicable for all EW months
        if (includesAccidental) {
          ewNetRisk += mAccidental;
        }
        // Include manufacturing defect ONLY after ACL period ends
        if (m > aclMonths) {
          ewNetRisk += mDefect;
        }
      }
    }
  }

  const mfrEV = mfrRisk * repairCost;
  const aclEV = isAustralia ? aclRisk * Math.max(0, repairCost - frictionCost) : 0;
  const ewEV = ewNetRisk * repairCost;
  const ccEV = ccRisk * Math.max(0, repairCost - ccExcess);

  // Calculate Net Value Matrix for Extended Warranty based on net post-ACL / accidental risk
  const premiums = [60, 110, 160, 210, 260, 310, 360];
  const excesses = [0, 30, 60, 90, 120, 150, 180, 210, 240];
  const grid: MatrixCell[][] = [];

  for (const prem of premiums) {
    const row: MatrixCell[] = [];
    for (const exc of excesses) {
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

  const overlapMonths = Math.max(0, Math.min(aclMonths, ewEndMonths) - mfrMonths);
  const postAclMonths = Math.max(0, ewEndMonths - Math.max(mfrMonths, aclMonths));

  return {
    repairCost: Math.round(repairCost),
    estimatedAclYears,
    totalFailureRatePct: Number(totalFailureRatePct.toFixed(1)),
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
      excesses,
      grid,
    },
  };
}
