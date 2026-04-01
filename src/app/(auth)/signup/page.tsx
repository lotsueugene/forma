'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Stack,
  EnvelopeSimple,
  Lock,
  User,
  ArrowRight,
  GithubLogo,
  GoogleLogo,
  Check,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const features = [
  'Up to 3 forms on free plan',
  'No credit card required',
  'Cancel anytime',
];

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const prefillEmail = searchParams.get('email') || '';
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState('');

  // Update email if prefillEmail changes (e.g., on navigation)
  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail);
    }
  }, [prefillEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Register the user
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        setError(registerData.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      // Sign in the user
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError('Account created but failed to sign in. Please try logging in.');
        setIsLoading(false);
        return;
      }

      router.push(callbackUrl);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Mobile Logo */}
      <Link href="/" className="lg:hidden flex items-center gap-2 justify-center mb-8">
        <Stack size={28} weight="fill" className="text-safety-orange" />
        <span className="font-sans text-xl font-medium tracking-tight text-gray-900">
          Forma
        </span>
      </Link>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Create your account
        </h1>
        <p className="text-gray-500">
          Start building forms in minutes
        </p>
      </div>

      {/* Features */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-6">
        {features.map((feature) => (
          <div key={feature} className="flex items-center gap-1.5 text-sm text-gray-600">
            <Check size={14} weight="bold" className="text-safety-orange" />
            {feature}
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm text-center">
          {error}
        </div>
      )}

      {/* Social Login */}
      <div className="flex gap-3 mb-6">
        <button className="flex-1 btn btn-secondary justify-center" disabled>
          <GithubLogo size={20} weight="fill" />
          GitHub
        </button>
        <button className="flex-1 btn btn-secondary justify-center" disabled>
          <GoogleLogo size={20} weight="fill" />
          Google
        </button>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-white text-gray-500 text-xs font-mono uppercase tracking-wider">
            or continue with email
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-field">
          <label htmlFor="name" className="form-label">Full Name</label>
          <div className="relative">
            <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="input input-with-icon"
              required
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="email" className="form-label">Work Email</label>
          <div className="relative">
            <EnvelopeSimple size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="input input-with-icon"
              required
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="password" className="form-label">Password</label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password (min 8 chars)"
              className="input input-with-icon"
              minLength={8}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            'btn btn-primary w-full justify-center',
            isLoading && 'opacity-70 cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Create Account
              <ArrowRight size={18} weight="bold" />
            </>
          )}
        </button>
      </form>

      {/* Terms */}
      <p className="mt-6 text-center text-xs text-gray-500">
        By signing up, you agree to our{' '}
        <Link href="/terms" className="text-gray-600 hover:text-gray-900 transition-colors">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="text-gray-600 hover:text-gray-900 transition-colors">
          Privacy Policy
        </Link>
      </p>

      {/* Footer */}
      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link
          href={callbackUrl !== '/dashboard' ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login'}
          className="text-safety-orange hover:text-gray-900 font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-gray-300 border-t-safety-orange rounded-full animate-spin" /></div>}>
      <SignupForm />
    </Suspense>
  );
}
