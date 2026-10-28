'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { EvaluationResult } from './warrantyEngine';
import AssumptionsPanel, { type Assumptions } from './AssumptionsPanel';

// ThingyCare palette for chart series
const TEAL = '#36949b';
const LIME = '#76c422';
const ORANGE = '#e35125';
const RED = '#db2457';
const NAVY = '#182c49';

function TrackBar({
  label,
  segments,
}: {
  label: string;
  segments: { leftPct: number; widthPct: number; riskPct: number; color: string; text?: 'dark' | 'light' }[];
}) {
  return (
    <div className="grid grid-cols-12 items-center gap-2">
      <span className="col-span-3 md:col-span-2 text-xs font-medium text-tc-navy pr-2 text-right leading-tight">
        {label}
      </span>
      <div className="col-span-9 md:col-span-10 bg-tc-teal-light/60 h-7 rounded-lg relative overflow-hidden flex items-center">
        {segments.map((s, i) =>
          s.widthPct > 0 ? (
            <div
              key={i}
              className={`absolute top-0 bottom-0 flex items-center justify-center text-[11px] font-bold font-numeric transition-all duration-300 ${
                s.text === 'light' ? 'text-white' : 'text-tc-navy'
              }`}
              style={{ left: `${s.leftPct}%`, width: `${Math.max(s.widthPct, 1)}%`, backgroundColor: s.color }}
            >
              {s.widthPct > 9 ? `${s.riskPct}%` : ''}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

export default function NumbersSection({
  evaluation,
  ownershipYears,
  mfrYears,
  ccExtensionMonths,
  assumptions,
  onAssumptionsChange,
  categoryKey,
  expertOpen,
  onToggleExpert,
}: {
  evaluation: EvaluationResult;
  ownershipYears: number;
  mfrYears: number;
  ccExtensionMonths: number;
  assumptions: Assumptions;
  onAssumptionsChange: (a: Assumptions) => void;
  categoryKey: string;
  expertOpen: boolean;
  onToggleExpert: () => void;
}) {
  const isAustralia = evaluation.estimatedAclYears > 0;
  const totalMonths = Math.max(1, ownershipYears * 12);
  const pct = (months: number) => Math.min(100, (months / totalMonths) * 100);

  const mfrWidthPct = pct(mfrYears * 12);
  const ewStartPct = pct(mfrYears * 12);
  const { overlapMonths, postAclMonths } = evaluation.ewTrack;
  const trackPcts = {
    mfr: mfrWidthPct,
    aclExtra: pct(evaluation.estimatedAclYears * 12) - mfrWidthPct,
    ewStart: ewStartPct,
    ewOverlap: pct(overlapMonths),
    ewPostAcl: pct(postAclMonths),
    cc: pct(ccExtensionMonths),
  };

  return (
    <div className="space-y-5">
      {/* Expert assumptions */}
      <section className="bg-tc-surface border border-tc-border rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={onToggleExpert}
          className="w-full flex items-center justify-between px-5 md:px-6 py-4 hover:bg-tc-teal-light/40 transition-colors"
        >
          <div className="text-left">
            <h3 className="font-display text-base font-bold text-tc-navy">Expert settings</h3>
            <p className="text-xs text-tc-muted mt-0.5">Fine-tune the failure assumptions behind every result.</p>
          </div>
          <span className={`text-tc-teal transition-transform duration-200 ${expertOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {expertOpen && (
          <div className="px-5 md:px-6 pb-6 border-t border-tc-border pt-4">
            <AssumptionsPanel
              categoryKey={categoryKey}
              assumptions={assumptions}
              onChange={onAssumptionsChange}
            />
          </div>
        )}
      </section>

      {/* Failure-risk timeline */}
      <section className="bg-tc-surface border border-tc-border rounded-2xl p-5 md:p-6 shadow-sm">
        <h3 className="font-display text-base font-bold text-tc-navy mb-1">
          When failures happen
        </h3>
        <p className="text-xs text-tc-muted mb-4 leading-relaxed">
          Estimated share of things failing in each year of ownership — early defects cluster up front,
          wear-out failures pile up near the end.
        </p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evaluation.annualTimeline} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ORANGE} stopOpacity={0.7} />
                  <stop offset="95%" stopColor={ORANGE} stopOpacity={0.25} />
                </linearGradient>
                <linearGradient id="defGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={TEAL} stopOpacity={0.7} />
                  <stop offset="95%" stopColor={TEAL} stopOpacity={0.25} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f0" vertical={false} />
              <XAxis dataKey="label" stroke="#5b6b82" fontSize={11} tickLine={false} />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e9f0',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                  color: NAVY,
                }}
                formatter={(val: unknown) => [`${val}%`, '']}
              />
              <Legend verticalAlign="top" height={28} iconType="circle" />
              <Area
                type="monotone"
                dataKey="accidentalRatePct"
                name="Accidents (drops, spills)"
                stackId="1"
                stroke={ORANGE}
                fill="url(#accGrad)"
                strokeWidth={1.5}
              />
              <Area
                type="monotone"
                dataKey="defectRatePct"
                name="Defects & failures"
                stackId="1"
                stroke={TEAL}
                fill="url(#defGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Coverage timeline tracks */}
      <section className="bg-tc-surface border border-tc-border rounded-2xl p-5 md:p-6 shadow-sm">
        <h3 className="font-display text-base font-bold text-tc-navy mb-1">Who covers what, when</h3>
        <p className="text-xs text-tc-muted mb-4 leading-relaxed">
          Each bar shows one layer of protection across your ownership. Wider coloured sections mean more
          of your failure risk falls in that period.
        </p>
        <div className="space-y-2.5">
          <TrackBar
            label="Maker's warranty"
            segments={[{ leftPct: 0, widthPct: trackPcts.mfr, riskPct: evaluation.mfrTrack.riskPercentage, color: NAVY, text: 'light' }]}
          />
          {isAustralia && (
            <TrackBar
              label="Your legal rights (ACL)"
              segments={[
                { leftPct: 0, widthPct: trackPcts.mfr, riskPct: evaluation.mfrTrack.riskPercentage, color: TEAL, text: 'light' },
                { leftPct: trackPcts.mfr, widthPct: trackPcts.aclExtra, riskPct: +(evaluation.aclTrack.riskPercentage - evaluation.mfrTrack.riskPercentage).toFixed(1), color: '#5fb0b6', text: 'light' },
              ]}
            />
          )}
          <TrackBar
            label="Paid warranty"
            segments={[
              { leftPct: trackPcts.ewStart, widthPct: trackPcts.ewOverlap, riskPct: evaluation.ewTrack.overlapRiskPercentage, color: LIME, text: 'light' },
              { leftPct: trackPcts.ewStart + trackPcts.ewOverlap, widthPct: trackPcts.ewPostAcl, riskPct: evaluation.ewTrack.postAclRiskPercentage, color: '#93d95e', text: 'light' },
            ]}
          />
          <TrackBar
            label="Credit card"
            segments={[{ leftPct: trackPcts.mfr, widthPct: trackPcts.cc, riskPct: evaluation.ccTrack.riskPercentage, color: ORANGE, text: 'light' }]}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-tc-muted">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: NAVY }} /> Maker's warranty</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: TEAL }} /> Your legal rights</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: LIME }} /> Paid warranty (still also covered by law)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: '#93d95e' }} /> Paid warranty (only this covers you)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: ORANGE }} /> Credit card extension</span>
        </div>
      </section>

      {/* Break-even detail */}
      <section className="bg-tc-surface border border-tc-border rounded-2xl p-5 md:p-6 shadow-sm">
        <h3 className="font-display text-base font-bold text-tc-navy mb-1">Break-even prices by excess</h3>
        <p className="text-xs text-tc-muted mb-4 leading-relaxed">
          The most the warranty could cost at each excess level before you'd expect to lose money on
          average.
        </p>
        <div className="space-y-2">
          {evaluation.breakEven.levels.map((level) => {
            const maxBE = Math.max(...evaluation.breakEven.levels.map((l) => l.breakEvenPremium), 1);
            const widthPct = (level.breakEvenPremium / maxBE) * 100;
            return (
              <div key={level.excess} className="flex items-center gap-3">
                <span className="w-24 text-right text-xs text-tc-muted font-numeric">
                  ${level.excess} excess
                </span>
                <div className="flex-1 bg-tc-teal-light/60 h-7 rounded-lg relative overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-tc-teal flex items-center justify-end pr-2 transition-all duration-300"
                    style={{ width: `${Math.max(widthPct, 6)}%` }}
                  >
                    {widthPct >= 14 ? (
                      <span className="text-[11px] font-bold font-numeric text-white">
                        ${level.breakEvenPremium.toFixed(2)}
                      </span>
                    ) : null}
                  </div>
                  {widthPct < 14 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold font-numeric text-tc-teal">
                      ${level.breakEvenPremium.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Matrix */}
      <section className="bg-tc-surface border border-tc-border rounded-2xl p-5 md:p-6 shadow-sm">
        <h3 className="font-display text-base font-bold text-tc-navy mb-1">Every price &amp; excess combination</h3>
        <p className="text-xs text-tc-muted mb-4 leading-relaxed">
          Green means the warranty pays its way at that price and excess. Red means you'd expect to
          lose money. Values shown are your average gain or loss in dollars.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr className="border-b border-tc-border text-tc-muted">
                <th className="py-2 px-3 text-left font-semibold">Price \ Excess</th>
                {evaluation.matrix.excesses.map((exc) => (
                  <th key={exc} className="py-2 px-2 font-numeric font-semibold">${exc}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-tc-border/60">
              {evaluation.matrix.grid.map((row, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 px-3 text-left font-semibold font-numeric text-tc-navy">
                    ${evaluation.matrix.premiums[idx]}
                  </td>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-1">
                      <div
                        className={`py-1.5 px-2 rounded-md font-bold font-numeric transition-colors ${
                          cell.status === 'positive'
                            ? 'bg-tc-lime text-tc-navy'
                            : cell.status === 'neutral'
                              ? 'bg-tc-orange text-white'
                              : 'bg-tc-red text-white'
                        }`}
                      >
                        {cell.netValue >= 0 ? `+${cell.netValue}` : `-${Math.abs(cell.netValue)}`}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
