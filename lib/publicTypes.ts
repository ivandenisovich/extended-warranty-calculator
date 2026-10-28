// Client-safe shared types. Contains data shapes only — no model logic.

export interface HazardShape {
  infantStrength: number; // Early-defect burst strength
  infantDecay: number; // How fast the early burst fades per year
  background: number; // Steady random-failure rate across all years
  wearOutStrength: number; // Wear-out failures near end of ownership
  accidentalFrontLoad: number; // 0 = accidental risk spread evenly, 1 = all in year 1
}

export interface Assumptions {
  failureRate: number; // 0-100 as shown on the page
  accidentalShare: number; // 0-100 as shown on the page
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
  overlapAccidentalRiskPercentage: number;
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

export interface CategoryOption {
  key: string;
  name: string;
}

export interface CategoryDefaults {
  failureRate: number;
  accidentalShare: number;
  repairRatio: number;
}
