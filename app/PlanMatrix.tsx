export type Tone = 'worth-it' | 'borderline' | 'skip-it';

export interface MatrixCell {
  marketPrice: number;
  fairPrice: number;
}

export function toneFor(marketPrice: number, fairPrice: number): Tone {
  const ratio = marketPrice / Math.max(fairPrice, 0.01);
  return ratio <= 1 ? 'worth-it' : ratio <= 1.25 ? 'borderline' : 'skip-it';
}

const TONE_STYLE: Record<Tone, { bg: string; text: string; label: string }> = {
  'worth-it': { bg: 'bg-tc-lime', text: 'text-tc-navy', label: 'Worth it' },
  borderline: { bg: 'bg-tc-orange', text: 'text-white', label: 'Borderline' },
  'skip-it': { bg: 'bg-tc-red', text: 'text-white', label: 'Skip it' },
};

export default function PlanMatrix({
  years,
  rows,
}: {
  years: number[];
  rows: { title: string; cells: MatrixCell[] }[];
}) {
  return (
    <div>
      <div className="grid grid-cols-[4.5rem_repeat(3,minmax(0,1fr))] gap-2 items-center">
        <span />
        {years.map((y) => (
          <span key={y} className="text-center text-[11px] font-semibold text-tc-navy">
            {y} yrs
          </span>
        ))}
        {rows.map((row) => (
          <div key={row.title} className="contents">
            <span className="text-[11px] font-semibold text-tc-navy leading-tight pr-1">{row.title}</span>
            {row.cells.map((cell, i) => {
              const tone = toneFor(cell.marketPrice, cell.fairPrice);
              const style = TONE_STYLE[tone];
              return (
                <div
                  key={`${row.title}-${years[i]}`}
                  className={`${style.bg} ${style.text} rounded-xl px-1.5 py-2.5 flex flex-col items-center justify-center min-h-[68px] shadow-sm`}
                >
                  <span className="text-[11px] font-bold leading-tight">{style.label}</span>
                  <span className="font-numeric text-[10px] mt-1 leading-tight">
                    ${cell.marketPrice} / ${cell.fairPrice}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-tc-muted leading-relaxed mt-3 text-center">
        Each tile shows market price / fair price. Green: market is at or below fair. Orange: up to 25% above. Red: more than 25% above.
      </p>
    </div>
  );
}
