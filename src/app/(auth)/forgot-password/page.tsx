'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Stack } from '@phosphor-icons/react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch {
      setSent(true); // Always show success to prevent enumeration
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
          <Stack size={28} weight="fill" className="text-gray-900" />
          <span className="font-sans text-2xl font-medium tracking-[-0.04em] text-gray-900">Forma</span>
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Reset your password</h1>
        <p className="text-gray-500 text-sm mt-2">
          {sent
            ? 'Check your email for a reset link'
            : 'Enter your email and we\'ll send you a reset link'}
        </p>
      </div>

      {sent ? (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12 5 5L20 7" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">
            If an account exists with that email, you&apos;ll receive a reset link shortly. The link expires in 15 minutes.
          </p>
          <Link href="/login" className="inline-block text-sm text-safety-orange hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input w-full"
              required
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-3 bg-safety-orange text-white rounded-lg font-medium hover:bg-[#ee6018] transition-colors disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
          <p className="text-center text-sm text-gray-500">
            Remember your password?{' '}
            <Link href="/login" className="text-safety-orange hover:underline">Sign in</Link>
          </p>
        </form>
      )}
    </div>
  );
}
