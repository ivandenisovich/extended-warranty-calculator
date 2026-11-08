import type { FormState } from './InputFlow';

const STORAGE_KEY = 'thingycare.calculator';

export interface StoredCalculator {
  form: FormState;
  productName: string | null;
}

export function saveCalculator(data: StoredCalculator) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    return;
  }
}

export function loadCalculator(): StoredCalculator | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCalculator> | null;
    if (!parsed || typeof parsed !== 'object' || !parsed.form) return null;
    return { form: parsed.form, productName: parsed.productName ?? null };
  } catch {
    return null;
  }
}
