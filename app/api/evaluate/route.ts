import { NextRequest } from 'next/server';
import { evaluateWarranty, type EvaluationInput } from '../../warrantyEngine';
import { getJurisdictionRule, getCategoryRule, getUsTierRule } from '../../jurisdictionRules.server';
import type { Jurisdiction } from '../../../lib/publicTypes';

const JURISDICTIONS: Jurisdiction[] = [
  'australia',
  'new-zealand',
  'england',
  'wales',
  'scotland',
  'france',
  'germany',
  'spain',
  'portugal',
  'sweden',
  'finland',
  'netherlands',
  'eu-other',
  'united-states',
];

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

  const jurisdiction = JURISDICTIONS.includes(body.jurisdiction as Jurisdiction)
    ? (body.jurisdiction as Jurisdiction)
    : 'other';
  const assumptions = (body.assumptions ?? {}) as Record<string, unknown>;
  const hazard = (assumptions.hazard ?? {}) as Record<string, unknown>;
  const hasAccidentRate = assumptions.accidentRate !== undefined && assumptions.accidentRate !== null && assumptions.accidentRate !== '';

  const [rule, categoryRule, usTier] = await Promise.all([
    getJurisdictionRule(jurisdiction),
    getCategoryRule(typeof body.productCategory === 'string' ? body.productCategory : 'smartphones'),
    jurisdiction === 'united-states' && typeof body.usState === 'string'
      ? getUsTierRule(body.usState)
      : Promise.resolve(undefined),
  ]);

  const input: EvaluationInput = {
    productPrice: num(body.productPrice),
    productCategory: typeof body.productCategory === 'string' ? body.productCategory : 'smartphones',
    mfrYears: num(body.mfrYears),
    extendedWarrantyYears: num(body.extendedWarrantyYears),
    ccExtensionMonths: num(body.ccExtensionMonths),
    ccExcess: num(body.ccExcess),
    purchaseProtectionDays: Math.min(3650, Math.max(0, num(body.purchaseProtectionDays))),
    quotedExcess: Math.max(0, num(body.quotedExcess)),
    ownershipYears: Math.max(1, num(body.ownershipYears, 1)),
    jurisdiction,
    rule,
    categoryRule,
    usTier,
    includesAccidental: body.includesAccidental === true,
    frictionCost: Math.max(0, num(body.frictionCost)),
    daysOutsideAustralia: Math.min(365, Math.max(0, num(body.daysOutsideAustralia))),
    failureRate: num(assumptions.failureRate),
    accidentRate: hasAccidentRate ? num(assumptions.accidentRate) : undefined,
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
