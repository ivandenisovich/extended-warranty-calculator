import type { EvaluationResult } from '../../lib/publicTypes';
import { ewExcess, ewPrice, type EwPricingConfig } from '../../lib/ewPricingModel';
import { buildEvaluationBody } from '../evaluationRequest';
import type { FormState } from '../InputFlow';

export const EXTRA_YEARS = [1, 2, 3];

export type Tone = 'worth-it' | 'borderline' | 'skip-it';

export interface GridCell {
  marketPrice: number;
  fairPrice: number;
  tone: Tone;
  gap: number;
}

export interface CoverGrid {
  extraYears: number[];
  rows: { title: string; cells: GridCell[] }[];
}

export function toneFor(marketPrice: number, fairPrice: number): Tone {
  const ratio = marketPrice / Math.max(fairPrice, 0.01);
  return ratio <= 1 ? 'worth-it' : ratio <= 1.25 ? 'borderline' : 'skip-it';
}

async function fetchEvaluation(body: object): Promise<EvaluationResult> {
  const res = await fetch('/api/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as { ok: boolean; evaluation?: EvaluationResult };
  if (!data.ok || !data.evaluation) throw new Error('invalid_response');
  return data.evaluation;
}

export async function summariseCoverGrid(form: FormState, pricing: EwPricingConfig): Promise<CoverGrid> {
  const price = Number(form.productPrice) || 0;
  const mfrYears = Number(form.mfrYears) || 0;
  const accidentalExcess = ewExcess(pricing, price);

  const cell = async (extraYears: number, includesAccidental: boolean): Promise<GridCell> => {
    const evaluation = await fetchEvaluation({
      ...buildEvaluationBody(form),
      extendedWarrantyYears: mfrYears + extraYears,
      includesAccidental,
      quotedExcess: includesAccidental ? accidentalExcess : 0,
    });
    const marketPrice = Math.round(ewPrice(pricing, price, form.productCategory, extraYears, includesAccidental));
    const fairPrice = Math.round(evaluation.breakEven.atQuotedExcess);
    return { marketPrice, fairPrice, tone: toneFor(marketPrice, fairPrice), gap: marketPrice - fairPrice };
  };

  const pairs = await Promise.all(
    EXTRA_YEARS.map((years) => Promise.all([cell(years, false), cell(years, true)]))
  );

  return {
    extraYears: EXTRA_YEARS,
    rows: [
      { title: 'Defects only', cells: pairs.map((pair) => pair[0]) },
      { title: 'Defects + accidental', cells: pairs.map((pair) => pair[1]) },
    ],
  };
}
