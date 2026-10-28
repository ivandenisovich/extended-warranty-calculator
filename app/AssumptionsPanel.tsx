'use client';

import { CATEGORIES, DEFAULT_HAZARD, type HazardShape } from './warrantyEngine';

export interface Assumptions {
  failureRate: number;
  accidentalShare: number; // 0-100 as shown on the page
  repairRatio: number; // 0-100 as shown on the page
  hazard: HazardShape;
}

export interface AssumptionsProps {
  categoryKey: string;
  assumptions: Assumptions;
  onChange: (next: Assumptions) => void;
}

const inputCls =
  'w-full bg-[#0a0d14] border border-slate-700/80 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500';

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] text-slate-400 mb-1">{label}</span>
      <span className="relative block">
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`${inputCls} ${suffix ? 'pr-7' : ''}`}
        />
        {suffix && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

export default function AssumptionsPanel({ categoryKey, assumptions, onChange }: AssumptionsProps) {
  const set = <K extends keyof Assumptions>(key: K, value: Assumptions[K]) =>
    onChange({ ...assumptions, [key]: value });

  const setHazard = (key: keyof HazardShape, value: number) =>
    onChange({ ...assumptions, hazard: { ...assumptions.hazard, [key]: value } });

  const isDefaultHazard =
    (Object.keys(DEFAULT_HAZARD) as (keyof HazardShape)[]).every(
      (k) => assumptions.hazard[k] === DEFAULT_HAZARD[k]
    );

  const defaultCat = CATEGORIES[categoryKey] || CATEGORIES.smartphones;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400 leading-relaxed">
        These assumptions drive every result on the page. Defaults are pre-filled from the{' '}
        <strong className="text-slate-300">{defaultCat.name}</strong> category. Tune them to see how the
        model&apos;s fair price moves.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Baseline 5-Yr Failure Risk"
          value={assumptions.failureRate}
          onChange={(v) => set('failureRate', v)}
          min={0}
          max={100}
          suffix="%"
        />
        <NumberField
          label="Accidental Share of Failures"
          value={assumptions.accidentalShare}
          onChange={(v) => set('accidentalShare', v)}
          min={0}
          max={100}
          suffix="%"
        />
        <NumberField
          label="Repair Cost (% of Price)"
          value={assumptions.repairRatio}
          onChange={(v) => set('repairRatio', v)}
          min={0}
          max={100}
          suffix="%"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
            Failure Timing (Hazard Shape)
          </span>
          {!isDefaultHazard && (
            <button
              onClick={() => setHazardReset()}
              className="text-[11px] text-sky-400 hover:text-sky-300 underline underline-offset-2"
            >
              Reset timing only
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Early-Defect Burst Strength"
            value={assumptions.hazard.infantStrength}
            onChange={(v) => setHazard('infantStrength', v)}
            step={0.1}
            min={0}
          />
          <NumberField
            label="Burst Fade Rate"
            value={assumptions.hazard.infantDecay}
            onChange={(v) => setHazard('infantDecay', v)}
            step={0.1}
            min={0}
          />
          <NumberField
            label="Background Failure Rate"
            value={assumptions.hazard.background}
            onChange={(v) => setHazard('background', v)}
            step={0.05}
            min={0}
          />
          <NumberField
            label="Wear-Out Strength"
            value={assumptions.hazard.wearOutStrength}
            onChange={(v) => setHazard('wearOutStrength', v)}
            step={0.1}
            min={0}
          />
          <NumberField
            label="Accidental Front-Loading"
            value={assumptions.hazard.accidentalFrontLoad}
            onChange={(v) => setHazard('accidentalFrontLoad', v)}
            step={0.1}
            min={0}
            max={1}
          />
        </div>
        <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
          Burst strength = how many failures cluster in year 1. Fade rate = how quickly that burst dies
          out. Background = steady random failures each year. Wear-out = extra failures piling up near
          end of life. Accidental front-loading: 0 spreads drops/spills evenly, 1 puts almost all of
          them in year 1.
        </p>
      </div>

      <button
        onClick={() => resetToDefaults(defaultCat)}
        className="w-full text-xs py-2 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:border-slate-600 transition-colors"
      >
        Reset to Defaults
      </button>
    </div>
  );

  function setHazardReset() {
    onChange({ ...assumptions, hazard: { ...DEFAULT_HAZARD } });
  }

  function resetToDefaults(cat: typeof defaultCat) {
    onChange({
      failureRate: cat.failureRate,
      accidentalShare: Math.round(cat.accidentalShare * 100),
      repairRatio: Math.round(cat.repairRatio * 100),
      hazard: { ...DEFAULT_HAZARD },
    });
  }
}
