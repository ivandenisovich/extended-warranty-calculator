/*
# Add haircut_size to jurisdiction_rules; create app_settings for form defaults

1. Schema changes
- `jurisdiction_rules` gains `haircut_size` (numeric 0-1, default 0.25): the fraction
  of value lost at the reversal point (`step_month`) for value models that step down
  (uk_step_decline, eu_reversal_step). The engine previously hardcoded 0.75 as the
  post-step value; it now uses (1 - haircut_size), so editing this column changes the
  step-down amount. Non-stepping models (full) keep it NULL.
- New table `app_settings` — key/value storage for calculator defaults so they are
  inspectable and editable without code changes. Currently one row: 'defaults'
  holding the JSON shown below. More keys can be added later without schema changes.

2. Security
- `app_settings` is public reference data (no auth app): RLS enabled, SELECT granted
  to anon + authenticated with a USING (true) policy. No write grants — edits happen
  via the database dashboard.

3. Data
- jurisdiction_rules.haircut_size = 0.25 for all stepping models (UK + EU); NULL for
  full-value models.
- app_settings 'defaults' row seeds the current hardcoded UI defaults.
*/

ALTER TABLE jurisdiction_rules
  ADD COLUMN IF NOT EXISTS haircut_size numeric
  CHECK (haircut_size >= 0 AND haircut_size <= 1);

UPDATE jurisdiction_rules SET haircut_size = 0.25
WHERE value_model IN ('uk_step_decline', 'eu_reversal_step');

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  notes text NOT NULL DEFAULT ''
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON app_settings TO anon, authenticated;

DROP POLICY IF EXISTS "app_settings_public_read" ON app_settings;
CREATE POLICY "app_settings_public_read"
ON app_settings FOR SELECT
TO anon, authenticated
USING (true); -- Intentionally public reference data: calculator defaults, no secrets.

INSERT INTO app_settings (key, value, notes) VALUES
  ('defaults', '{
    "productPrice": 1200,
    "ownershipYears": 5,
    "mfrYears": 1,
    "extendedWarrantyYears": 5,
    "purchaseProtectionDays": 90,
    "frictionCost": 50,
    "ccExtensionMonths": 12,
    "ccExcess": 50,
    "quotedExcess": 0
  }', 'Calculator form defaults shown before the user changes anything.')
ON CONFLICT (key) DO NOTHING;
