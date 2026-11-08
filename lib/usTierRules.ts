// Client-safe reference data: US consumer-rights tiers and the state-to-tier
// mapping, shown in the UI and used as fallbacks when the database is
// unreachable. Mirrors the us_consumer_tiers and us_states tables — keep in
// sync with their migrations.
import type { UsStateEntry, UsTierRule } from './publicTypes';

export const US_TIERS: UsTierRule[] = [
  {
    tier: 1,
    name: 'Tier 1 (strongest consumer rights)',
    notes:
      'Implied warranty follows the standard expected-life estimate per product category (same table as Australia), capped at 4 years. Claims are worth 75% of face value because the burden of proof sits with the customer.',
    duration_model: 'category_estimate',
    flat_years: null,
    cap_years: 4,
    value_factor: 0.75,
  },
  {
    tier: 2,
    name: 'Tier 2 (moderate consumer rights)',
    notes:
      'Flat 1-year implied warranty on all items sold, regardless of whether a manufacturer warranty is offered. Claims at full value.',
    duration_model: 'flat',
    flat_years: 1,
    cap_years: null,
    value_factor: 1.0,
  },
  {
    tier: 3,
    name: 'Tier 3 (baseline consumer rights)',
    notes:
      'No implied warranty period. No statutory defect cover beyond the manufacturer warranty.',
    duration_model: 'none',
    flat_years: 0,
    cap_years: null,
    value_factor: 1.0,
  },
];

export const US_STATES: UsStateEntry[] = [
  { state_code: 'MA', state_name: 'Massachusetts', tier: 1 },
  { state_code: 'ME', state_name: 'Maine', tier: 1 },
  { state_code: 'MD', state_name: 'Maryland', tier: 1 },
  { state_code: 'MS', state_name: 'Mississippi', tier: 1 },
  { state_code: 'WV', state_name: 'West Virginia', tier: 1 },
  { state_code: 'KS', state_name: 'Kansas', tier: 1 },
  { state_code: 'VT', state_name: 'Vermont', tier: 1 },
  { state_code: 'NH', state_name: 'New Hampshire', tier: 1 },
  { state_code: 'DC', state_name: 'District of Columbia', tier: 1 },
  { state_code: 'CT', state_name: 'Connecticut', tier: 1 },
  { state_code: 'MN', state_name: 'Minnesota', tier: 1 },
  { state_code: 'WA', state_name: 'Washington', tier: 1 },
  { state_code: 'CA', state_name: 'California', tier: 2 },
  { state_code: 'AL', state_name: 'Alabama', tier: 3 },
  { state_code: 'AK', state_name: 'Alaska', tier: 3 },
  { state_code: 'AZ', state_name: 'Arizona', tier: 3 },
  { state_code: 'AR', state_name: 'Arkansas', tier: 3 },
  { state_code: 'CO', state_name: 'Colorado', tier: 3 },
  { state_code: 'DE', state_name: 'Delaware', tier: 3 },
  { state_code: 'GA', state_name: 'Georgia', tier: 3 },
  { state_code: 'HI', state_name: 'Hawaii', tier: 3 },
  { state_code: 'ID', state_name: 'Idaho', tier: 3 },
  { state_code: 'IN', state_name: 'Indiana', tier: 3 },
  { state_code: 'IA', state_name: 'Iowa', tier: 3 },
  { state_code: 'KY', state_name: 'Kentucky', tier: 3 },
  { state_code: 'LA', state_name: 'Louisiana', tier: 3 },
  { state_code: 'MI', state_name: 'Michigan', tier: 3 },
  { state_code: 'MO', state_name: 'Missouri', tier: 3 },
  { state_code: 'MT', state_name: 'Montana', tier: 3 },
  { state_code: 'NE', state_name: 'Nebraska', tier: 3 },
  { state_code: 'NV', state_name: 'Nevada', tier: 3 },
  { state_code: 'NM', state_name: 'New Mexico', tier: 3 },
  { state_code: 'NY', state_name: 'New York', tier: 3 },
  { state_code: 'NC', state_name: 'North Carolina', tier: 3 },
  { state_code: 'ND', state_name: 'North Dakota', tier: 3 },
  { state_code: 'OH', state_name: 'Ohio', tier: 3 },
  { state_code: 'OK', state_name: 'Oklahoma', tier: 3 },
  { state_code: 'PA', state_name: 'Pennsylvania', tier: 3 },
  { state_code: 'RI', state_name: 'Rhode Island', tier: 3 },
  { state_code: 'SC', state_name: 'South Carolina', tier: 3 },
  { state_code: 'SD', state_name: 'South Dakota', tier: 3 },
  { state_code: 'TN', state_name: 'Tennessee', tier: 3 },
  { state_code: 'TX', state_name: 'Texas', tier: 3 },
  { state_code: 'UT', state_name: 'Utah', tier: 3 },
  { state_code: 'VA', state_name: 'Virginia', tier: 3 },
  { state_code: 'NJ', state_name: 'New Jersey', tier: 3 },
  { state_code: 'FL', state_name: 'Florida', tier: 3 },
  { state_code: 'OR', state_name: 'Oregon', tier: 3 },
  { state_code: 'IL', state_name: 'Illinois', tier: 3 },
  { state_code: 'WI', state_name: 'Wisconsin', tier: 3 },
  { state_code: 'WY', state_name: 'Wyoming', tier: 3 },
];

export function usStateEntry(code: string): UsStateEntry | undefined {
  return US_STATES.find((s) => s.state_code === code.toUpperCase());
}

export function usTierRule(tier: number): UsTierRule {
  return US_TIERS.find((t) => t.tier === tier) ?? US_TIERS[US_TIERS.length - 1];
}

export function usTierOf(stateCode: string): number {
  return usStateEntry(stateCode)?.tier ?? 3;
}
