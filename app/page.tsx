'use client';

import React, { useState, useMemo } from 'react';
import {
  CATEGORIES,
  ProductCategoryKey,
  evaluateWarranty,
  BreakagePoint,
} from './warrantyEngine';

export default function ExtendedWarrantyCalculator() {
  const [productPrice, setProductPrice] = useState<number>(1200);
  const [productCategory, setProductCategory] = useState<ProductCategoryKey>('MOBILE');
  const [mfrYears, setMfrYears] = useState<number>(1);
  const [extendedWarrantyYears, setExtendedWarrantyYears] = useState<number>(3);
  const [ccExtensionMonths, setCcExtensionMonths] = useState<number>(12);
  const [ccExcess, setCcExcess] = useState<number>(50);
  const [ownershipYears, setOwnershipYears] = useState<number>(5);
  const [jurisdiction, setJurisdiction] = useState<'AU_ACL' | 'OTHER'>('AU_ACL');
  const [includesAccidental, setIncludesAccidental] = useState<boolean>(true);
  const [frictionCost, setFrictionCost] = useState<number>(50);

  const evaluation = useMemo(() => {
    return evaluateWarranty({
      productPrice,
      productCategory,
      mfrYears,
      extendedWarrantyYears,
      ccExtensionMonths,
      ccExcess,
      ownershipYears,
      jurisdiction,
      includesAccidental,
      frictionCost,
    });
  }, [
    productPrice,
    productCategory,
    mfrYears,
    extendedWarrantyYears,
    ccExtensionMonths,
    ccExcess,
    ownershipYears,
    jurisdiction,
    includesAccidental,
    frictionCost,
  ]);

  const renderBreakageChart = (profile: BreakagePoint[]) => {
    if (!profile.length) return null;

    const isEwViable = evaluation.maxPos > 0;

    const annualProfile = profile.map((p) => ({
      ...p,
      annualHazardPct: p.monthlyHazardPct * 12,
    }));

    const maxVal = Math.max(...annualProfile.map((p) => p.annualHazardPct), 1);

    const width = 560;
    const height = 240;
    const padLeft = 45;
    const padRight = 15;
    const padTop = 15;
    const padBottom = 115;

    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    const points = annualProfile
      .map((p, idx) => {
        const x = padLeft + (idx / (annualProfile.length - 1)) * plotWidth;
        const y = height - padBottom - (p.annualHazardPct / maxVal) * plotHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const areaPoints = `${padLeft},${height - padBottom} ${points} ${width - padRight},${height - padBottom}`;

    const yTicks = [
      { val: maxVal, y: padTop, label: `${maxVal.toFixed(1)}%/yr` },
      { val: maxVal / 2, y: padTop + plotHeight / 2, label: `${(maxVal / 2).toFixed(1)}%/yr` },
      { val: 0, y: height - padBottom, label: '0.0%' },
    ];

    const totalM = annualProfile.length;
    const xTicks: { year: number; x: number }[] = [];
    for (let yr = 1; yr <= ownershipYears; yr++) {
      const monthIdx = yr * 12 - 1;
      const x = padLeft + (monthIdx / (totalM - 1)) * plotWidth;
      xTicks.push({ year: yr, x });
    }

    const mfrMonths = Math.round(mfrYears * 12);
    const ewMonths = Math.round(extendedWarrantyYears * 12);
    const ccMonths = Math.round(ccExtensionMonths);
    const statMonths = Math.round(evaluation.statYears * 12);

    const tracks = [
      {
        id: 'mfr',
        label: 'Manufacturer',
        color: '#3b82f6',
        startMonth: 1,
        endMonth: mfrMonths,
      },
      {
        id: 'stat',
        label: 'Statutory (ACL)',
        color: '#0ea5e9',
        startMonth: 1,
        endMonth: jurisdiction === 'AU_ACL' ? statMonths : 0,
      },
      {
        id: 'ew',
        label: 'Extended Warranty',
        color: '#10b981',
        startMonth: mfrMonths + 1,
        endMonth: mfrMonths + ewMonths,
      },
      {
        id: 'cc',
        label: 'Credit Card',
        color: '#a855f7',
        startMonth: mfrMonths + 1,
        endMonth: mfrMonths + ccMonths,
      },
    ];

    const rowHeight = 12;
    const rowGap = 6;
    const startY = height - padBottom + 22;

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2 text-xs">
          <span className="font-semibold text-slate-300">
            Bathtub Hazard Profile & Continuous Coverage Tracks
          </span>
          <span className="text-slate-400">
            5-Yr Risk: <strong className="text-amber-400">{evaluation.failureRatePct}%</strong> ({evaluation.accidentalSharePct}% Accidental)
          </span>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible font-sans text-[9px]">
          <defs>
            <linearGradient id="hazardGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                y1={tick.y}
                x2={width - padRight}
                y2={tick.y}
                stroke="#334155"
                strokeDasharray={i === 2 ? 'none' : '2,2'}
                strokeWidth="1"
              />
              <text x={padLeft - 6} y={tick.y + 3} textAnchor="end" fill="#94a3b8">
                {tick.label}
              </text>
            </g>
          ))}

          {xTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={tick.x}
                y1={height - padBottom}
                x2={tick.x}
                y2={height - padBottom + 4}
                stroke="#64748b"
                strokeWidth="1"
              />
              <text x={tick.x} y={height - padBottom + 14} textAnchor="middle" fill="#94a3b8">
                Yr {tick.year}
              </text>
            </g>
          ))}

          <polygon points={areaPoints} fill="url(#hazardGradient)" />
          <polyline fill="none" stroke="#ef4444" strokeWidth="2" points={points} />

          {tracks.map((track, trackIndex) => {
            if (track.endMonth <= 0 || track.startMonth > totalM) return null;

            const activeStart = Math.max(1, track.startMonth);
            const activeEnd = Math.min(totalM, track.endMonth);

            if (activeStart > activeEnd) return null;

            const yPos = startY + trackIndex * (rowHeight + rowGap);

            const segments: {
              startM: number;
              endM: number;
              isPrimary: boolean;
            }[] = [];

            let segStart = activeStart;
            let segPrimary =
              profile[activeStart - 1]?.activeProtection === track.id &&
              (track.id !== 'ew' || isEwViable);

            for (let m = activeStart + 1; m <= activeEnd; m++) {
              const currentPrimary =
                profile[m - 1]?.activeProtection === track.id &&
                (track.id !== 'ew' || isEwViable);

              if (currentPrimary !== segPrimary) {
                segments.push({
                  startM: segStart,
                  endM: m - 1,
                  isPrimary: segPrimary,
                });
                segStart = m;
                segPrimary = currentPrimary;
              }
            }
            segments.push({
              startM: segStart,
              endM: activeEnd,
              isPrimary: segPrimary,
            });

            return (
              <g key={track.id}>
                <text
                  x={padLeft - 6}
                  y={yPos + rowHeight / 2 + 3}
                  textAnchor="end"
                  fill="#94a3b8"
                  className="text-[8px] font-medium"
                >
                  {track.label}
                </text>

                {segments.map((seg, sIdx) => {
                  const x1 = padLeft + ((seg.startM - 1) / (totalM - 1)) * plotWidth;
                  const x2 = padLeft + ((seg.endM - 1) / (totalM - 1)) * plotWidth;
                  const w = Math.max(2, x2 - x1);

                  const startRisk = seg.startM > 1 ? profile[seg.startM - 2].cumulativeRiskPct : 0;
                  const endRisk = profile[seg.endM - 1]?.cumulativeRiskPct || 0;
                  const periodRiskPct = Math.max(0, endRisk - startRisk);

                  const canFitText = w >= 36;
                  const textColor = seg.isPrimary ? '#0f172a' : '#ffffff';

                  return (
                    <g key={sIdx}>
                      <rect
                        x={x1}
                        y={yPos}
                        width={w}
                        height={rowHeight}
                        fill={seg.isPrimary ? '#ffffff' : track.color}
                        opacity={seg.isPrimary ? 1.0 : 0.45}
                        rx="2"
                      />
                      {canFitText && (
                        <text
                          x={x1 + w / 2}
                          y={yPos + rowHeight / 2 + 2.5}
                          textAnchor="middle"
                          fill={textColor}
                          className="text-[7.5px] font-bold pointer-events-none select-none"
                        >
                          {periodRiskPct.toFixed(1)}% risk
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const getCellBgColorStyle = (netValue: number, maxPos: number, maxNeg: number) => {
    if (netValue === 0) {
      return { backgroundColor: 'rgba(30, 41, 59, 0.8)', color: '#cbd5e1' };
    }

    if (netValue < 0) {
      const ratio = Math.min(1, Math.abs(netValue) / Math.abs(maxNeg || 1));
      return {
        backgroundColor: `rgba(${Math.round(153 + ratio * 102)}, ${Math.round(27 * (1 - ratio))}, ${Math.round(27 * (1 - ratio))}, ${0.25 + ratio * 0.65})`,
        color: ratio > 0.5 ? '#fee2e2' : '#fca5a5',
      };
    }

    const ratio = Math.min(1, netValue / (maxPos || 1));
    return {
      backgroundColor: `rgba(${Math.round(16 * (1 - ratio))}, ${Math.round(120 + ratio * 100)}, ${Math.round(60 + ratio * 40)}, ${0.25 + ratio * 0.65})`,
      color: ratio > 0.5 ? '#d1fae5' : '#a7f3d0',
    };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Consumer Extended Warranty Evaluator
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Quantify extended warranty value accounting for ACL statutory rights, credit card protections, and accidental damage hazards.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
            <h2 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2">
              Input Parameters
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-300">Product Category</label>
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value as ProductCategoryKey)}
                className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                  <option key={key} value={key}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Product Purchase Price ($)</label>
              <input
                type="number"
                value={productPrice}
                onChange={(e) => setProductPrice(Number(e.target.value))}
                className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded text-xs space-y-1 text-slate-400">
              <div className="flex justify-between">
                <span>Est. Repair Cost:</span>
                <strong className="text-slate-200">${Math.round(evaluation.avgRepairCost)}</strong>
              </div>
              <div className="flex justify-between">
                <span>5-Yr Failure Risk:</span>
                <strong className="text-slate-200">{evaluation.failureRatePct}%</strong>
              </div>
              <div className="flex justify-between">
                <span>Accidental Share of Failures:</span>
                <strong className="text-amber-400">{evaluation.accidentalSharePct}%</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">Jurisdiction</label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value as 'AU_ACL' | 'OTHER')}
                className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="AU_ACL">Australia (ACL Statutory Guarantees)</option>
                <option value="OTHER">Other Jurisdiction (No Statutory Guarantees)</option>
              </select>
            </div>

            <div className="border-t border-slate-800 pt-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-200">
                <input
                  type="checkbox"
                  checked={includesAccidental}
                  onChange={(e) => setIncludesAccidental(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                />
                Extended Warranty Includes Accidental Damage
              </label>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Value placed on avoids ACL hassle/delays ($)
                </label>
                <input
                  type="number"
                  value={frictionCost}
                  onChange={(e) => setFrictionCost(Number(e.target.value))}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-3 py-1 text-sm text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300">Mfr Warranty (Yrs)</label>
                <input
                  type="number"
                  value={mfrYears}
                  onChange={(e) => setMfrYears(Number(e.target.value))}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">Ext Warranty (Yrs)</label>
                <input
                  type="number"
                  value={extendedWarrantyYears}
                  onChange={(e) => setExtendedWarrantyYears(Number(e.target.value))}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-sm text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-300">CC Ext (Mo)</label>
                <input
                  type="number"
                  value={ccExtensionMonths}
                  onChange={(e) => setCcExtensionMonths(Number(e.target.value))}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">CC Excess ($)</label>
                <input
                  type="number"
                  value={ccExcess}
                  onChange={(e) => setCcExcess(Number(e.target.value))}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">Ownership (Yrs)</label>
                <input
                  type="number"
                  value={ownershipYears}
                  onChange={(e) => setOwnershipYears(Number(e.target.value))}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            {renderBreakageChart(evaluation.profile)}

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-slate-200">
                  Extended Warranty Net Value Matrix
                </h2>
                <p className="text-xs text-slate-400">
                  Net financial value across combinations of Premium and Excess fees (incorporating accidental damage & friction offsets).
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[10px] text-center border-collapse">
                  <thead>
                    <tr>
                      <th className="p-1.5 bg-slate-950 text-slate-400 border border-slate-800">
                        Premium \ Excess
                      </th>
                      {evaluation.matrix[0]?.map((col, idx) => (
                        <th
                          key={idx}
                          className="p-1.5 bg-slate-950 text-slate-300 border border-slate-800 font-semibold"
                        >
                          ${Math.round(col.excess)}
                          <div className="text-[8px] text-slate-500 font-normal">
                            ({col.excessPct.toFixed(0)}%)
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {evaluation.matrix.map((row, rIdx) => {
                      const firstCol = row[0];
                      return (
                        <tr key={rIdx}>
                          <td className="p-1.5 bg-slate-950 text-slate-300 border border-slate-800 font-semibold text-right pr-2">
                            ${Math.round(firstCol.premium)}
                            <span className="text-[8px] text-slate-500 block font-normal">
                              ({firstCol.premiumPct.toFixed(0)}%)
                            </span>
                          </td>
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              style={getCellBgColorStyle(cell.netValue, evaluation.maxPos, evaluation.maxNeg)}
                              className="p-1.5 border border-slate-800 font-medium transition-colors"
                            >
                              {cell.netValue > 0
                                ? `+$${Math.round(cell.netValue)}`
                                : `-$${Math.abs(Math.round(cell.netValue))}`}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
