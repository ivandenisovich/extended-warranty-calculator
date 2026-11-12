'use client';

import { useEffect, useState } from 'react';
import type { EwPricingConfig } from '../../lib/ewPricingModel';
import type { FormState } from '../InputFlow';
import CoverGridView from './CoverGrid';
import { summariseCoverGrid, type CoverGrid } from './coverGrid';

export default function WarrantyGridSection({ form, pricing }: { form: FormState; pricing: EwPricingConfig }) {
  const [grid, setGrid] = useState<CoverGrid | null>(null);
  const [gridFailed, setGridFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    summariseCoverGrid(form, pricing)
      .then((result) => {
        if (!cancelled) setGrid(result);
      })
      .catch(() => {
        if (!cancelled) setGridFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [form, pricing]);

  return (
    <div className="mx-5 mt-4">
      <h4 className="font-display font-bold text-sm mb-3">Is a paid warranty worth it?</h4>
      {grid && <CoverGridView grid={grid} />}
      {!grid && !gridFailed && <p className="text-sm text-tc-muted text-center">Calculating…</p>}
      {gridFailed && (
        <p className="text-sm text-tc-red text-center">
          Couldn&apos;t work out the warranty options. Reload this page to try again.
        </p>
      )}
    </div>
  );
}
