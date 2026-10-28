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

interface Segment {
  leftPct: number;
  widthPct: number;
  riskPct: number;
  color: string;
  text?: 'dark' | 'light';
  tooltip: string;
}

function TrackBar({
  label,
  segments,
  gridlines,
}: {
  label: string;
  segments: Segment[];
  gridlines: number[];
}) {
  return (
    <div className="grid grid-cols-12 items-center gap-2">
      <span className="col-span-3 md:col-span-2 text-xs font-medium text-tc-navy pr-2 text-right leading-tight">
        {label}
      </span>
      <div className="col-span-9 md:col-span-10 bg-tc-teal-light/60 h-7 rounded-lg relative flex items-center">
        {gridlines.map((g, i) =>
          g > 0 && g < 100 ? (
            <div key={`g${i}`} className="absolute top-0 bottom-0 w-px bg-white/40 pointer-events-none" style={{ left: `${g}%` }} />
          ) : null
        )}
        {segments.map((s, i) =>
          s.widthPct > 0 ? (
            <div
              key={i}
              className={`absolute top-0 bottom-0 flex items-center justify-center text-[11px] font-bold font-numeric transition-all duration-300 ${
                s.text === 'light' ? 'text-white' : 'text-tc-navy'
              } ${s.leftPct <= 0.01 ? 'rounded-l-lg' : ''} ${s.leftPct + s.widthPct >= 99.9 ? 'rounded-r-lg' : ''}`}
              style={{ left: `${s.leftPct}%`, width: `${Math.max(s.widthPct, 1)}%`, backgroundColor: s.color }}
            >
              {s.widthPct > 9 ? (
                <span className="group relative cursor-help">
                  {s.riskPct}%
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-44 rounded-lg bg-tc-navy text-white text-[10px] font-normal font-sans px-2.5 py-1.5 text-center leading-snug shadow-lg z-20">
                    {s.tooltip}
                  </span>
                </span>
              ) : null}
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
  ccExcess,
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
  ccExcess: number;
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

  // Time axis: one tick per year of ownership, centred in each year band.
  const yearTicks = Array.from({ length: ownershipYears }, (_, i) => ({
    pct: ((i + 0.5) / ownershipYears) * 100,
    label: `Yr ${i + 1}`,
  }));
  const gridlines = Array.from({ length: ownershipYears + 1 }, (_, i) => (i / ownershipYears) * 100);

  const mfrTooltip = `${evaluation.mfrTrack.riskPercentage}% of the expected failures happen while the maker's warranty covers you — this risk is covered free.`;
  const aclExtraTooltip = `A further ${+(evaluation.aclTrack.riskPercentage - evaluation.mfrTrack.riskPercentage).toFixed(1)}% of failures happen after the maker's warranty ends but while your legal rights still cover you — also free.`;
  const ewOverlapTooltip = `${evaluation.ewTrack.overlapRiskPercentage}% of failures happen while the paid warranty overlaps your free cover — you'd be protected even without it.`;
  const ewPostTooltip = `${evaluation.ewTrack.postAclRiskPercentage}% of failures happen where only the paid warranty covers you — this is the part that earns its keep.`;
  const ccTooltip =
    ccExtensionMonths > 0
      ? `${evaluation.ccTrack.riskPercentage}% of failures happen in the extra months your credit card adds to the maker's warranty${ccExcess > 0 ? ` (a ${ccExcess} excess applies per claim)` : ' (no excess)'}.`
      : 'No credit card extension — add one in step 2 if your card offers it.';

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
          Each bar shows one layer of protection across your ownership. The percentage on each section is
          the share of expected failures that falls in that period — hover it for an explanation.
        </p>
        <div className="space-y-2.5">
          <TrackBar
            label="Maker's warranty"
            gridlines={gridlines}
            segments={[{ leftPct: 0, widthPct: trackPcts.mfr, riskPct: evaluation.mfrTrack.riskPercentage, color: NAVY, text: 'light', tooltip: mfrTooltip }]}
          />
          {isAustralia && (
            <TrackBar
              label="Your legal rights (ACL)"
              gridlines={gridlines}
              segments={[
                { leftPct: 0, widthPct: trackPcts.mfr, riskPct: evaluation.mfrTrack.riskPercentage, color: TEAL, text: 'light', tooltip: mfrTooltip },
                { leftPct: trackPcts.mfr, widthPct: trackPcts.aclExtra, riskPct: +(evaluation.aclTrack.riskPercentage - evaluation.mfrTrack.riskPercentage).toFixed(1), color: '#5fb0b6', text: 'light', tooltip: aclExtraTooltip },
              ]}
            />
          )}
          <TrackBar
            label="Paid warranty"
            gridlines={gridlines}
            segments={[
              { leftPct: trackPcts.ewStart, widthPct: trackPcts.ewOverlap, riskPct: evaluation.ewTrack.overlapRiskPercentage, color: LIME, text: 'light', tooltip: ewOverlapTooltip },
              { leftPct: trackPcts.ewStart + trackPcts.ewOverlap, widthPct: trackPcts.ewPostAcl, riskPct: evaluation.ewTrack.postAclRiskPercentage, color: '#93d95e', text: 'light', tooltip: ewPostTooltip },
            ]}
          />
          <TrackBar
            label="Credit card"
            gridlines={gridlines}
            segments={[{ leftPct: trackPcts.mfr, widthPct: trackPcts.cc, riskPct: evaluation.ccTrack.riskPercentage, color: ORANGE, text: 'light', tooltip: ccTooltip }]}
          />
        </div>
        {/* Time axis */}
        <div className="grid grid-cols-12 gap-2 mt-1.5">
          <span className="col-span-3 md:col-span-2" />
          <div className="col-span-9 md:col-span-10 relative h-5">
            {yearTicks.map((t) => (
              <span
                key={t.label}
                className="absolute -translate-x-1/2 text-[10px] font-numeric text-tc-muted whitespace-nowrap"
                style={{ left: `${t.pct}%` }}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-12 gap-2">
          <span className="col-span-3 md:col-span-2" />
          <div className="col-span-9 md:col-span-10 text-center text-[10px] text-tc-muted">
            time since purchase
          </div>
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
              <tr>
                <th className="py-1 px-3 text-left align-bottom">
                  <span className="text-[11px] font-semibold text-tc-navy">Warranty price ↓</span>
                </th>
                <th
                  colSpan={evaluation.matrix.excesses.length}
                  className="py-1 px-2 text-center font-semibold text-tc-navy"
                >
                  <span className="text-[11px]">Excess per claim ($)</span>
                </th>
              </tr>
              <tr className="border-b border-tc-border text-tc-muted">
                <th className="py-2 px-3" />
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
