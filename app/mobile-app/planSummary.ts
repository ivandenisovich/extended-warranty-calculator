import type { EvaluationResult } from '../../lib/publicTypes';
import type { EwPricingConfig } from '../../lib/ewPricingModel';
import { ewExcess, ewPrice } from '../../lib/ewPricingModel';
import { buildEvaluationBody } from '../evaluationRequest';
import type { FormState } from '../InputFlow';
import type { PlanInfo } from '../PlanCard';
import type { MatrixCell } from '../PlanMatrix';

const MATRIX_YEARS = [3, 4, 5];

export interface PlanSummary {
  matrixYears: number[];
  matrixRows: { title: string; cells: MatrixCell[] }[];
  plans: PlanInfo[];
  accidentalExcess: number;
  repairCost: number;
}

interface PricedCell extends MatrixCell {
  repairCost: number;
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

export async function summarisePlans(form: FormState, pricing: EwPricingConfig): Promise<PlanSummary> {
  const price = Number(form.productPrice) || 0;
  const mfrYears = Number(form.mfrYears) || 0;
  const offerYears = Number(form.extendedWarrantyYears) || 0;
  const accidentalExcess = ewExcess(pricing, price);

  const priceCell = async (years: number, includesAccidental: boolean): Promise<PricedCell> => {
    const evaluation = await fetchEvaluation({
      ...buildEvaluationBody(form),
      extendedWarrantyYears: years,
      ownershipYears: years,
      includesAccidental,
      quotedExcess: includesAccidental ? accidentalExcess : 0,
    });
    return {
      marketPrice: Math.round(
        ewPrice(pricing, price, form.productCategory, Math.max(0, years - mfrYears), includesAccidental)
      ),
      fairPrice: Math.round(evaluation.breakEven.atQuotedExcess),
      repairCost: evaluation.repairCost,
    };
  };

  const [matrixPairs, offerDefects, offerAccidental] = await Promise.all([
    Promise.all(MATRIX_YEARS.map((y) => Promise.all([priceCell(y, false), priceCell(y, true)]))),
    priceCell(offerYears, false),
    priceCell(offerYears, true),
  ]);

  const plans: PlanInfo[] = [
    {
      key: 'defect-only',
      title: 'Defects only',
      tagline: 'Covers the product when it breaks on its own',
      marketPrice: offerDefects.marketPrice,
      fairPrice: offerDefects.fairPrice,
      accent: 'navy',
    },
    {
      key: 'with-accidental',
      title: 'Defects + accidental',
      tagline: 'Also covers drops, spills and cracks',
      marketPrice: offerAccidental.marketPrice,
      fairPrice: offerAccidental.fairPrice,
      excess: accidentalExcess,
      accent: 'teal',
    },
  ];

  return {
    matrixYears: MATRIX_YEARS,
    matrixRows: [
      { title: 'Defects only', cells: matrixPairs.map((pair) => pair[0]) },
      { title: 'Defects + accidental', cells: matrixPairs.map((pair) => pair[1]) },
    ],
    plans,
    accidentalExcess,
    repairCost: matrixPairs[0][1].repairCost,
  };
}
