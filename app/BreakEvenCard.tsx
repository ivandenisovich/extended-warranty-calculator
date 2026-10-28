'use client';

import { useState } from 'react';
import type { EvaluationResult } from './warrantyEngine';

export interface BreakEvenCardProps {
  evaluation: EvaluationResult;
}

export default function BreakEvenCard({ evaluation }: BreakEvenCardProps) {
  const { breakEven, repairCost, ewTrack } = evaluation;
  const maxBE = Math.max(...breakEven.levels.map((l) => l.breakEvenPremium), 1);

  const [quotedPremium, setQuotedPremium] = useState<number | ''>('');
  const [quotedExcess, setQuotedExcess] = useState<number>(breakEven.levels[0]?.excess ?? 0);

  const quoteNum = typeof quotedPremium === 'number' ? quotedPremium : 0;
  const effectiveRepair = Math.max(0, repairCost - quotedExcess);
  const quoteFairPrice = Math.round(breakEven.netRiskProb * effectiveRepair * 100) / 100;
  const verdict = quoteNum === 0 ? null : quoteNum <= quoteFairPrice ? 'good' : 'bad';
  const margin = Math.abs(Math.round((quoteFairPrice - quoteNum) * 100) / 100);
  const fmt = (v: number) =>
    v.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="bg-[#111622] border border-slate-800/80 rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-1">Break-Even Premium</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          The most you should pay for the extended warranty at each excess level. Above this price, you
          expect to lose money on average. Based on the{' '}
          <strong className="text-slate-200">{ewTrack.netRiskPercentage}%</strong> net risk the warranty
          actually covers (defects after statutory cover ends, plus accidental damage if included) and a{' '}
          <strong className="text-slate-200">${repairCost}</strong> typical repair.
        </p>
      </div>

      <div className="mb-4 p-3.5 rounded-lg bg-[#0a0d14] border border-slate-800/80 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          Fair price at <strong className="text-slate-200">$0 excess</strong>
        </span>
        <span className="text-xl font-bold text-emerald-400">${fmt(breakEven.atZeroExcess)}</span>
      </div>

      <div className="space-y-1.5">
        {breakEven.levels.map((level) => {
          const widthPct = (level.breakEvenPremium / maxBE) * 100;
          return (
            <div key={level.excess} className="flex items-center gap-2">
              <span className="w-16 text-right text-[11px] text-slate-400">
                ${level.excess} excess
              </span>
              <div className="flex-1 bg-[#0a0d14] h-6 rounded border border-slate-800 relative overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 flex items-center justify-end pr-2 transition-all duration-300"
                  style={{ width: `${Math.max(widthPct, 8)}%` }}
                >
                  {widthPct >= 12 && (
                    <span className="text-[11px] font-bold text-slate-950">
                      ${fmt(level.breakEvenPremium)}
                    </span>
                  )}
                </div>
                {widthPct < 12 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-emerald-400">
                    ${fmt(level.breakEvenPremium)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-slate-800/60">
        <h4 className="text-xs font-semibold text-slate-200 mb-2">Check a Real Quote</h4>
        <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
          Enter the premium a retailer is actually charging, and the excess that applies per claim.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className="block text-[11px] text-slate-400 mb-1">Quoted Premium ($)</span>
            <input
              type="number"
              min={0}
              value={quotedPremium}
              onChange={(e) => setQuotedPremium(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] text-slate-400 mb-1">Excess per Claim ($)</span>
            <input
              type="number"
              min={0}
              value={quotedExcess}
              onChange={(e) => setQuotedExcess(Number(e.target.value))}
              className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </label>
        </div>
        {verdict && (
          <div
            className={`rounded-lg p-3.5 border ${
              verdict === 'good'
                ? 'bg-emerald-950/40 border-emerald-700/50'
                : 'bg-red-950/40 border-red-700/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <strong
                className={`text-sm ${verdict === 'good' ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {verdict === 'good' ? 'Good value' : 'Poor value'}
              </strong>
              <span className="text-xs text-slate-300">
                {verdict === 'good' ? `${fmt(margin)} below` : `${fmt(margin)} above`} break-even
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Fair price for this quote is <strong className="text-slate-200">${fmt(quoteFairPrice)}</strong>{' '}
              (with ${quotedExcess} excess, the covered repair is worth ${effectiveRepair} per claim).
              {verdict === 'bad'
                ? ' You expect to lose money on average at this price.'
                : ' You expect to come out ahead on average at this price.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
