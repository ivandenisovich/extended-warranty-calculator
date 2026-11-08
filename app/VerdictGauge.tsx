'use client';

import { useEffect, useState } from 'react';
import type { Verdict } from './VerdictBanner';

// Traffic-light semicircular gauge. The needle points into the green zone
// when the market price is at or below fair value, amber when up to 25%
// over, red beyond — matching the calculator's thresholds.
const ZONES = [
  { verdict: 'skip-it' as Verdict, color: '#db2457', label: 'Skip it' },
  { verdict: 'borderline' as Verdict, color: '#e35125', label: 'Borderline' },
  { verdict: 'worth-it' as Verdict, color: '#76c422', label: 'Consider it' },
];

const RADIUS = 100;
const CENTER_X = 120;
const CENTER_Y = 110;
const SWEEP = 180; // semicircle, left to right

function zoneFor(verdict: Verdict) {
  return ZONES.find((z) => z.verdict === verdict) ?? ZONES[1];
}

// Needle angle: 0deg (left, red) to 180deg (right, green). At/below fair
// value pins to the far right; 25% over is mid-gauge; worse swings left.
function needleAngle(ratio: number): number {
  if (ratio <= 1) return 180;
  if (ratio >= 2) return 0;
  // 1.0 -> 180deg, 1.25 -> 90deg, 2.0 -> 0deg
  const t = (ratio - 1) / 1;
  return Math.max(0, 180 - t * 180);
}

export default function VerdictGauge({
  marketPrice,
  fairPrice,
  verdict,
}: {
  marketPrice: number;
  fairPrice: number;
  verdict: Verdict;
}) {
  const zone = zoneFor(verdict);
  const targetAngle = needleAngle(marketPrice / Math.max(fairPrice, 0.01));
  const [angle, setAngle] = useState(90);

  // Animate from the 12 o'clock start position on first paint.
  useEffect(() => {
    const id = requestAnimationFrame(() => setAngle(targetAngle));
    return () => cancelAnimationFrame(id);
  }, [targetAngle]);

  const rad = (deg: number) => (deg * Math.PI) / 180;
  const arcPoint = (deg: number) => ({
    x: CENTER_X + RADIUS * Math.cos(rad(180 - deg)),
    y: CENTER_Y - RADIUS * Math.sin(rad(180 - deg)),
  });

  // Build three equal arcs for the zones (60deg each).
  const arcPath = (fromDeg: number, toDeg: number) => {
    const from = arcPoint(fromDeg);
    const to = arcPoint(toDeg);
    return `M ${from.x} ${from.y} A ${RADIUS} ${RADIUS} 0 0 1 ${to.x} ${to.y}`;
  };

  const headline =
    verdict === 'worth-it'
      ? 'Worth considering'
      : verdict === 'borderline'
        ? 'Borderline — you\u2019d overpay a little'
        : 'Skip it';
  const needle = arcPoint(angle);

  return (
    <div className="bg-white rounded-2xl border border-tc-border shadow-sm p-4 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-tc-muted mb-1">
        Should you consider buying a warranty?
      </div>
      <svg viewBox="0 0 240 130" className="w-full max-w-[240px] mx-auto" role="img" aria-label={`Verdict gauge pointing to ${zone.label}`}>
        <path d={arcPath(0, 60)} stroke={ZONES[0].color} strokeWidth={16} fill="none" strokeLinecap="round" />
        <path d={arcPath(60, 120)} stroke={ZONES[1].color} strokeWidth={16} fill="none" />
        <path d={arcPath(120, 180)} stroke={ZONES[2].color} strokeWidth={16} fill="none" strokeLinecap="round" />
        {/* needle */}
        <line
          x1={CENTER_X}
          y1={CENTER_Y}
          x2={needle.x}
          y2={needle.y}
          stroke="#182c49"
          strokeWidth={4}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
        <circle cx={CENTER_X} cy={CENTER_Y} r={7} fill="#182c49" />
        <text x={24} y={126} fontSize={10} fill="#5b6b82" fontWeight="600">Skip</text>
        <text x={216} y={126} fontSize={10} fill="#5b6b82" fontWeight="600" textAnchor="end">Good</text>
      </svg>
      <h3 className="font-display font-bold text-lg mt-1" style={{ color: zone.color }}>
        {headline}
      </h3>
      <p className="text-xs text-tc-muted mt-1">
        Typical offer <span className="font-numeric font-bold text-tc-navy">${marketPrice}</span>
        {' '}vs what it&apos;s really worth{' '}
        <span className="font-numeric font-bold text-tc-navy">${fairPrice}</span>
      </p>
    </div>
  );
}
