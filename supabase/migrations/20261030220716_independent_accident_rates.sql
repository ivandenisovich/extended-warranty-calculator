/*
# Independent accident-rate assumption

The "accidental share of failures" assumption tied accident risk to the defect
estimate (a slice of the same total). Accidents and defects are independent
processes, so this migration replaces that coupling with a standalone
per-category "accident_rate" (5-year accidental-damage risk, percent).

- failure_rate is re-seeded to the previous *effective* defect rates
  (old total x (1 - accidental_share)), adjusted for data:
  laptops raised to 20 (SquareTrade: 20.4% malfunction within 3 years).
- accident_rate seeds, data-backed:
  - smartphones 20 (SquareTrade: ~7-11% drop damage per year; only a share
    needs paid repair)
  - laptops 15 (SquareTrade: 10.6% accident within 3 years)
  - tvs 5, appliances 3 (fixed devices, few accident claims)
  - audio 10 (earbuds/headphones dropped often)
- accidental_share column is kept (no data loss) but is no longer read by the app.
*/

ALTER TABLE category_rules
  ADD COLUMN IF NOT EXISTS accident_rate numeric NOT NULL DEFAULT 0
  CHECK (accident_rate >= 0 AND accident_rate <= 100);

UPDATE category_rules SET
  failure_rate = CASE category_key
    WHEN 'smartphones' THEN 15
    WHEN 'laptops' THEN 20
    WHEN 'tvs' THEN 11
    WHEN 'appliances' THEN 14
    WHEN 'audio' THEN 14
  END,
  accident_rate = CASE category_key
    WHEN 'smartphones' THEN 20
    WHEN 'laptops' THEN 15
    WHEN 'tvs' THEN 5
    WHEN 'appliances' THEN 3
    WHEN 'audio' THEN 10
  END,
  notes = CASE category_key
    WHEN 'smartphones' THEN 'Defect risk 15% within 5 years. Accidental damage 20% within 5 years (SquareTrade measured ~7-11% drop damage per year on glass phones; only a share needs paid repair). Repairs cost about 35% of the purchase price. Reasonable life: 2 years under $500, 3 years to $1500, 4 years above.'
    WHEN 'laptops' THEN 'Defect risk 20% within 5 years (SquareTrade: 20.4% malfunction within 3 years). Accidental damage 15% within 5 years (SquareTrade: 10.6% within 3 years). Repairs cost about 40% of price. Reasonable life: 2 years under $800, 3 years to $2000, 5 years above.'
    WHEN 'tvs' THEN 'Low defect risk (11% within 5 years) and few accidents (5%), but when a TV fails, repair costs about half its price. Longer reasonable life: 3/5/7 years across the price tiers.'
    WHEN 'appliances' THEN 'Defect risk 14% within 5 years (Consumer Council survey: washers most breakdown-prone at 14%). Almost no accidental damage (3%). Repairs cost about 45% of price. Longest reasonable life: 3/5/8 years across the price tiers.'
    WHEN 'audio' THEN 'Defect risk 14% within 5 years, plus 10% accidental damage risk (earbuds and headphones are dropped often). Cheapest repairs at 30% of price. Reasonable life: 2 years under $300, 3 years to $1000, 4 years above.'
  END
WHERE category_key IN ('smartphones', 'laptops', 'tvs', 'appliances', 'audio');
