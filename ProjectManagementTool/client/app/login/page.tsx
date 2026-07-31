'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/api';

function OrbitMark() {
  return (
    <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--aurora-violet)]/40 mx-auto">
      <span className="absolute inset-1.5 rounded-full border border-[var(--aurora-teal)]/40" />
      <span className="h-2 w-2 rounded-full bg-[var(--aurora-violet)]" />
    </span>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? 'Could not log in. Check your details and try again.');
        return;
      }
      router.push('/dashboard');
    } catch {
      setError("Can't reach the server. Make sure your backend is running.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <a href="/" className="block mb-8 text-center">
          <OrbitMark />
          <span className="mt-3 block font-display text-lg font-semibold text-[var(--text-primary)]">
            NEST
          </span>
        </a>

        <div className="glass px-7 py-8 sm:px-8 sm:py-9">
          <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)] text-center">
            Welcome back
          </h1>
          <p className="text-sm text-[var(--text-secondary)] text-center mt-1.5">
            Log in to pick up where you left off.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="email" className="text-xs font-medium text-[var(--text-secondary)]">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="glass-input mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-xs font-medium text-[var(--text-secondary)]">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="glass-input mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm"
              />
            </div>

            {error && (
              <p className="text-xs text-[var(--aurora-rose)] bg-[var(--aurora-rose)]/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-gradient-to-r from-[var(--aurora-violet)] to-[var(--aurora-teal)] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(124,111,240,0.3)] transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>
        </div>

        <p className="text-sm text-[var(--text-secondary)] text-center mt-6">
          New to NEST?{' '}
          <a href="/register" className="text-[var(--aurora-violet)] font-medium hover:underline">
            Create an account
          </a>
        </p>
      </div>
    </div>
  );
}
