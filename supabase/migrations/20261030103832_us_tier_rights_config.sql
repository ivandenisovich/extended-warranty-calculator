/*
# Add consumer-rights configuration to us_consumer_tiers; move six states to Tier 3

1. Schema changes
- `us_consumer_tiers` gains the parameters the warranty engine needs to model each
  tier's implied-warranty rights:
  - `duration_model` (text): 'none' = no implied warranty at all;
    'flat' = fixed flat_years for every product;
    'category_estimate' = the per-category expected-life estimate from
    category_rules (the same table Australia uses), bounded by cap_years.
  - `flat_years` (numeric, nullable): length of the implied warranty for 'flat'.
  - `cap_years` (numeric, nullable): maximum implied-warranty years for
    'category_estimate' (null = uncapped).
  - `value_factor` (numeric 0-1): multiplier on the value of claims under the
    implied warranty. Below 1.0 models a weakened right — e.g. 0.75 when the
    burden of proof sits with the customer, devaluing claims by 25%.

2. Data changes
- Tier 1: category-estimate duration capped at 4 years, claims worth 75%
  (burden of proof on the customer).
- Tier 2: flat 1-year implied warranty for all items regardless of any
  manufacturer warranty; full claim value.
- Tier 3: no implied warranty (zero years), full value (moot at zero duration).
- us_states: NJ, NY, TX, FL, OR, IL move from Tier 2 to Tier 3. California is
  now the only Tier 2 state.
*/

ALTER TABLE us_consumer_tiers
  ADD COLUMN IF NOT EXISTS duration_model text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS flat_years numeric,
  ADD COLUMN IF NOT EXISTS cap_years numeric,
  ADD COLUMN IF NOT EXISTS value_factor numeric NOT NULL DEFAULT 1.0
    CHECK (value_factor >= 0 AND value_factor <= 1);

UPDATE us_consumer_tiers SET
  duration_model = 'category_estimate',
  flat_years = NULL,
  cap_years = 4,
  value_factor = 0.75,
  notes = 'Implied warranty follows the standard expected-life estimate per product category (same table as Australia), capped at 4 years. Claims are worth 75% of face value because the burden of proof sits with the customer.'
WHERE tier = 1;

UPDATE us_consumer_tiers SET
  duration_model = 'flat',
  flat_years = 1,
  cap_years = NULL,
  value_factor = 1.0,
  notes = 'Flat 1-year implied warranty on all items sold, regardless of whether a manufacturer warranty is offered. Claims at full value.'
WHERE tier = 2;

UPDATE us_consumer_tiers SET
  duration_model = 'none',
  flat_years = 0,
  cap_years = NULL,
  value_factor = 1.0,
  notes = 'No implied warranty period. No statutory defect cover beyond the manufacturer warranty.'
WHERE tier = 3;

UPDATE us_states SET tier = 3
WHERE state_code IN ('NJ', 'NY', 'TX', 'FL', 'OR', 'IL');
