'use client';

import type { Verdict } from './VerdictBanner';

export interface PlanInfo {
  key: string;
  title: string;
  tagline: string;
  marketPrice: number;
  fairPrice: number;
  excess?: number;
  accent: 'navy' | 'teal';
}

function planVerdict(marketPrice: number, fairPrice: number): Verdict {
  const ratio = marketPrice / Math.max(fairPrice, 0.01);
  if (ratio <= 1) return 'worth-it';
  if (ratio <= 1.25) return 'borderline';
  return 'skip-it';
}

const ACCENTS = {
  navy: {
    border: 'border-tc-border',
    chip: 'bg-tc-navy text-white',
    bar: 'bg-tc-navy',
  },
  teal: {
    border: 'border-tc-teal/40 bg-tc-teal-light/40',
    chip: 'bg-tc-teal text-white',
    bar: 'bg-tc-teal',
  },
};

export default function PlanCard({ plan }: { plan: PlanInfo }) {
  const verdict = planVerdict(plan.marketPrice, plan.fairPrice);
  const accent = ACCENTS[plan.accent];
  const badge =
    verdict === 'worth-it'
      ? { icon: '✓', text: 'Good deal', cls: 'bg-tc-lime text-tc-navy' }
      : verdict === 'borderline'
        ? { icon: '~', text: 'Borderline', cls: 'bg-tc-orange text-white' }
        : { icon: '✕', text: 'Overpriced', cls: 'bg-tc-red text-white' };
  const overBy = plan.marketPrice - plan.fairPrice;
  const scaleMax = Math.max(plan.marketPrice, plan.fairPrice, 1) * 1.15;
  const fairPct = Math.min(95, Math.max(3, (plan.fairPrice / scaleMax) * 100));
  const marketPct = Math.min(95, Math.max(3, (plan.marketPrice / scaleMax) * 100));

  return (
    <div className={`rounded-2xl border p-3.5 bg-white shadow-sm ${accent.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${accent.chip}`}>
          {plan.title}
        </span>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${badge.cls}`}>
          {badge.icon} {badge.text}
        </span>
      </div>
      <p className="text-xs text-tc-muted mb-3">{plan.tagline}</p>
      <div className="relative h-9 mb-1">
        <div className={`absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full ${accent.bar} opacity-30`} />
        <div className="absolute -translate-x-1/2" style={{ left: `${fairPct}%` }}>
          <div className="w-3 h-3 rounded-full bg-tc-lime border-2 border-white mx-auto" />
          <div className="text-[10px] font-numeric font-semibold text-center mt-0.5 whitespace-nowrap">
            Fair ${plan.fairPrice}
          </div>
        </div>
        <div className="absolute -translate-x-1/2" style={{ left: `${marketPct}%`, top: '0px' }}>
          <div className="w-3 h-3 rounded-sm rotate-45 bg-tc-navy mx-auto" />
          <div className="text-[10px] font-numeric font-semibold text-center mt-0.5 whitespace-nowrap">
            Offer ${plan.marketPrice}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] mt-2">
        <span className="text-tc-muted">
          {overBy > 0 ? `About $${Math.round(overBy)} more than it is worth` : 'At or below what it is worth'}
        </span>
        {plan.excess !== undefined && (
          <span className="font-numeric text-tc-muted">${plan.excess} excess</span>
        )}
      </div>
    </div>
  );
}
