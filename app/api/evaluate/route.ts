import { NextRequest } from 'next/server';
import { evaluateWarranty, type EvaluationInput } from '../../warrantyEngine';

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const jurisdiction = body.jurisdiction === 'other' ? 'other' : 'australia';
  const assumptions = (body.assumptions ?? {}) as Record<string, unknown>;
  const hazard = (assumptions.hazard ?? {}) as Record<string, unknown>;

  const input: EvaluationInput = {
    productPrice: num(body.productPrice),
    productCategory: typeof body.productCategory === 'string' ? body.productCategory : 'smartphones',
    mfrYears: num(body.mfrYears),
    extendedWarrantyYears: num(body.extendedWarrantyYears),
    ccExtensionMonths: num(body.ccExtensionMonths),
    ccExcess: num(body.ccExcess),
    ownershipYears: Math.max(1, num(body.ownershipYears, 1)),
    jurisdiction,
    includesAccidental: body.includesAccidental === true,
    frictionCost: Math.max(0, num(body.frictionCost)),
    failureRate: num(assumptions.failureRate),
    accidentalShare: num(assumptions.accidentalShare) / 100,
    repairRatio: num(assumptions.repairRatio) / 100,
    hazard: {
      infantStrength: num(hazard.infantStrength),
      infantDecay: num(hazard.infantDecay),
      background: num(hazard.background),
      wearOutStrength: num(hazard.wearOutStrength),
      accidentalFrontLoad: num(hazard.accidentalFrontLoad),
    },
  };

  return Response.json({ ok: true, evaluation: evaluateWarranty(input) });
}
