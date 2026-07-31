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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (values: { name: string; email: string; password: string; confirm: string }): FieldErrors => {
    const errors: FieldErrors = {};

    if (!values.name.trim()) {
      errors.name = 'Name is required.';
    }

    if (!values.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_RE.test(values.email)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!values.password) {
      errors.password = 'Password is required.';
    } else if (values.password.length < 8) {
      errors.password = 'Use at least 8 characters.';
    }

    if (!values.confirm) {
      errors.confirm = 'Please confirm your password.';
    } else if (values.password && values.confirm !== values.password) {
      errors.confirm = 'Passwords do not match.';
    }

    return errors;
  };

  const handleBlur = (field: keyof FieldErrors) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setFieldErrors(validate({ name, email, password, confirm }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors = validate({ name, email, password, confirm });
    setFieldErrors(errors);
    setTouched({ name: true, email: true, password: true, confirm: true });

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? 'Could not create your account. Try again.');
        return;
      }
      router.push('/dashboard');
    } catch {
      setError("Can't reach the server. Make sure your backend is running.");
    } finally {
      setSubmitting(false);
    }
  };

  const showError = (field: keyof FieldErrors) => touched[field] && fieldErrors[field];

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
            Create your account
          </h1>
          <p className="text-sm text-[var(--text-secondary)] text-center mt-1.5">
            Give your projects a home in under a minute.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-4">
            <div>
              <label htmlFor="name" className="text-xs font-medium text-[var(--text-secondary)]">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => handleBlur('name')}
                placeholder="Ada Lovelace"
                aria-invalid={!!showError('name')}
                className={`glass-input mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm ${
                  showError('name') ? 'ring-1 ring-[var(--aurora-rose)]' : ''
                }`}
              />
              {showError('name') && (
                <p className="mt-1 text-xs text-[var(--aurora-rose)]">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="text-xs font-medium text-[var(--text-secondary)]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="you@example.com"
                aria-invalid={!!showError('email')}
                className={`glass-input mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm ${
                  showError('email') ? 'ring-1 ring-[var(--aurora-rose)]' : ''
                }`}
              />
              {showError('email') && (
                <p className="mt-1 text-xs text-[var(--aurora-rose)]">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="text-xs font-medium text-[var(--text-secondary)]">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
                placeholder="••••••••"
                aria-invalid={!!showError('password')}
                className={`glass-input mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm ${
                  showError('password') ? 'ring-1 ring-[var(--aurora-rose)]' : ''
                }`}
              />
              {showError('password') ? (
                <p className="mt-1 text-xs text-[var(--aurora-rose)]">{fieldErrors.password}</p>
              ) : (
                <p className="mt-1 text-xs text-[var(--text-secondary)]">At least 8 characters.</p>
              )}
            </div>

            <div>
              <label htmlFor="confirm" className="text-xs font-medium text-[var(--text-secondary)]">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onBlur={() => handleBlur('confirm')}
                placeholder="••••••••"
                aria-invalid={!!showError('confirm')}
                className={`glass-input mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm ${
                  showError('confirm') ? 'ring-1 ring-[var(--aurora-rose)]' : ''
                }`}
              />
              {showError('confirm') && (
                <p className="mt-1 text-xs text-[var(--aurora-rose)]">{fieldErrors.confirm}</p>
              )}
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
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-sm text-[var(--text-secondary)] text-center mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-[var(--aurora-violet)] font-medium hover:underline">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}