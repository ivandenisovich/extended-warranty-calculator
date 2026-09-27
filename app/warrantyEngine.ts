export type ProductCategoryKey =
  | 'MOBILE'
  | 'LAPTOP'
  | 'TV'
  | 'WHITEGOODS'
  | 'AUDIO'
  | 'GENERIC';

export interface CategoryConfig {
  label: string;
  repairRatio: number; // Avg repair cost as a % of purchase price
  failureRate: number; // 5-year cumulative failure rate (%)
  accidentalShare: number; // Share of total failures attributable to accidents
}

export const CATEGORIES: Record<ProductCategoryKey, CategoryConfig> = {
  MOBILE: {
    label: 'Smartphones & Mobile Devices',
    repairRatio: 0.35,
    failureRate: 25,
    accidentalShare: 0.40,
  },
  LAPTOP: {
    label: 'Laptops & Computers',
    repairRatio: 0.30,
    failureRate: 22,
    accidentalShare: 0.25,
  },
  TV: {
    label: 'Televisions & Displays',
    repairRatio: 0.40,
    failureRate: 15,
    accidentalShare: 0.05,
  },
  WHITEGOODS: {
    label: 'Major Appliances / Whitegoods',
    repairRatio: 0.25,
    failureRate: 18,
    accidentalShare: 0.02,
  },
  AUDIO: {
    label: 'Headphones & Audio Equipment',
    repairRatio: 0.20,
    failureRate: 12,
    accidentalShare: 0.20,
  },
  GENERIC: {
    label: 'General Consumer Electronics',
    repairRatio: 0.25,
    failureRate: 20,
    accidentalShare: 0.15,
  },
};

export interface BreakagePoint {
  month: number;
  monthlyHazardPct: number;
  cumulativeRiskPct: number;
  activeProtection: 'mfr' | 'stat' | 'ew' | 'cc' | 'none';
}

export interface MatrixCell {
  premium: number;
  premiumPct: number;
  excess: number;
  excessPct: number;
  netValue: number;
  expectedClaims: number;
}

export interface EvaluationInput {
  productPrice: number;
  productCategory: ProductCategoryKey;
  mfrYears: number;
  extendedWarrantyYears: number;
  ccExtensionMonths: number;
  ccExcess: number;
  ownershipYears: number;
  jurisdiction: 'AU_ACL' | 'OTHER';
  includesAccidental: boolean;
  frictionCost: number; // Value ($) placed on avoiding ACL repair/claim delays
}

export interface EvaluationResult {
  statYears: number;
  profile: BreakagePoint[];
  matrix: MatrixCell[][];
  maxPos: number;
  maxNeg: number;
  avgRepairCost: number;
  failureRatePct: number;
  accidentalSharePct: number;
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

  const catConfig = CATEGORIES[productCategory];
  const avgRepairCost = productPrice * catConfig.repairRatio;
  const failureRatePct = catConfig.failureRate;
  const accidentalShare = catConfig.accidentalShare;

  // 1. Australian Consumer Law (ACL) Statutory Duration Thresholds
  let statYears = 0;
  if (jurisdiction === 'AU_ACL') {
    if (productPrice >= 2000) statYears = 3;
    else if (productPrice >= 1000) statYears = 2;
    else if (productPrice >= 500) statYears = 1.5;
    else statYears = 1;
  }

  const totalMonths = ownershipYears * 12;
  const mfrMonths = mfrYears * 12;
  const ewMonths = extendedWarrantyYears * 12;
  const ccMonths = ccExtensionMonths;
  const statMonths = statYears * 12;

  const baseFailureProb = failureRatePct / 100;

  // 2. Unnormalized Bathtub Curve Weight Distribution
  const rawWeights: number[] = [];
  let sumWeights = 0;

  for (let m = 1; m <= totalMonths; m++) {
    const tYears = m / 12;
    const infant = 0.6 * Math.exp(-1.5 * tYears);
    const random = 0.2;
    const wearOut = 0.5 * Math.pow(tYears / ownershipYears, 2);
    const w = infant + random + wearOut;
    rawWeights.push(w);
    sumWeights += w;
  }

  // 3. Build Hazard Profile Map across time
  const profile: BreakagePoint[] = [];
  const monthlyProbs: number[] = [];
  let runningCumulativeProb = 0;

  for (let m = 1; m <= totalMonths; m++) {
    const monthlyProb = (rawWeights[m - 1] / sumWeights) * baseFailureProb;
    monthlyProbs.push(monthlyProb);
    runningCumulativeProb += monthlyProb;

    let activeProtection: 'mfr' | 'stat' | 'ew' | 'cc' | 'none' = 'none';

    const isMfrActive = m <= mfrMonths;
    const isStatActive = jurisdiction === 'AU_ACL' && m <= statMonths;
    const isEwActive = m > mfrMonths && m <= mfrMonths + ewMonths;
    const isCcActive = m > mfrMonths && m <= mfrMonths + ccMonths;

    if (isMfrActive) {
      activeProtection = 'mfr';
    } else if (isStatActive) {
      activeProtection = 'stat';
    } else if (isEwActive && isCcActive) {
      activeProtection = ccExcess <= 50 ? 'cc' : 'ew';
    } else if (isEwActive) {
      activeProtection = 'ew';
    } else if (isCcActive) {
      activeProtection = 'cc';
    }

    profile.push({
      month: m,
      monthlyHazardPct: monthlyProb * 100,
      cumulativeRiskPct: runningCumulativeProb * 100,
      activeProtection,
    });
  }

  // 4. Net Value Matrix Parameters
  const minPremium = productPrice * 0.05;
  const maxPremium = productPrice * 0.30;
  const minExcess = productPrice * 0.00;
  const maxExcess = productPrice * 0.20;

  const xSteps = 8;
  const ySteps = 7;

  let maxPos = 0;
  let maxNeg = 0;
  const matrix: MatrixCell[][] = [];

  const ewStartMonth = mfrMonths + 1;
  const ewEndMonth = Math.min(totalMonths, mfrMonths + ewMonths);

  for (let y = ySteps; y >= 1; y--) {
    const row: MatrixCell[] = [];
    const p = minPremium + ((y - 1) / (ySteps - 1)) * (maxPremium - minPremium);
    const pPct = productPrice > 0 ? (p / productPrice) * 100 : 0;

    // Apply Friction / Resolution Speed Discount directly to effective premium cost
    const effectivePremium = Math.max(0, p - frictionCost);

    for (let x = 0; x <= xSteps; x++) {
      const e = minExcess + (x / xSteps) * (maxExcess - minExcess);
      const ePct = productPrice > 0 ? (e / productPrice) * 100 : 0;

      let claimsInExtensionWindow = 0;

      // Integrate monthly hazard split between manufacturing defects and accidental damage
      for (let m = ewStartMonth; m <= ewEndMonth; m++) {
        const isMfrActive = m <= mfrMonths;
        const isStatActive = jurisdiction === 'AU_ACL' && m <= statMonths;
        const isCcActive = m <= mfrMonths + ccMonths;

        const pMfr = (1 - accidentalShare) * monthlyProbs[m - 1];
        const pAcc = accidentalShare * monthlyProbs[m - 1];

        let mfrWeight = 0;
        let accWeight = 0;

        // Accidental Damage Component
        if (includesAccidental) {
          if (isCcActive && ccExcess <= e) {
            accWeight = 0; // Credit card is cheaper
          } else {
            accWeight = 1; // Extended Warranty provides unique primary cover
          }
        }

        // Manufacturing / Durability Defect Component
        if (isMfrActive || isStatActive) {
          mfrWeight = 0; // Covered at $0 cost by Manufacturer or ACL Statutory Guarantee
        } else if (isCcActive && ccExcess <= e) {
          mfrWeight = 0; // Credit card is better/cheaper
        } else {
          mfrWeight = 1; // Extended Warranty is primary
        }

        claimsInExtensionWindow += pMfr * mfrWeight + pAcc * accWeight;
      }

      const insurerPayoutPerClaim = Math.max(0, avgRepairCost - e);
      const expectedInsurancePayout = claimsInExtensionWindow * insurerPayoutPerClaim;
      const netValue = expectedInsurancePayout - effectivePremium;

      if (netValue > maxPos) maxPos = netValue;
      if (netValue < maxNeg) maxNeg = netValue;

      row.push({
        premium: p,
        premiumPct: pPct,
        excess: e,
        excessPct: ePct,
        netValue,
        expectedClaims: claimsInExtensionWindow,
      });
    }
    matrix.push(row);
  }

  return {
    statYears,
    profile,
    matrix,
    maxPos,
    maxNeg,
    avgRepairCost,
    failureRatePct,
    accidentalSharePct: accidentalShare * 100,
  };
}
