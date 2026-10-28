'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function UnlockForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Wrong password.');
        return;
      }
      router.replace(nextPath.startsWith('/') ? nextPath : '/');
      router.refresh();
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-tc-bg text-tc-navy flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-tc-surface border border-tc-border rounded-2xl shadow-lg p-6 md:p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/4107097-ThingyCare_Icon.svg"
            alt="ThingyCare logo"
            className="w-10 h-10 object-contain"
          />
          <div>
            <div className="font-display font-bold text-lg leading-tight">ThingyCare</div>
            <div className="text-xs text-tc-muted leading-tight">Private access</div>
          </div>
        </div>
        <label className="block">
          <span className="block text-xs font-semibold text-tc-navy mb-1.5">Site password</span>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-tc-border bg-white px-3.5 py-2.5 text-sm text-tc-navy focus:outline-none focus:ring-2 focus:ring-tc-teal focus:border-transparent transition-shadow"
          />
        </label>
        {error && (
          <p className="mt-3 rounded-lg bg-tc-red/10 border border-tc-red/30 px-3 py-2 text-xs text-tc-red">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={!password || loading}
          className="mt-5 w-full rounded-lg px-5 py-2.5 text-sm font-semibold bg-tc-teal text-white hover:bg-tc-teal-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Checking…' : 'Enter'}
        </button>
      </form>
    </main>
  );
}
