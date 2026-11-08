// Client-safe pricing-model types and fallback copies of the ew_pricing_*
// tables. Mirrors the database — keep in sync with the seed migration.

export interface EwPricingConfig {
  // Base rate per product category, applied to the purchase price
  rates: Record<string, number>;
  // Multiplier per extension length beyond the manufacturer's warranty,
  // relative to a 2-year baseline of 1.00
  termMultipliers: Record<number, number>;
  // Accidental-damage multipliers
  adldDefectOnly: number;
  adldWithAccidental: number;
  // Per-claim accidental-damage excess, by price band
  excessUnder500: number;
  excess500To1500: number;
  excessOver1500: number;
}

export const EW_PRICING_FALLBACK: EwPricingConfig = {
  rates: {
    appliances: 0.11,
    tvs: 0.12,
    audio: 0.12,
    laptops: 0.14,
    smartphones: 0.17,
  },
  termMultipliers: {
    1: 0.7,
    2: 1.0,
    3: 1.35,
    4: 1.65,
    5: 1.65,
  },
  adldDefectOnly: 1.0,
  adldWithAccidental: 1.75,
  excessUnder500: 50,
  excess500To1500: 100,
  excessOver1500: 150,
};

export function fallbackEwPricing(): EwPricingConfig {
  return { ...EW_PRICING_FALLBACK };
}

// The default offer shown in section 4: a 2-year extension beyond the
// manufacturer's warranty, priced by the market model, with accidental damage
// included at the model's excess.
export function suggestedOffer(
  cfg: EwPricingConfig,
  price: number,
  categoryKey: string,
  mfrYears: number
): { extendedWarrantyYears: number; quotedPremium: number; quotedExcess: number; includesAccidental: boolean } {
  return {
    extendedWarrantyYears: Math.max(0, mfrYears) + 2,
    quotedPremium: Math.round(ewPrice(cfg, price, categoryKey, 2, true)),
    quotedExcess: ewExcess(cfg, price),
    includesAccidental: true,
  };
}

// The market price of a warranty extending `extraYears` beyond the
// manufacturer's warranty on a `price` product in `categoryKey`.
export function ewPrice(
  cfg: EwPricingConfig,
  price: number,
  categoryKey: string,
  extraYears: number,
  includesAccidental: boolean
): number {
  const rate = cfg.rates[categoryKey] ?? 0.14;
  const term = cfg.termMultipliers[extraYears] ?? 1.0;
  const adld = includesAccidental ? cfg.adldWithAccidental : cfg.adldDefectOnly;
  return price * rate * term * adld;
}

// Per-claim accidental-damage excess, picked from the price bands.
export function ewExcess(cfg: EwPricingConfig, price: number): number {
  if (price < 500) return cfg.excessUnder500;
  if (price <= 1500) return cfg.excess500To1500;
  return cfg.excessOver1500;
}
