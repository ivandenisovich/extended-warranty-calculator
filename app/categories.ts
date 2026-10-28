import { publicCategoryList } from './warrantyEngine';
import type { CategoryOption, CategoryDefaults } from '../lib/publicTypes';

export interface CategoryInfo extends CategoryOption {
  defaults: CategoryDefaults;
}

export function getCategories(): CategoryInfo[] {
  return publicCategoryList();
}
