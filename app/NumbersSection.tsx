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
  accPct?: number;
  color: string;
  text?: 'dark' | 'light';
  tooltip: string;
}

// Diagonal white stripes over the segment colour mark the accidental-damage
// slice of a bar (defects/failures are the solid part).
const ACC_STRIPES = 'repeating-linear-gradient(45deg, transparent 0 3px, rgba(255,255,255,0.55) 3px 6px)';

// Green/red with opacity scaled to how good the combination is: full green at
// the best net value, full red at the worst, transparent at $0 break-even.
const LIME_RGB = '118, 196, 34';
const RED_RGB = '219, 36, 87';
const NAVY_RGB = [24, 44, 73];

function srgbLuminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(l1: number, l2: number): number {
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function matrixColor(netValue: number, best: number, worst: number): { bg: string; light: boolean } {
  const span = best - worst;
  const rgb = netValue >= 0 ? LIME_RGB : RED_RGB;
  let alpha: number;
  if (span <= 0) {
    alpha = 1;
  } else if (netValue >= 0) {
    alpha = 0.25 + 0.75 * (netValue / best); // $0 → 25% green, best → full green
  } else {
    alpha = 0.25 + 0.75 * (netValue / worst); // $0 → 25% red, worst → full red
  }
  alpha = Math.min(1, Math.max(0.25, alpha));
  const [r, g, b] = rgb.split(', ').map(Number);
  // Colour as rendered: the cell blends over the white card behind it.
  const blended = [r, g, b].map((c) => c * alpha + 255 * (1 - alpha));
  const bgLum = srgbLuminance(blended[0], blended[1], blended[2]);
  const navyContrast = contrastRatio(bgLum, srgbLuminance(NAVY_RGB[0], NAVY_RGB[1], NAVY_RGB[2]));
  const whiteContrast = contrastRatio(bgLum, 1);
  return { bg: `rgba(${rgb}, ${alpha.toFixed(3)})`, light: whiteContrast > navyContrast };
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
              {s.accPct && s.accPct > 0 && s.riskPct > 0 ? (
                <div
                  className="absolute top-0 bottom-0 right-0 rounded-r-lg pointer-events-none"
                  style={{ width: `${(s.accPct / s.riskPct) * 100}%`, backgroundImage: ACC_STRIPES }}
                />
              ) : null}
              {s.widthPct > 9 ? (
                <span className="group relative cursor-help">
                  {s.riskPct}%
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-44 rounded-lg bg-tc-navy text-white text-[11px] font-normal font-sans px-2.5 py-1.5 text-center leading-snug shadow-lg z-20">
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
  includesAccidental,
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
  includesAccidental: boolean;
  assumptions: Assumptions;
  onAssumptionsChange: (a: Assumptions) => void;
  categoryKey: string;
  expertOpen: boolean;
  onToggleExpert: () => void;
}) {
  const isAustralia = evaluation.estimatedAclYears > 0;
  const flatNet = evaluation.matrix.grid.flat();
  const bestNet = Math.max(...flatNet.map((c) => c.netValue), 0);
  const worstNet = Math.min(...flatNet.map((c) => c.netValue), 0);
  const totalMonths = Math.max(1, ownershipYears * 12);
  const pct = (months: number) => Math.min(100, (months / totalMonths) * 100);

  const mfrWidthPct = pct(mfrYears * 12);
  const { overlapMonths, postAclMonths } = evaluation.ewTrack;
  const uncoveredStartPct = pct(Math.max(0, evaluation.uncovered.startMonth - 1));
  const trackPcts = {
    mfr: mfrWidthPct,
    aclExtra: pct(evaluation.estimatedAclYears * 12) - mfrWidthPct,
    ewOverlap: pct(overlapMonths),
    ewPostAcl: pct(postAclMonths),
    cc: pct(ccExtensionMonths),
    uncovered: Math.max(0, 100 - uncoveredStartPct),
  };

  // Time axis: one tick per year of ownership, centred in each year band.
  const yearTicks = Array.from({ length: ownershipYears }, (_, i) => ({
    pct: ((i + 0.5) / ownershipYears) * 100,
    label: `Yr ${i + 1}`,
  }));
  const gridlines = Array.from({ length: ownershipYears + 1 }, (_, i) => (i / ownershipYears) * 100);

  const mfrTooltip = `${evaluation.mfrTrack.riskPercentage}% of the expected failures (all defects — the maker's warranty never covers accidents) happen while the maker's warranty covers you. This risk is covered free.`;
  const aclExtraTooltip = `A further ${+(evaluation.aclTrack.riskPercentage - evaluation.mfrTrack.riskPercentage).toFixed(1)}% of failures (all defects — your legal rights don't cover accidents) happen after the maker's warranty ends but while your legal rights still cover you. Also free.`;
  const ewDefectOverlapTooltip =`${evaluation.ewTrack.overlapDefectRiskPercentage}% of failures are defects that happen while the paid warranty overlaps your free cover (maker's warranty or your legal rights). You'd be protected even without it.`;
  const ewDefectPostTooltip = `${evaluation.ewTrack.postAclDefectRiskPercentage}% of failures are defects in the stretch where only the paid warranty covers you. This is the part that earns its keep.`;
  const ewAccOverlapTooltip = `${evaluation.ewTrack.overlapAccidentalRiskPercentage}% of failures are accidental damage (drops, spills) while the paid warranty overlaps your free cover. You'd be protected even without it.`;
  const ewAccPostTooltip = `${evaluation.ewTrack.postAclAccidentalRiskPercentage}% of failures are accidental damage in the stretch where only the paid warranty covers you.`;
  const ccTooltip =
    ccExtensionMonths > 0
      ? `${evaluation.ccTrack.riskPercentage}% of failures (all defects) happen in the extra months your credit card adds to the maker's warranty${ccExcess > 0 ? ` (a ${ccExcess} excess applies per claim)` : ' (no excess)'}.`
      : 'No credit card extension — add one in step 2 if your card offers it.';
  const uncoveredTooltip =
    evaluation.uncovered.riskPercentage > 0
      ? `${evaluation.uncovered.riskPercentage}% of failures happen after every layer of cover has ended: ${evaluation.uncovered.defectRiskPercentage}% defects + ${evaluation.uncovered.accidentalRiskPercentage}% accidental — nobody pays for these, you do.`
      : 'Some form of cover runs for your whole ownership period, so nothing falls outside it.';

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
          <span className={`text-tc-teal-dark transition-transform duration-200 ${expertOpen ? 'rotate-180' : ''}`}>▼</span>
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
          Of the <strong className="text-tc-navy">{evaluation.totalFailureRatePct}%</strong> chance it
          breaks in {ownershipYears} {ownershipYears === 1 ? 'year' : 'years'} — the same figure shown in
          the blue summary box — each bar shows which layer of cover picks up which slice. The percentage
          on each section is that slice's share of expected failures; hover it for an explanation.
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
            label="Paid warranty — defects"
            gridlines={gridlines}
            segments={[
              { leftPct: 0, widthPct: trackPcts.ewOverlap, riskPct: evaluation.ewTrack.overlapDefectRiskPercentage, color: LIME, text: 'light', tooltip: ewDefectOverlapTooltip },
              { leftPct: trackPcts.ewOverlap, widthPct: trackPcts.ewPostAcl, riskPct: evaluation.ewTrack.postAclDefectRiskPercentage, color: '#93d95e', text: 'light', tooltip: ewDefectPostTooltip },
            ]}
          />
          {includesAccidental && (
            <TrackBar
              label="Paid warranty — accidental damage"
              gridlines={gridlines}
              segments={[
                { leftPct: 0, widthPct: trackPcts.ewOverlap, riskPct: evaluation.ewTrack.overlapAccidentalRiskPercentage, color: LIME, text: 'light', tooltip: ewAccOverlapTooltip },
                { leftPct: trackPcts.ewOverlap, widthPct: trackPcts.ewPostAcl, riskPct: evaluation.ewTrack.postAclAccidentalRiskPercentage, color: '#93d95e', text: 'light', tooltip: ewAccPostTooltip },
              ]}
            />
          )}
          <TrackBar
            label="Credit card"
            gridlines={gridlines}
            segments={[{ leftPct: trackPcts.mfr, widthPct: trackPcts.cc, riskPct: evaluation.ccTrack.riskPercentage, color: ORANGE, text: 'light', tooltip: ccTooltip }]}
          />
          {evaluation.uncovered.riskPercentage > 0 && (
            <TrackBar
              label="Not covered"
              gridlines={gridlines}
              segments={[{ leftPct: uncoveredStartPct, widthPct: trackPcts.uncovered, riskPct: evaluation.uncovered.riskPercentage, accPct: evaluation.uncovered.accidentalRiskPercentage, color: '#b7bdc9', text: 'dark', tooltip: uncoveredTooltip }]}
            />
          )}
        </div>
        {/* Time axis */}
        <div className="grid grid-cols-12 gap-2 mt-1.5">
          <span className="col-span-3 md:col-span-2" />
          <div className="col-span-9 md:col-span-10 relative h-5">
            {yearTicks.map((t) => (
              <span
                key={t.label}
                className="absolute -translate-x-1/2 text-[11px] font-numeric text-tc-muted whitespace-nowrap"
                style={{ left: `${t.pct}%` }}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-12 gap-2">
          <span className="col-span-3 md:col-span-2" />
          <div className="col-span-9 md:col-span-10 text-center text-[11px] text-tc-muted">
            time since purchase
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-tc-muted">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundImage: ACC_STRIPES, backgroundColor: NAVY }} /> Striped = accidental damage</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: NAVY }} /> Maker's warranty</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: TEAL }} /> Your legal rights</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: LIME }} /> Paid warranty (from purchase, also covered free)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: '#93d95e' }} /> Paid warranty (only this covers you)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: ORANGE }} /> Credit card extension</span>
          {evaluation.uncovered.riskPercentage > 0 && (
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: '#b7bdc9' }} /> Not covered by anything — you carry this risk</span>
          )}
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
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold font-numeric text-tc-teal-dark">
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
          Deeper green means the warranty pays its way at that price and excess; deeper red means
          you'd expect to lose more money. Pale cells are close to break-even ($0). Values shown are
          your average gain or loss in dollars.
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
                  {row.map((cell, cIdx) => {
                    const { bg, light } = matrixColor(cell.netValue, bestNet, worstNet);
                    return (
                      <td key={cIdx} className="p-1">
                        <div
                          className={`py-1.5 px-2 rounded-md font-bold font-numeric transition-colors ${light ? 'text-white' : 'text-tc-navy'}`}
                          style={{ backgroundColor: bg }}
                        >
                          {cell.netValue >= 0 ? `+${cell.netValue}` : `-${Math.abs(cell.netValue)}`}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
