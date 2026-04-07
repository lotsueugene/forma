'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Stack, Check, Spinner } from '@phosphor-icons/react';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const scope = searchParams.get('scope') || 'platform';
  const [status, setStatus] = useState<'loading' | 'confirming' | 'done' | 'error'>('confirming');

  const handleUnsubscribe = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, scope }),
      });
      if (res.ok) {
        setStatus('done');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500">Invalid unsubscribe link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-6 bg-safety-orange/10 rounded-xl flex items-center justify-center">
          <Stack size={24} weight="fill" className="text-safety-orange" />
        </div>

        {status === 'confirming' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Unsubscribe</h1>
            <p className="text-gray-500 mb-6">
              Are you sure you want to unsubscribe <strong>{email}</strong> from these emails?
            </p>
            <button
              onClick={handleUnsubscribe}
              className="btn btn-primary w-full mb-3"
            >
              Yes, Unsubscribe Me
            </button>
            <a href="/" className="text-sm text-gray-400 hover:text-gray-600">
              Cancel
            </a>
          </>
        )}

        {status === 'loading' && (
          <>
            <Spinner size={32} className="mx-auto mb-4 animate-spin text-safety-orange" />
            <p className="text-gray-500">Unsubscribing...</p>
          </>
        )}

        {status === 'done' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-50 rounded-full flex items-center justify-center">
              <Check size={32} className="text-emerald-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Unsubscribed</h1>
            <p className="text-gray-500">
              <strong>{email}</strong> has been unsubscribed. You won&apos;t receive these emails anymore.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-500 mb-4">Please try again or contact support.</p>
            <button onClick={handleUnsubscribe} className="btn btn-primary">
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Spinner size={32} className="animate-spin text-gray-400" /></div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}
