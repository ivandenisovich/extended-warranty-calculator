// app/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
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
import { evaluateWarranty, CATEGORIES } from './warrantyEngine';

export default function Home() {
  const [productCategory, setProductCategory] = useState('smartphones');
  const [productPrice, setProductPrice] = useState(1200);
  const [ownershipYears, setOwnershipYears] = useState(5);
  const [mfrYears, setMfrYears] = useState(1);
  const [extendedWarrantyYears, setExtendedWarrantyYears] = useState(5);
  const [jurisdiction, setJurisdiction] = useState<'australia' | 'other'>('australia');
  const [includesAccidental, setIncludesAccidental] = useState(true);
  const [frictionCost, setFrictionCost] = useState(50);
  const [ccExtensionMonths, setCcExtensionMonths] = useState(12);
  const [ccExcess, setCcExcess] = useState(50);

  const evaluation = useMemo(() => {
    return evaluateWarranty({
      productPrice: Number(productPrice) || 0,
      productCategory,
      mfrYears: Number(mfrYears) || 0,
      extendedWarrantyYears: Number(extendedWarrantyYears) || 0,
      ccExtensionMonths: Number(ccExtensionMonths) || 0,
      ccExcess: Number(ccExcess) || 0,
      ownershipYears: Number(ownershipYears) || 1,
      jurisdiction,
      includesAccidental,
      frictionCost: Number(frictionCost) || 0,
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

  const isAustralia = jurisdiction === 'australia';

  // Bar layout position calculations
  const totalMonths = ownershipYears * 12;
  const mfrMonths = mfrYears * 12;
  const aclMonths = isAustralia ? evaluation.estimatedAclYears * 12 : 0;
  const ewTotalMonths = extendedWarrantyYears * 12;

  const mfrWidthPct = Math.min(100, (mfrMonths / totalMonths) * 100);
  const ewStartPct = (mfrMonths / totalMonths) * 100;

  // Extended Warranty Segment Widths
  const overlapMonths = evaluation.ewTrack.overlapMonths;
  const postAclMonths = evaluation.ewTrack.postAclMonths;
  const totalEwActiveMonths = overlapMonths + postAclMonths;

  const overlapWidthPct = totalEwActiveMonths > 0
    ? (overlapMonths / totalMonths) * 100
    : 0;

  const postAclWidthPct = totalEwActiveMonths > 0
    ? (postAclMonths / totalMonths) * 100
    : 0;

  return (
    <main className="min-h-screen bg-[#0a0d14] text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: INPUT PARAMETERS */}
        <section className="lg:col-span-4 bg-[#111622] border border-slate-800/80 rounded-xl p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-100 tracking-wide">
            Input Parameters
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Product Category
            </label>
            <select
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
              className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <option key={key} value={key}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Product Purchase Price ($)
            </label>
            <input
              type="number"
              value={productPrice}
              onChange={(e) => setProductPrice(Number(e.target.value))}
              className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Dynamic Summary Box */}
          <div className="bg-[#0a0d14] border border-slate-800/80 rounded-lg p-3.5 space-y-2 text-xs">
            {isAustralia && (
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                <span className="text-slate-400 font-medium">Est. ACL Validity Period:</span>
                <strong className="text-sky-400 text-sm font-bold">
                  {evaluation.estimatedAclYears} Years
                </strong>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Est. Repair Cost:</span>
              <strong className="text-slate-100 font-bold">${evaluation.repairCost}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{ownershipYears}-Yr Failure Risk:</span>
              <strong className="text-slate-100 font-bold">{evaluation.totalFailureRatePct}%</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Accidental Share of Failures:</span>
              <strong className="text-amber-400 font-bold">{evaluation.accidentalSharePct}%</strong>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
              <span className="text-slate-400">EW Net Risk Value (Post-ACL + Accidental):</span>
              <strong className="text-emerald-400 font-bold">{evaluation.ewTrack.netRiskPercentage}%</strong>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Jurisdiction</label>
            <select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value as 'australia' | 'other')}
              className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-md px-3 py-1.5 text-xs text-slate-200"
            >
              <option value="australia">Australia (ACL Statutory Guarantees)</option>
              <option value="other">Standard Statutory Protection</option>
            </select>
          </div>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includesAccidental}
              onChange={(e) => setIncludesAccidental(e.target.checked)}
              className="rounded bg-[#0a0d14] border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <span className="text-xs text-slate-300">
              Extended Warranty Includes Accidental Damage
            </span>
          </label>

          {isAustralia && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Value placed on avoids ACL hassle/delays ($)
              </label>
              <input
                type="number"
                value={frictionCost}
                onChange={(e) => setFrictionCost(Number(e.target.value))}
                className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-md px-3 py-1.5 text-xs text-slate-200"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Mfr Warranty (Yrs)</label>
              <input
                type="number"
                value={mfrYears}
                onChange={(e) => setMfrYears(Number(e.target.value))}
                className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-md px-2.5 py-1 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Ext Warranty (Yrs)</label>
              <input
                type="number"
                value={extendedWarrantyYears}
                onChange={(e) => setExtendedWarrantyYears(Number(e.target.value))}
                className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-md px-2.5 py-1 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">CC Ext (Mo)</label>
              <input
                type="number"
                value={ccExtensionMonths}
                onChange={(e) => setCcExtensionMonths(Number(e.target.value))}
                className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-md px-2.5 py-1 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">CC Excess ($)</label>
              <input
                type="number"
                value={ccExcess}
                onChange={(e) => setCcExcess(Number(e.target.value))}
                className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-md px-2.5 py-1 text-xs text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Ownership (Yrs)</label>
            <input
              type="number"
              min="1"
              max="10"
              value={ownershipYears}
              onChange={(e) => setOwnershipYears(Number(e.target.value))}
              className="w-full bg-[#0a0d14] border border-slate-700/80 rounded-md px-2.5 py-1 text-xs text-slate-200"
            />
          </div>
        </section>

        {/* RIGHT COLUMN */}
        <section className="lg:col-span-8 space-y-6">

          {/* CARD 1: HAZARD PROFILE & CONTINUOUS COVERAGE TRACKS */}
          <div className="bg-[#111622] border border-slate-800/80 rounded-xl p-5 space-y-4">

            <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
              <h3 className="text-sm font-semibold text-slate-200">
                Bathtub Hazard Profile & Continuous Coverage Tracks
              </h3>
              <span className="text-xs text-slate-400">
                {ownershipYears}-Yr Risk: <strong className="text-amber-400">{evaluation.totalFailureRatePct}%</strong> ({evaluation.accidentalSharePct}% Accidental)
              </span>
            </div>

            {/* Layout Grid Aligned to Chart Axis */}
            <div className="space-y-3">

              {/* Chart Row */}
              <div className="grid grid-cols-12 items-end">
                <div className="col-span-3 text-right pr-3 pb-4">
                  <span className="text-[10px] text-slate-500 font-mono block">Hazard</span>
                  <span className="text-[10px] text-slate-500 font-mono block">Rate %</span>
                </div>

                <div className="col-span-9 h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={evaluation.annualTimeline}
                      margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="accidentalGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.3} />
                        </linearGradient>
                        <linearGradient id="defectGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#818cf8" stopOpacity={0.7} />
                          <stop offset="95%" stopColor="#4338ca" stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        padding={{ left: 0, right: 0 }}
                      />
                      <YAxis hide domain={[0, 'auto']} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                        }}
                        formatter={(val: any) => [`${val}%`, '']}
                      />
                      <Legend verticalAlign="top" height={28} iconType="circle" />

                      <Area
                        type="monotone"
                        dataKey="accidentalRatePct"
                        name="Accidental Hazard"
                        stackId="1"
                        stroke="#f43f5e"
                        fill="url(#accidentalGrad)"
                        strokeWidth={1.5}
                      />
                      <Area
                        type="monotone"
                        dataKey="defectRatePct"
                        name="Warranty Defect Hazard"
                        stackId="1"
                        stroke="#818cf8"
                        fill="url(#defectGrad)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Coverage Track Bars */}
              <div className="space-y-2 text-xs pt-1">

                {/* Track 1: Manufacturer */}
                <div className="grid grid-cols-12 items-center">
                  <span className="col-span-3 text-slate-400 font-medium pr-3 text-right">
                    Manufacturer
                  </span>
                  <div className="col-span-9 bg-[#0a0d14] h-6 rounded border border-slate-800 relative overflow-hidden flex items-center">
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-slate-200 text-slate-950 font-bold text-[11px] flex items-center justify-center transition-all duration-300"
                      style={{ width: `${mfrWidthPct}%` }}
                    >
                      {evaluation.mfrTrack.riskPercentage}% risk
                    </div>
                  </div>
                </div>

                {/* Track 2: Statutory (ACL) */}
                {isAustralia && (
                  <div className="grid grid-cols-12 items-center">
                    <span className="col-span-3 text-slate-400 font-medium pr-3 text-right">
                      Statutory (ACL)
                    </span>
                    <div className="col-span-9 bg-[#0a0d14] h-6 rounded border border-slate-800 relative overflow-hidden flex items-center">
                      <div
                        className="absolute top-0 bottom-0 left-0 bg-sky-500 text-slate-950 font-bold text-[11px] flex items-center justify-center transition-all duration-300"
                        style={{ width: `${mfrWidthPct}%` }}
                      >
                        {evaluation.mfrTrack.riskPercentage}% risk
                      </div>
                      {evaluation.estimatedAclYears > mfrYears && (
                        <div
                          className="absolute top-0 bottom-0 bg-slate-300 text-slate-900 font-bold text-[11px] flex items-center justify-center transition-all duration-300"
                          style={{
                            left: `${mfrWidthPct}%`,
                            width: `${Math.min(
                              100 - mfrWidthPct,
                              ((evaluation.estimatedAclYears - mfrYears) / ownershipYears) * 100
                            )}%`,
                          }}
                        >
                          {(evaluation.aclTrack.riskPercentage - evaluation.mfrTrack.riskPercentage).toFixed(1)}% risk
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Track 3: Extended Warranty (Split into Green Overlap & White Post-ACL Sections) */}
                <div className="grid grid-cols-12 items-center">
                  <span className="col-span-3 text-slate-400 font-medium pr-3 text-right">
                    Extended Warranty
                  </span>
                  <div className="col-span-9 bg-[#0a0d14] h-6 rounded border border-slate-800 relative overflow-hidden flex items-center">
                    
                    {/* Section 1: Overlap with ACL (Green - Non-preferred for defects) */}
                    {evaluation.ewTrack.hasOverlap && (
                      <div
                        className="absolute top-0 bottom-0 bg-emerald-500 text-slate-950 font-bold text-[11px] flex items-center justify-center transition-all duration-300 border-r border-emerald-600/40"
                        style={{
                          left: `${ewStartPct}%`,
                          width: `${overlapWidthPct}%`,
                        }}
                      >
                        {evaluation.ewTrack.overlapRiskPercentage}% risk
                      </div>
                    )}

                    {/* Section 2: Post-ACL Period (White - Preferred option) */}
                    {evaluation.ewTrack.hasPostAcl && (
                      <div
                        className="absolute top-0 bottom-0 bg-slate-200 text-slate-950 font-bold text-[11px] flex items-center justify-center transition-all duration-300"
                        style={{
                          left: `${ewStartPct + overlapWidthPct}%`,
                          width: `${postAclWidthPct}%`,
                        }}
                      >
                        {evaluation.ewTrack.postAclRiskPercentage}% risk
                      </div>
                    )}
                  </div>
                </div>

                {/* Track 4: Credit Card */}
                <div className="grid grid-cols-12 items-center">
                  <span className="col-span-3 text-slate-400 font-medium pr-3 text-right">
                    Credit Card
                  </span>
                  <div className="col-span-9 bg-[#0a0d14] h-6 rounded border border-slate-800 relative overflow-hidden flex items-center">
                    <div
                      className="absolute top-0 bottom-0 bg-purple-500 text-slate-100 font-bold text-[11px] flex items-center justify-center transition-all duration-300"
                      style={{
                        left: `${mfrWidthPct}%`,
                        width: `${Math.min(
                          100 - mfrWidthPct,
                          ((ccExtensionMonths / 12) / ownershipYears) * 100
                        )}%`,
                      }}
                    >
                      {evaluation.ccTrack.riskPercentage}% risk
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* CARD 2: EXTENDED WARRANTY NET VALUE MATRIX */}
          <div className="bg-[#111622] border border-slate-800/80 rounded-xl p-5">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-1">
                  Extended Warranty Net Value Matrix
                </h3>
                <p className="text-xs text-slate-400">
                  Calculated using net EW risk value: <strong className="text-slate-200">{evaluation.ewTrack.netRiskPercentage}%</strong> (Manufacturing defects after ACL expires + full accidental damage lifetime).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-slate-400">
                    <th className="py-2 px-3 text-left font-medium">Premium \ Excess</th>
                    {evaluation.matrix.excesses.map((exc) => (
                      <th key={exc} className="py-2 px-2 font-medium">${exc}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {evaluation.matrix.grid.map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 text-left font-medium text-slate-300">
                        ${evaluation.matrix.premiums[idx]}
                      </td>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-1">
                          <div
                            className={`py-1.5 px-2 rounded font-bold transition-colors ${
                              cell.isPositive
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-red-600 text-slate-100'
                            }`}
                          >
                            {cell.netValue >= 0 ? `+$${cell.netValue}` : `-$${Math.abs(cell.netValue)}`}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </section>
      </div>
    </main>
  );
}
