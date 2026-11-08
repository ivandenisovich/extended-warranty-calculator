/*
# Create jurisdiction_rules table (public reference data, no auth)

1. New Tables
- `jurisdiction_rules` — one row per country/region the warranty analyzer supports.
  Makes the consumer-law parameters inspectable and editable instead of hidden in code.
- `jurisdiction` (text, primary key) — internal key used by the app (e.g. 'australia', 'england', 'eu-other').
- `display_name` (text) — country name shown in the UI (e.g. 'Australia', 'the Netherlands').
- `group_name` (text) — dropdown grouping: 'Oceania', 'United Kingdom', 'European Union', 'Other'.
- `law_name` (text) — full name of the consumer law regime (e.g. 'Australian Consumer Law').
- `law_short` (text) — short name used in labels (e.g. 'ACL', 'CRA', 'EU law').
- `duration_model` (text) — how long the free statutory cover lasts:
    'flat' = a fixed number of years (`flat_years`);
    'category_estimate' = estimated "reasonable life" from product category and price,
    bounded by `min_years` (floor) and `cap_years` (ceiling, null = no cap).
- `flat_years` (integer, nullable) — fixed duration when duration_model is 'flat' (0 = no statutory cover).
- `min_years` (integer, nullable) — floor for category estimates (e.g. EU 2-year minimum).
- `cap_years` (integer, nullable) — ceiling for category estimates (e.g. UK 6/5-year caps).
- `value_model` (text) — how the statutory cover's dollar value behaves over time:
    'full' = full value for the whole period (Australia, New Zealand, and 'other' = no cover);
    'uk_step_decline' = full value until `step_month`, then 75% and a linear decline to zero
      at the end of the period (England, Wales, Scotland);
    'eu_reversal_step' = full value until `step_month` (the reversal period), then 75% for the
      rest of the period with no further decline (EU countries).
- `step_month` (integer, nullable) — month when the value drops: 6 for UK (burden of proof flips),
    12 or 24 for EU reversal period.
- `notes` (text) — human-readable explanation of the row, for inspection.

2. Security
- Enable RLS on `jurisdiction_rules`.
- Grant SELECT to `anon` and `authenticated`: this is intentionally public reference data
  (the app has no sign-in, and the rules are meant to be inspectable). No write grants —
  the app only reads; edits happen through the database dashboard.
- SELECT policy `USING (true)` because the whole table is intentionally public reference data.

3. Data
- Seeds one row per supported jurisdiction, matching the parameters currently in the code:
  Australia and New Zealand (category estimate, full value); England/Wales (cap 6, step at
  month 6, decline to zero); Scotland (cap 5, step at month 6, decline to zero); EU standard
  countries (flat 2 years, reversal at 12 months); France/Germany/Spain/Portugal/Sweden
  (reversal at 24 months; Sweden 3 years); Finland/Netherlands (category estimate, floor 2);
  'eu-other' (flat 2 years, reversal 12); 'other' (no statutory cover).
*/

CREATE TABLE IF NOT EXISTS jurisdiction_rules (
  jurisdiction text PRIMARY KEY,
  display_name text NOT NULL,
  group_name text NOT NULL,
  law_name text NOT NULL,
  law_short text NOT NULL,
  duration_model text NOT NULL CHECK (duration_model IN ('flat', 'category_estimate')),
  flat_years integer,
  min_years integer,
  cap_years integer,
  value_model text NOT NULL CHECK (value_model IN ('full', 'uk_step_decline', 'eu_reversal_step')),
  step_month integer,
  notes text NOT NULL DEFAULT ''
);

ALTER TABLE jurisdiction_rules ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON jurisdiction_rules TO anon, authenticated;

DROP POLICY IF EXISTS "jurisdiction_rules_public_read" ON jurisdiction_rules;
CREATE POLICY "jurisdiction_rules_public_read"
ON jurisdiction_rules FOR SELECT
TO anon, authenticated
USING (true); -- Intentionally public reference data: statutory parameters the app displays.

INSERT INTO jurisdiction_rules (jurisdiction, display_name, group_name, law_name, law_short, duration_model, flat_years, min_years, cap_years, value_model, step_month, notes) VALUES
  ('australia', 'Australia', 'Oceania', 'Australian Consumer Law', 'ACL', 'category_estimate', NULL, NULL, NULL, 'full', NULL,
   'Consumer guarantees cover major faults for the estimated "reasonable life" of the product, based on category and price. Full value for the whole period.'),
  ('new-zealand', 'New Zealand', 'Oceania', 'New Zealand Consumer Law', 'NZCL', 'category_estimate', NULL, NULL, NULL, 'full', NULL,
   'Same model as Australia: estimated reasonable life, full value throughout.'),
  ('england', 'England', 'United Kingdom', 'The Consumer Rights Act', 'CRA', 'category_estimate', NULL, NULL, 6, 'uk_step_decline', 6,
   'Estimated reasonable life capped at 6 years. Full value for the first 6 months (burden of proof on the seller), then 25% haircut and a linear decline to zero by the end of the period.'),
  ('wales', 'Wales', 'United Kingdom', 'The Consumer Rights Act', 'CRA', 'category_estimate', NULL, NULL, 6, 'uk_step_decline', 6,
   'Identical to England: cap 6 years, step down 25% at month 6, then decline to zero.'),
  ('scotland', 'Scotland', 'United Kingdom', 'The Sale and Supply of Goods Act', 'SSGA', 'category_estimate', NULL, NULL, 5, 'uk_step_decline', 6,
   'Estimated reasonable life capped at 5 years. Step down 25% at month 6, then decline to zero by the end of the period.'),
  ('france', 'France', 'European Union', 'EU consumer law', 'EU law', 'flat', 2, NULL, NULL, 'eu_reversal_step', 24,
   'EU legal guarantee of 2 years. Reversal period is 24 months: before that the seller must prove the fault existed at delivery, after that the burden flips to the owner, cutting the guarantee''s value by 25% for the remainder. No decline to zero.'),
  ('germany', 'Germany', 'European Union', 'EU consumer law', 'EU law', 'flat', 2, NULL, NULL, 'eu_reversal_step', 24,
   'EU 2-year guarantee, 24-month reversal period (25% value cut after it, no further decline).'),
  ('spain', 'Spain', 'European Union', 'EU consumer law', 'EU law', 'flat', 2, NULL, NULL, 'eu_reversal_step', 24,
   'EU 2-year guarantee, 24-month reversal period (25% value cut after it, no further decline).'),
  ('portugal', 'Portugal', 'European Union', 'EU consumer law', 'EU law', 'flat', 2, NULL, NULL, 'eu_reversal_step', 24,
   'EU 2-year guarantee, 24-month reversal period (25% value cut after it, no further decline).'),
  ('sweden', 'Sweden', 'European Union', 'EU consumer law', 'EU law', 'flat', 3, NULL, NULL, 'eu_reversal_step', 24,
   'Swedish law gives a 3-year guarantee (longer than the EU minimum). 24-month reversal period, then 25% value cut, no further decline.'),
  ('finland', 'Finland', 'European Union', 'EU consumer law', 'EU law', 'category_estimate', NULL, 2, NULL, 'eu_reversal_step', 12,
   'Finnish law values cover like Australia/NZ: estimated reasonable life by category and price, but never below the EU 2-year floor. Standard 12-month reversal, then 25% cut, no further decline.'),
  ('netherlands', 'the Netherlands', 'European Union', 'EU consumer law', 'EU law', 'category_estimate', NULL, 2, NULL, 'eu_reversal_step', 12,
   'Dutch law values cover like Australia/NZ: estimated reasonable life by category and price, floored at the EU 2-year minimum. Standard 12-month reversal, then 25% cut, no further decline.'),
  ('eu-other', 'the EU', 'European Union', 'EU consumer law', 'EU law', 'flat', 2, NULL, NULL, 'eu_reversal_step', 12,
   'EU standard rules: 2-year guarantee, 12-month reversal period, then 25% value cut for the remainder. No decline to zero. Note: the Right to Repair Guarantee Extension (extra warranty earned by a repair) is not modelled.'),
  ('other', 'Somewhere else', 'Other', 'No statutory cover modelled', '—', 'flat', 0, NULL, NULL, 'full', NULL,
   'No statutory consumer rights are modelled for this option; only the manufacturer warranty, credit card perks and the paid warranty apply.')
ON CONFLICT (jurisdiction) DO NOTHING;
