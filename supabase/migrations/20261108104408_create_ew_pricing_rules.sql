/*
# Create extended-warranty pricing model tables

1. Plain-English explanation
   Adds the parameters for a second model that estimates the market price of an
   extended warranty offer. It multiplies the product price by a per-category
   base rate, a term multiplier (relative to a 2-year extension baseline), and
   an accidental-damage multiplier, and picks a per-claim accidental-damage
   excess from price bands. The calculator pre-fills section 4 with the result
   so users can compare it against the fair-value model.

2. New Tables
   - `ew_pricing_rates`: one row per product category with its base rate.
     - `category_key` (text, primary key; matches category_rules.category_key)
     - `display_name` (text, human-readable category name)
     - `base_rate` (numeric, multiplier applied to the product price)
   - `ew_pricing_term_multipliers`: multiplier per extension length.
     - `extra_years` (integer, primary key; years of cover beyond the
       manufacturer's warranty)
     - `multiplier` (numeric; 2 years = 1.00 baseline)
   - `ew_pricing_params`: named scalar parameters.
     - `key` (text, primary key)
     - `value` (numeric)
     - `notes` (text, what the parameter controls)
     Seeded keys: adld_defect_only (1.00), adld_with_accidental (1.75),
     excess_tier_under_500 (50), excess_tier_500_to_1500 (100),
     excess_tier_over_1500 (150).

3. Security
   - RLS enabled on all three tables.
   - Read-only reference data: SELECT granted to anon + authenticated with
     USING (true) policies, because this is intentionally public configuration
     and the app has no sign-in. No write grants.
   - The server reads these with the anon key, matching the existing
     jurisdiction/category rule loaders.

4. Notes
   - Seeded values come from the published pricing model. "Audio & Headphones"
     is not named in the model; it is mapped to the stationary-AV rate (0.12)
     and can be tuned in the database without a code change.
*/

CREATE TABLE IF NOT EXISTS ew_pricing_rates (
  category_key text PRIMARY KEY,
  display_name text NOT NULL,
  base_rate numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS ew_pricing_term_multipliers (
  extra_years integer PRIMARY KEY,
  multiplier numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS ew_pricing_params (
  key text PRIMARY KEY,
  value numeric NOT NULL,
  notes text NOT NULL DEFAULT ''
);

INSERT INTO ew_pricing_rates (category_key, display_name, base_rate) VALUES
  ('appliances', 'Whitegoods & Home Appliances', 0.11),
  ('tvs', 'TVs & Stationary AV', 0.12),
  ('audio', 'Audio & Headphones (stationary AV rate)', 0.12),
  ('laptops', 'Laptops & Computers', 0.14),
  ('smartphones', 'Smartphones & Mobile', 0.17)
ON CONFLICT (category_key) DO NOTHING;

INSERT INTO ew_pricing_term_multipliers (extra_years, multiplier) VALUES
  (1, 0.70),
  (2, 1.00),
  (3, 1.35),
  (4, 1.65),
  (5, 1.65)
ON CONFLICT (extra_years) DO NOTHING;

INSERT INTO ew_pricing_params (key, value, notes) VALUES
  ('adld_defect_only', 1.00, 'Accidental-damage multiplier when the warranty excludes accidental damage'),
  ('adld_with_accidental', 1.75, 'Accidental-damage multiplier when the warranty includes accidental damage'),
  ('excess_tier_under_500', 50, 'Per-claim accidental-damage excess for items priced under $500'),
  ('excess_tier_500_to_1500', 100, 'Per-claim accidental-damage excess for items priced $500-$1500'),
  ('excess_tier_over_1500', 150, 'Per-claim accidental-damage excess for items priced above $1500')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE ew_pricing_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ew_pricing_term_multipliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ew_pricing_params ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON ew_pricing_rates TO anon, authenticated;
GRANT SELECT ON ew_pricing_term_multipliers TO anon, authenticated;
GRANT SELECT ON ew_pricing_params TO anon, authenticated;

DROP POLICY IF EXISTS "Public read ew_pricing_rates" ON ew_pricing_rates;
CREATE POLICY "Public read ew_pricing_rates" ON ew_pricing_rates
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read ew_pricing_term_multipliers" ON ew_pricing_term_multipliers;
CREATE POLICY "Public read ew_pricing_term_multipliers" ON ew_pricing_term_multipliers
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read ew_pricing_params" ON ew_pricing_params;
CREATE POLICY "Public read ew_pricing_params" ON ew_pricing_params
  FOR SELECT TO anon, authenticated USING (true);
