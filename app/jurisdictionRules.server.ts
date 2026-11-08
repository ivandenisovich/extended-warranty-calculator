import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { CategoryRule, CalculatorDefaults, Jurisdiction, JurisdictionRule } from '../lib/publicTypes';
import type { UsTierRule } from '../lib/publicTypes';
import { fallbackRule } from '../lib/jurisdictionRules';
import { fallbackCategoryRule } from '../lib/categoryRules';
import { usTierRule, usTierOf } from '../lib/usTierRules';

function client() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

// Reads the category_rules table (inspectable, editable in the database
// dashboard). Falls back to the code copy if the database is unreachable, so
// the calculator never breaks on a database outage.
export async function getCategoryRules(): Promise<CategoryRule[]> {
  try {
    const { data, error } = await client()
      .from('category_rules')
      .select('*')
      .order('category_key', { ascending: true });
    if (error || !data || data.length === 0) throw new Error(error?.message ?? 'empty');
    return data as CategoryRule[];
  } catch {
    return [...CATEGORY_RULES_FALLBACK];
  }
}

export async function getCategoryRule(key: string): Promise<CategoryRule> {
  const rules = await getCategoryRules();
  return rules.find((r) => r.category_key === key) ?? fallbackCategoryRule(key);
}

// Resolves a US state to its consumer-rights tier via the us_states mapping,
// then loads that tier's rule from us_consumer_tiers. Falls back to the code
// copy if the database is unreachable.
export async function getUsTierRule(stateCode: string): Promise<UsTierRule> {
  const code = stateCode.toUpperCase();
  try {
    const { data, error } = await client()
      .from('us_states')
      .select('tier')
      .eq('state_code', code)
      .maybeSingle();
    if (error || !data) throw new Error(error?.message ?? 'not_found');
    const { data: tierData, error: tierError } = await client()
      .from('us_consumer_tiers')
      .select('*')
      .eq('tier', data.tier)
      .maybeSingle();
    if (tierError || !tierData) throw new Error(tierError?.message ?? 'not_found');
    return tierData as UsTierRule;
  } catch {
    return usTierRule(usTierOf(code));
  }
}

// Reads the jurisdiction_rules table (inspectable, editable in the database
// dashboard). Falls back to the code copy if the database is unreachable, so
// the calculator never breaks on a database outage.
export async function getJurisdictionRules(): Promise<JurisdictionRule[]> {
  try {
    const { data, error } = await client()
      .from('jurisdiction_rules')
      .select('*')
      .order('group_name', { ascending: true })
      .order('display_name', { ascending: true });
    if (error || !data || data.length === 0) throw new Error(error?.message ?? 'empty');
    return data as JurisdictionRule[];
  } catch {
    return [...JURISDICTION_RULES_FALLBACK];
  }
}

export async function getJurisdictionRule(j: Jurisdiction): Promise<JurisdictionRule> {
  const rules = await getJurisdictionRules();
  return rules.find((r) => r.jurisdiction === j) ?? fallbackRule(j);
}

// Reads the app_settings table ('defaults' key) for calculator form defaults.
// Falls back to the code copy if the database is unreachable.
export async function getCalculatorDefaults(): Promise<CalculatorDefaults> {
  try {
    const { data, error } = await client()
      .from('app_settings')
      .select('value')
      .eq('key', 'defaults')
      .maybeSingle();
    if (error || !data) throw new Error(error?.message ?? 'not_found');
    return { ...CALCULATOR_DEFAULTS_FALLBACK, ...(data.value as Partial<CalculatorDefaults>) };
  } catch {
    return CALCULATOR_DEFAULTS_FALLBACK;
  }
}

// Imported at the bottom to avoid a circular import at module top.
import {
  CATEGORY_RULES as CATEGORY_RULES_FALLBACK,
} from '../lib/categoryRules';
import {
  JURISDICTION_RULES as JURISDICTION_RULES_FALLBACK,
} from '../lib/jurisdictionRules';
import {
  CALCULATOR_DEFAULTS as CALCULATOR_DEFAULTS_FALLBACK,
} from '../lib/calculatorDefaults';
