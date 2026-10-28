'use client';

import type { EvaluationResult } from '../lib/publicTypes';

export type Verdict = 'worth-it' | 'borderline' | 'skip-it';

export interface VerdictInfo {
  verdict: Verdict;
  headline: string;
  detail: string;
  fairPrice: number;
  quoted: number;
  // Position (0-100) of the fair price and quote on the comparison scale
  fairPct: number;
  quotedPct: number;
}

export function computeVerdict(
  evaluation: EvaluationResult,
  quotedPremium: number,
  quotedExcess: number
): VerdictInfo | null {
  if (!quotedPremium || quotedPremium <= 0) return null;
  const { breakEven, repairCost } = evaluation;
  const effectiveRepair = Math.max(0, repairCost - quotedExcess);
  const fairPrice = Math.round(breakEven.netRiskProb * effectiveRepair * 100) / 100;
  const ratio = quotedPremium / Math.max(fairPrice, 0.01);

  let verdict: Verdict;
  if (ratio <= 1) verdict = 'worth-it';
  else if (ratio <= 1.25) verdict = 'borderline';
  else verdict = 'skip-it';

  const scaleMax = Math.max(quotedPremium, fairPrice, 1) * 1.15;
  const fairPct = Math.min(95, Math.max(3, (fairPrice / scaleMax) * 100));
  const quotedPct = Math.min(95, Math.max(3, (quotedPremium / scaleMax) * 100));

  const fmt = (v: number) =>
    v.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const headline =
    verdict === 'worth-it'
      ? `Worth considering — ${fmt(quotedPremium)} is at or below fair value`
      : verdict === 'borderline'
        ? `Borderline — you'd pay ${fmt(quotedPremium - fairPrice)} over fair value`
        : `Skip it — ${fmt(quotedPremium)} is worth about ${fmt(fairPrice)}`;

  const detail =
    verdict === 'worth-it'
      ? `This warranty covers about ${(breakEven.netRiskProb * 100).toFixed(0)}% of repair risk. At this price you'd roughly break even or come out ahead.`
      : verdict === 'borderline'
        ? `It's close: the fair price is about ${fmt(fairPrice)} with your ${fmt(quotedExcess)} excess. Not terrible, but the retailer has the edge.`
        : `The fair price is about ${fmt(fairPrice)} with a ${fmt(quotedExcess)} excess. You'd expect to lose ${fmt(quotedPremium - fairPrice)} on average.`;

  return { verdict, headline, detail, fairPrice, quoted: quotedPremium, fairPct, quotedPct };
}

export default function VerdictBanner({ info }: { info: VerdictInfo }) {
  const styles = {
    'worth-it': { bg: 'bg-tc-lime', text: 'text-tc-navy', sub: 'text-tc-navy', bar: 'bg-tc-navy', marker: 'bg-tc-navy' },
    borderline: { bg: 'bg-tc-orange-dark', text: 'text-white', sub: 'text-white', bar: 'bg-white/30', marker: 'bg-white' },
    'skip-it': { bg: 'bg-tc-red', text: 'text-white', sub: 'text-white', bar: 'bg-white/30', marker: 'bg-white' },
  }[info.verdict];

  return (
    <div className={`${styles.bg} ${styles.text} rounded-2xl p-5 md:p-6 shadow-lg`}>
      <div className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
        Our verdict
      </div>
      <h2 className="font-display text-xl md:text-2xl font-bold mb-1">{info.headline}</h2>
      <p className={`text-sm ${styles.sub} leading-relaxed mb-4`}>{info.detail}</p>

      {/* Price comparison scale */}
      <div className="relative h-10">
        <div className={`absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 rounded-full ${styles.bar}`} />
        {/* Fair price marker */}
        <div
          className="absolute -translate-x-1/2 transition-all duration-500"
          style={{ left: `${info.fairPct}%` }}
        >
          <div className={`w-4 h-4 rounded-full border-2 ${styles.marker} ${info.verdict === 'worth-it' ? 'border-tc-lime' : 'border-transparent'} mx-auto`} />
          <div className="text-[11px] font-numeric font-semibold text-center mt-0.5 whitespace-nowrap">
            Fair ${info.fairPrice.toFixed(0)}
          </div>
        </div>
        {/* Quoted price marker */}
        <div
          className="absolute -translate-x-1/2 transition-all duration-500"
          style={{ left: `${info.quotedPct}%`, top: '6px' }}
        >
          <div className="w-4 h-4 rounded-sm rotate-45 border-2 border-white bg-transparent mx-auto" />
          <div className="text-[11px] font-numeric font-semibold text-center mt-1 whitespace-nowrap">
            Quoted ${info.quoted.toFixed(0)}
          </div>
        </div>
      </div>
    </div>
  );
}
