'use client';

import { useState } from 'react';
import type { ExtractedProduct } from './extractTypes';

export default function LinkAnalyzer({
  onApply,
  onDismiss,
}: {
  onApply: (product: ExtractedProduct) => void;
  onDismiss: () => void;
}) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedProduct | null>(null);
  const [priceStr, setPriceStr] = useState('');

  const fetchProduct = async () => {
    setLoading(true);
    setError(null);
    setExtracted(null);
    try {
      const res = await fetch(`/api/extract-product?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();
      if (!data.ok) {
        setError(
          data.error === 'timeout'
            ? 'That site took too long to respond. You can still enter the details manually below.'
            : "We couldn't read that page — some retailers block automated reading. Enter the details manually below."
        );
        return;
      }
      setExtracted(data.product);
      setPriceStr(data.product.price ? String(data.product.price) : '');
    } catch {
      setError('Something went wrong reaching the site. Enter the details manually below.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-tc-navy text-white rounded-2xl p-5 md:p-6 shadow-lg">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-tc-lime flex items-center justify-center shrink-0 mt-0.5">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-tc-navy" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </div>
        <div>
          <h2 className="font-display text-lg font-bold">Analyse from a product link</h2>
          <p className="text-sm text-white/70 leading-relaxed">
            Paste a product page from a retailer and we&apos;ll pre-fill what we can. You confirm the rest.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && url.trim() && !loading && fetchProduct()}
          placeholder="https://www.jbhifi.com.au/products/..."
          className="flex-1 rounded-lg px-3.5 py-2.5 text-sm bg-white text-tc-navy placeholder:text-slate-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-tc-lime"
        />
        <button
          onClick={fetchProduct}
          disabled={!url.trim() || loading}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold bg-tc-lime text-tc-navy hover:bg-tc-lime-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {loading ? 'Reading…' : 'Read the page'}
        </button>
      </div>

      <p className="text-xs text-white/50 mt-2">
        Some retailers block access to their product pages. If so, enter the details manually below.
      </p>

      {error && (
        <div className="mt-3 rounded-lg bg-tc-orange/20 border border-tc-orange/40 p-3 text-sm text-white leading-relaxed">
          {error}
        </div>
      )}

      {extracted && (
        <div className="mt-4 rounded-xl bg-white/10 p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-tc-lime">
            We found this — please confirm
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <label className="block">
              <span className="block text-xs text-white/70 mb-1">Product name</span>
              <input
                type="text"
                value={extracted.name}
                onChange={(e) => setExtracted({ ...extracted, name: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm bg-white text-tc-navy focus:outline-none focus:ring-2 focus:ring-tc-lime"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-white/70 mb-1">Price ($)</span>
              <input
                type="number"
                min={0}
                value={priceStr}
                onChange={(e) => setPriceStr(e.target.value)}
                className="w-full sm:w-32 rounded-lg px-3 py-2 text-sm bg-white text-tc-navy focus:outline-none focus:ring-2 focus:ring-tc-lime"
              />
            </label>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              onClick={() =>
                onApply({
                  ...extracted,
                  price: priceStr === '' ? null : Number(priceStr),
                })
              }
              className="rounded-lg px-5 py-2.5 text-sm font-semibold bg-tc-lime text-tc-navy hover:bg-tc-lime-dark transition-colors"
            >
              Use these details
            </button>
            <button
              onClick={onDismiss}
              className="rounded-lg px-5 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Start blank instead
            </button>
          </div>
        </div>
      )}

      {!extracted && (
        <button
          onClick={onDismiss}
          className="mt-3 text-xs text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors"
        >
          No link? Enter details manually
        </button>
      )}
    </div>
  );
}
