import type { CoverGrid, GridCell, Tone } from './coverGrid';

const TONE_STYLE: Record<Tone, { bg: string; text: string; label: string }> = {
  'worth-it': { bg: 'bg-tc-lime', text: 'text-tc-navy', label: 'Worth it' },
  borderline: { bg: 'bg-[#f2b134]', text: 'text-tc-navy', label: 'Borderline' },
  'skip-it': { bg: 'bg-tc-red', text: 'text-white', label: 'Skip it' },
};

function gapText(cell: GridCell) {
  if (cell.gap === 0) return 'Fair price';
  const amount = `$${Math.abs(cell.gap)}`;
  return cell.gap > 0 ? `${amount} over fair` : `${amount} under fair`;
}

export default function CoverGridView({ grid }: { grid: CoverGrid }) {
  return (
    <div>
      <div className="grid grid-cols-[4.5rem_repeat(3,minmax(0,1fr))] gap-2 items-center">
        <span />
        {grid.extraYears.map((y) => (
          <span key={y} className="text-center text-[11px] font-semibold text-tc-navy">
            +{y} {y === 1 ? 'yr' : 'yrs'}
          </span>
        ))}
        {grid.rows.map((row) => (
          <div key={row.title} className="contents">
            <span className="text-[11px] font-semibold text-tc-navy leading-tight pr-1">{row.title}</span>
            {row.cells.map((cell, i) => {
              const style = TONE_STYLE[cell.tone];
              return (
                <div
                  key={`${row.title}-${grid.extraYears[i]}`}
                  className={`${style.bg} ${style.text} rounded-xl px-1.5 py-2.5 flex flex-col items-center justify-center min-h-[68px] shadow-sm`}
                >
                  <span className="text-[11px] font-bold leading-tight">{style.label}</span>
                  <span className="text-[10px] mt-1 leading-tight">{gapText(cell)}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-tc-muted leading-relaxed mt-3 text-center">
        Green: at or below fair value. Amber: up to 25% above. Red: more than 25% above.
      </p>
    </div>
  );
}
