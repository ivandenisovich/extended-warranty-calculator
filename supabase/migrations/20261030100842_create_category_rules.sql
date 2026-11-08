/*
# Create category_rules table (public reference data, no auth)

1. New Tables
- `category_rules` — one row per product category the warranty analyzer supports.
  Makes the per-category estimates inspectable and editable instead of hidden in code.
- `category_key` (text, primary key) — internal key used by the app (e.g. 'smartphones').
- `name` (text) — display name shown in the product-type dropdown.
- `failure_rate` (numeric) — baseline 5-year total risk percentage (e.g. 25 = 25% chance
  of some failure within 5 years).
- `accidental_share` (numeric 0-1) — portion of total failures caused by accidental
  damage (drops, spills) rather than defects.
- `repair_ratio` (numeric 0-1) — typical repair cost as a share of purchase price.
- Bathtub-curve parameters (how failures are distributed over time):
  - `infant_strength` (numeric) — share of failures that happen early ("infant mortality").
  - `infant_decay` (numeric) — how quickly the early-failure burst dies away.
  - `background` (numeric) — steady mid-life failure rate.
  - `wear_out_strength` (numeric) — share of failures that cluster near end of life.
  - `accidental_front_load` (numeric) — how much accidents are concentrated in the
    first months of ownership.
- Implied-warranty price tiers (estimated "reasonable life" by purchase price):
  - `tier1_price` (numeric) — below this price the low tier applies.
  - `tier2_price` (numeric) — between tier1 and tier2 the mid tier applies; above
    tier2 the high tier applies.
  - `years_low`, `years_mid`, `years_high` (numeric) — implied warranty years per tier.
- `notes` (text) — human-readable explanation of the row, for inspection.

2. Security
- Enable RLS on `category_rules`.
- Grant SELECT to `anon` and `authenticated`: intentionally public reference data
  (the app has no sign-in, and the parameters are meant to be inspectable).
  No write policies — edits happen through the database dashboard.
- SELECT policy `USING (true)` because the whole table is intentionally public.

3. Data
- Seeds one row per category, matching the parameters currently in the code:
  smartphones, laptops, tvs, appliances, audio. All share the same bathtub-curve
  defaults (infant 0.6/1.2, background 0.2, wear-out 0.5, accidents front-loaded 0.5).
*/

CREATE TABLE IF NOT EXISTS category_rules (
  category_key text PRIMARY KEY,
  name text NOT NULL,
  failure_rate numeric NOT NULL CHECK (failure_rate >= 0 AND failure_rate <= 100),
  accidental_share numeric NOT NULL CHECK (accidental_share >= 0 AND accidental_share <= 1),
  repair_ratio numeric NOT NULL CHECK (repair_ratio >= 0 AND repair_ratio <= 1),
  infant_strength numeric NOT NULL CHECK (infant_strength >= 0),
  infant_decay numeric NOT NULL CHECK (infant_decay > 0),
  background numeric NOT NULL CHECK (background >= 0),
  wear_out_strength numeric NOT NULL CHECK (wear_out_strength >= 0),
  accidental_front_load numeric NOT NULL CHECK (accidental_front_load >= 0 AND accidental_front_load <= 1),
  tier1_price numeric NOT NULL,
  tier2_price numeric NOT NULL,
  years_low numeric NOT NULL,
  years_mid numeric NOT NULL,
  years_high numeric NOT NULL,
  notes text NOT NULL DEFAULT ''
);

ALTER TABLE category_rules ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON category_rules TO anon, authenticated;

DROP POLICY IF EXISTS "category_rules_public_read" ON category_rules;
CREATE POLICY "category_rules_public_read"
ON category_rules FOR SELECT
TO anon, authenticated
USING (true); -- Intentionally public reference data: estimate parameters the app displays.

INSERT INTO category_rules (category_key, name, failure_rate, accidental_share, repair_ratio, infant_strength, infant_decay, background, wear_out_strength, accidental_front_load, tier1_price, tier2_price, years_low, years_mid, years_high, notes) VALUES
  ('smartphones', 'Smartphones & Mobile Devices', 25, 0.40, 0.35, 0.6, 1.2, 0.2, 0.5, 0.5, 500, 1500, 2, 3, 4,
   'Highest failure rate of the categories (25% within 5 years) and the largest accidental-damage share (40%: drops and spills are common). Repairs cost about 35% of the purchase price. Reasonable life: 2 years under $500, 3 years to $1500, 4 years above.'),
  ('laptops', 'Laptops & Computers', 20, 0.30, 0.40, 0.6, 1.2, 0.2, 0.5, 0.5, 800, 2000, 2, 3, 5,
   '20% failure rate within 5 years, 30% of failures accidental. Repairs are relatively costly at 40% of price. Reasonable life: 2 years under $800, 3 years to $2000, 5 years above.'),
  ('tvs', 'TVs & Home Entertainment', 12, 0.10, 0.50, 0.6, 1.2, 0.2, 0.5, 0.5, 800, 2500, 3, 5, 7,
   'Low failure rate (12% within 5 years) and few accidents (10%), but when a TV fails, repair costs about half its price. Longer reasonable life: 3/5/7 years across the price tiers.'),
  ('appliances', 'Whitegoods & Appliances', 15, 0.05, 0.45, 0.6, 1.2, 0.2, 0.5, 0.5, 600, 2000, 3, 5, 8,
   '15% failure rate within 5 years; almost no accidental damage (5%). Repairs cost about 45% of price. Longest reasonable life: 3/5/8 years across the price tiers.'),
  ('audio', 'Audio & Headphones', 18, 0.25, 0.30, 0.6, 1.2, 0.2, 0.5, 0.5, 300, 1000, 2, 3, 4,
   '18% failure rate within 5 years, a quarter of failures accidental (headphones are dropped and lost often). Cheapest repairs at 30% of price. Reasonable life: 2 years under $300, 3 years to $1000, 4 years above.')
ON CONFLICT (category_key) DO NOTHING;
