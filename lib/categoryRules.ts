// Client-safe reference data: per-category estimate parameters shown in the UI
// and used as fallbacks when the database is unreachable. Mirrors the
// category_rules table — keep in sync with the seed migration.
import type { CategoryRule, HazardShape } from './publicTypes';

export const DEFAULT_HAZARD: HazardShape = {
  infantStrength: 0.6,
  infantDecay: 1.2,
  background: 0.2,
  wearOutStrength: 0.5,
  accidentalFrontLoad: 0.5,
};

export const CATEGORY_RULES: CategoryRule[] = [
  {
    category_key: 'smartphones',
    name: 'Smartphones & Mobile Devices',
    failure_rate: 15,
    accident_rate: 20,
    repair_ratio: 0.35,
    infant_strength: 0.6,
    infant_decay: 1.2,
    background: 0.2,
    wear_out_strength: 0.5,
    accidental_front_load: 0.5,
    tier1_price: 500,
    tier2_price: 1500,
    years_low: 2,
    years_mid: 3,
    years_high: 4,
    notes:
      'Highest failure rate of the categories (15% defect risk within 5 years) and the largest accidental-damage risk (20% within 5 years: drops and spills are common). Repairs cost about 35% of the purchase price. Reasonable life: 2 years under $500, 3 years to $1500, 4 years above.',
  },
  {
    category_key: 'laptops',
    name: 'Laptops & Computers',
    failure_rate: 20,
    accident_rate: 15,
    repair_ratio: 0.4,
    infant_strength: 0.6,
    infant_decay: 1.2,
    background: 0.2,
    wear_out_strength: 0.5,
    accidental_front_load: 0.5,
    tier1_price: 800,
    tier2_price: 2000,
    years_low: 2,
    years_mid: 3,
    years_high: 5,
    notes:
      '20% defect risk within 5 years (SquareTrade measured 20.4% malfunctions within 3 years), plus 15% accidental-damage risk (SquareTrade: 10.6% accidents within 3 years). Repairs are relatively costly at 40% of price. Reasonable life: 2 years under $800, 3 years to $2000, 5 years above.',
  },
  {
    category_key: 'tvs',
    name: 'TVs & Home Entertainment',
    failure_rate: 11,
    accident_rate: 5,
    repair_ratio: 0.5,
    infant_strength: 0.6,
    infant_decay: 1.2,
    background: 0.2,
    wear_out_strength: 0.5,
    accidental_front_load: 0.5,
    tier1_price: 800,
    tier2_price: 2500,
    years_low: 3,
    years_mid: 5,
    years_high: 7,
    notes:
      'Low defect risk (11% within 5 years) and few accidents (5%), but when a TV fails, repair costs about half its price. Longer reasonable life: 3/5/7 years across the price tiers.',
  },
  {
    category_key: 'appliances',
    name: 'Whitegoods & Appliances',
    failure_rate: 14,
    accident_rate: 3,
    repair_ratio: 0.45,
    infant_strength: 0.6,
    infant_decay: 1.2,
    background: 0.2,
    wear_out_strength: 0.5,
    accidental_front_load: 0.5,
    tier1_price: 600,
    tier2_price: 2000,
    years_low: 3,
    years_mid: 5,
    years_high: 8,
    notes:
      '14% defect risk within 5 years; almost no accidental damage (3%). Repairs cost about 45% of price. Longest reasonable life: 3/5/8 years across the price tiers.',
  },
  {
    category_key: 'audio',
    name: 'Audio & Headphones',
    failure_rate: 14,
    accident_rate: 10,
    repair_ratio: 0.3,
    infant_strength: 0.6,
    infant_decay: 1.2,
    background: 0.2,
    wear_out_strength: 0.5,
    accidental_front_load: 0.5,
    tier1_price: 300,
    tier2_price: 1000,
    years_low: 2,
    years_mid: 3,
    years_high: 4,
    notes:
      '14% defect risk within 5 years, plus 10% accidental-damage risk (headphones are dropped and lost often). Cheapest repairs at 30% of price. Reasonable life: 2 years under $300, 3 years to $1000, 4 years above.',
  },
];

export function fallbackCategoryRule(key: string): CategoryRule {
  return (
    CATEGORY_RULES.find((r) => r.category_key === key) ??
    CATEGORY_RULES[0]
  );
}
