/*
# Create US consumer tiers and state mappings (public reference data, no auth)

1. New Tables
- `us_consumer_tiers` — one row per consumer-rights tier (1, 2, 3). States are grouped
  into tiers that will each carry different levels of consumer rights.
  - `tier` (integer, primary key) — tier number (1 = strongest rights).
  - `name` (text) — display name (e.g. 'Tier 1 (strongest rights)').
  - `notes` (text) — description of the rights level for this tier. To be filled in
    when the per-tier consumer-rights rules are defined.
- `us_states` — one row per US state plus the District of Columbia.
  - `state_code` (text, primary key) — two-letter code (e.g. 'MA', 'DC').
  - `state_name` (text) — full name (e.g. 'Massachusetts').
  - `tier` (integer, references us_consumer_tiers) — the state's tier.

2. Security
- Enable RLS on both tables.
- Grant SELECT to `anon` and `authenticated`: intentionally public reference data
  (the app has no sign-in). No write policies — edits happen through the database dashboard.
- SELECT policies `USING (true)` because both tables are intentionally public.

3. Data
- Tier 1 (12): MA, ME, MD, MS, WV, KS, VT, NH, DC, CT, MN, WA.
- Tier 2 (7): CA, NJ, NY, TX, FL, OR, IL.
- Tier 3 (32): all remaining states.
  (12 + 7 + 32 = 51 rows: 50 states + DC.)
*/

CREATE TABLE IF NOT EXISTS us_consumer_tiers (
  tier integer PRIMARY KEY,
  name text NOT NULL,
  notes text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS us_states (
  state_code text PRIMARY KEY,
  state_name text NOT NULL,
  tier integer NOT NULL REFERENCES us_consumer_tiers(tier)
);

ALTER TABLE us_consumer_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE us_states ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON us_consumer_tiers TO anon, authenticated;
GRANT SELECT ON us_states TO anon, authenticated;

DROP POLICY IF EXISTS "us_consumer_tiers_public_read" ON us_consumer_tiers;
CREATE POLICY "us_consumer_tiers_public_read"
ON us_consumer_tiers FOR SELECT
TO anon, authenticated
USING (true); -- Intentionally public reference data: tier definitions the app displays.

DROP POLICY IF EXISTS "us_states_public_read" ON us_states;
CREATE POLICY "us_states_public_read"
ON us_states FOR SELECT
TO anon, authenticated
USING (true); -- Intentionally public reference data: state-to-tier mappings the app displays.

INSERT INTO us_consumer_tiers (tier, name, notes) VALUES
  (1, 'Tier 1 (strongest consumer rights)', 'States with the strongest implied-warranty protection. Per-tier consumer-rights rules to be defined.'),
  (2, 'Tier 2 (moderate consumer rights)', 'States with moderate implied-warranty protection. Per-tier consumer-rights rules to be defined.'),
  (3, 'Tier 3 (baseline consumer rights)', 'States with baseline implied-warranty protection. Per-tier consumer-rights rules to be defined.')
ON CONFLICT (tier) DO NOTHING;

INSERT INTO us_states (state_code, state_name, tier) VALUES
  ('MA', 'Massachusetts', 1),
  ('ME', 'Maine', 1),
  ('MD', 'Maryland', 1),
  ('MS', 'Mississippi', 1),
  ('WV', 'West Virginia', 1),
  ('KS', 'Kansas', 1),
  ('VT', 'Vermont', 1),
  ('NH', 'New Hampshire', 1),
  ('DC', 'District of Columbia', 1),
  ('CT', 'Connecticut', 1),
  ('MN', 'Minnesota', 1),
  ('WA', 'Washington', 1),
  ('CA', 'California', 2),
  ('NJ', 'New Jersey', 2),
  ('NY', 'New York', 2),
  ('TX', 'Texas', 2),
  ('FL', 'Florida', 2),
  ('OR', 'Oregon', 2),
  ('IL', 'Illinois', 2),
  ('AL', 'Alabama', 3),
  ('AK', 'Alaska', 3),
  ('AZ', 'Arizona', 3),
  ('AR', 'Arkansas', 3),
  ('CO', 'Colorado', 3),
  ('DE', 'Delaware', 3),
  ('GA', 'Georgia', 3),
  ('HI', 'Hawaii', 3),
  ('ID', 'Idaho', 3),
  ('IN', 'Indiana', 3),
  ('IA', 'Iowa', 3),
  ('KY', 'Kentucky', 3),
  ('LA', 'Louisiana', 3),
  ('MI', 'Michigan', 3),
  ('MO', 'Missouri', 3),
  ('MT', 'Montana', 3),
  ('NE', 'Nebraska', 3),
  ('NV', 'Nevada', 3),
  ('NM', 'New Mexico', 3),
  ('ND', 'North Dakota', 3),
  ('OH', 'Ohio', 3),
  ('OK', 'Oklahoma', 3),
  ('PA', 'Pennsylvania', 3),
  ('RI', 'Rhode Island', 3),
  ('SC', 'South Carolina', 3),
  ('SD', 'South Dakota', 3),
  ('TN', 'Tennessee', 3),
  ('UT', 'Utah', 3),
  ('VA', 'Virginia', 3),
  ('WI', 'Wisconsin', 3),
  ('WY', 'Wyoming', 3)
ON CONFLICT (state_code) DO NOTHING;
