import { getCategoryRules } from './jurisdictionRules.server';
import type { CategoryOption, CategoryDefaults } from '../lib/publicTypes';

export interface CategoryInfo extends CategoryOption {
  defaults: CategoryDefaults;
}

export async function getCategories(): Promise<CategoryInfo[]> {
  const rules = await getCategoryRules();
  return rules.map((r) => ({
    key: r.category_key,
    name: r.name,
    defaults: {
      failureRate: r.failure_rate,
      accidentRate: r.accident_rate,
      repairRatio: Math.round(r.repair_ratio * 100),
    },
  }));
}
