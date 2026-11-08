// Client-safe reference data: calculator form defaults, shown before the user
// changes anything. Mirrors the app_settings table ('defaults' key) — keep in
// sync with its migration.
import type { CalculatorDefaults } from './publicTypes';

export const CALCULATOR_DEFAULTS: CalculatorDefaults = {
  productPrice: 1200,
  ownershipYears: 5,
  mfrYears: 1,
  extendedWarrantyYears: 5,
  purchaseProtectionDays: 90,
  frictionCost: 50,
  ccExtensionMonths: 12,
  ccExcess: 50,
  quotedExcess: 0,
};
