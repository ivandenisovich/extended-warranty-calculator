// Client-safe shared types. Contains data shapes only — no model logic.

export type Jurisdiction =
  | 'australia'
  | 'new-zealand'
  | 'england'
  | 'wales'
  | 'scotland'
  | 'france'
  | 'germany'
  | 'spain'
  | 'portugal'
  | 'sweden'
  | 'finland'
  | 'netherlands'
  | 'eu-other'
  | 'united-states'
  | 'other';

// One row of the category_rules table: the estimate parameters for a product
// category, kept in the database so they are inspectable.
export interface CategoryRule {
  category_key: string;
  name: string;
  // Baseline 5-year defect-failure risk percentage (defects only, accidents excluded)
  failure_rate: number;
  // 5-year accidental-damage risk percentage, independent of failure_rate (0-100)
  accident_rate: number;
  // Typical repair cost as a share of purchase price (0-1)
  repair_ratio: number;
  // Bathtub-curve shape: early failures, steady mid-life rate, wear-out
  infant_strength: number;
  infant_decay: number;
  background: number;
  wear_out_strength: number;
  // How concentrated accidents are in early ownership (0-1)
  accidental_front_load: number;
  // Implied-warranty price tiers: below tier1_price -> years_low, up to
  // tier2_price -> years_mid, above -> years_high
  tier1_price: number;
  tier2_price: number;
  years_low: number;
  years_mid: number;
  years_high: number;
  notes: string;
}

// One row of the us_consumer_tiers table: the implied-warranty rules that
// apply to every state in the tier, kept in the database so they are
// inspectable.
export interface UsTierRule {
  tier: number;
  name: string;
  notes: string;
  // 'none' = no implied warranty; 'flat' = flat_years for every product;
  // 'category_estimate' = the per-category expected-life estimate bounded by
  // cap_years (null = uncapped)
  duration_model: 'none' | 'flat' | 'category_estimate';
  flat_years: number | null;
  cap_years: number | null;
  // Multiplier on the value of claims under the implied warranty (0-1);
  // below 1 models a weakened right, e.g. burden of proof on the customer
  value_factor: number;
}

// One row of the us_states table.
export interface UsStateEntry {
  state_code: string;
  state_name: string;
  tier: number;
}

// One row of the jurisdiction_rules table: the statutory consumer-law
// parameters for a country, kept in the database so they are inspectable.
export interface JurisdictionRule {
  jurisdiction: Jurisdiction;
  display_name: string;
  group_name: string;
  law_name: string;
  law_short: string;
  // 'flat' = fixed flat_years; 'category_estimate' = estimated reasonable life
  // bounded by min_years (floor) and cap_years (ceiling, null = uncapped)
  duration_model: 'flat' | 'category_estimate';
  flat_years: number | null;
  min_years: number | null;
  cap_years: number | null;
  // 'full' = full value throughout; 'uk_step_decline' = haircut at
  // step_month then linear decline to zero; 'eu_reversal_step' = haircut at
  // step_month then constant (1 - haircut_size) for the rest
  value_model: 'full' | 'uk_step_decline' | 'eu_reversal_step';
  step_month: number | null;
  // Fraction of value lost at step_month (0-1); post-step value = 1 - haircut_size
  haircut_size: number | null;
  notes: string;
}

export interface HazardShape {
  infantStrength: number; // Early-defect burst strength
  infantDecay: number; // How fast the early burst fades per year
  background: number; // Steady random-failure rate across all years
  wearOutStrength: number; // Wear-out failures near end of ownership
  accidentalFrontLoad: number; // 0 = accidental risk spread evenly, 1 = all in year 1
}

export interface Assumptions {
  failureRate: number; // 0-100, defect-only, as shown on the page
  accidentRate: number; // 0-100, independent of failureRate, as shown on the page
  repairRatio: number; // 0-100 as shown on the page
  hazard: HazardShape;
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
  overlapRiskPercentage: number; // Purchase to free cover end
  postAclRiskPercentage: number; // Free cover end to EW end
  overlapDefectRiskPercentage: number;
  overlapOverseasDefectRiskPercentage: number;
  overlapAclClaimableDefectRiskPercentage: number;
  overlapAccidentalRiskPercentage: number;
  accidentalRiskPercentage: number; // All accident risk while the paid warranty runs
  ppOverlapAccidentalRiskPercentage: number; // Slice also covered by card purchase protection
  ccOverlapDefectRiskPercentage: number; // Defect slice also covered free by the card's extended warranty
  ccOverlapMonths: number; // Months of the paid warranty also covered by the card's extension
  postAclDefectRiskPercentage: number;
  postAclAccidentalRiskPercentage: number;
  netRiskPercentage: number; // Defect post-ACL + Accidental full lifetime
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
  status: 'positive' | 'neutral' | 'negative';
}

export interface EvaluationResult {
  repairCost: number;
  estimatedAclYears: number;
  totalFailureRatePct: number;
  defectFailureRatePct: number;
  accidentalFailureRatePct: number;
  mfrTrack: TrackSummary;
  aclTrack: TrackSummary;
  ewTrack: EwTrackSummary;
  ccTrack: TrackSummary;
  ccPurchaseProtection: {
    days: number;
    riskPercentage: number;
    expectedValue: number;
  };
  uncovered: {
    riskPercentage: number;
    defectRiskPercentage: number;
    accidentalRiskPercentage: number;
    // First month of ownership with no cover at all (1-based; 0 = covered throughout)
    startMonth: number;
  };
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
    // Fair premium at the user's quoted excess (accident claims only)
    atQuotedExcess: number;
    // Net risk the EW actually covers, as a probability (0-1)
    netRiskProb: number;
    // Dollar value of avoided ACL hassle included in the fair price
    hassleAvoidance: number;
  };
  assumed: {
    failureRate: number;
    accidentRate: number;
    repairRatio: number;
    hazard: HazardShape;
  };
}

export interface CategoryOption {
  key: string;
  name: string;
}

export interface CategoryDefaults {
  failureRate: number;
  accidentRate: number;
  repairRatio: number;
}

// One row of the app_settings table: key/value storage for calculator
// defaults, editable without code changes.
export interface AppSettings {
  key: string;
  value: Record<string, unknown>;
  notes: string;
}

// The calculator's form defaults, loaded from the app_settings 'defaults' row.
export interface CalculatorDefaults {
  productPrice: number;
  ownershipYears: number;
  mfrYears: number;
  extendedWarrantyYears: number;
  purchaseProtectionDays: number;
  frictionCost: number;
  ccExtensionMonths: number;
  ccExcess: number;
  quotedExcess: number;
}
