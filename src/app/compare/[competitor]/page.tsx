'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Stack } from '@phosphor-icons/react';
import { useParams } from 'next/navigation';

const COMPETITORS: Record<string, {
  name: string;
  pricing: Array<{ submissions: number; price: number }>;
  color: string;
}> = {
  typeform: {
    name: 'Typeform',
    color: '#262627',
    pricing: [
      { submissions: 100, price: 29 },
      { submissions: 1000, price: 59 },
      { submissions: 10000, price: 99 },
      { submissions: 50000, price: 499 },
      { submissions: 100000, price: 499 },
    ],
  },
  'google-forms': {
    name: 'Google Forms',
    color: '#4285F4',
    pricing: [
      { submissions: 100, price: 0 },
      { submissions: 1000, price: 0 },
      { submissions: 10000, price: 0 },
      { submissions: 50000, price: 0 },
      { submissions: 100000, price: 0 },
    ],
  },
  jotform: {
    name: 'Jotform',
    color: '#FF6100',
    pricing: [
      { submissions: 100, price: 0 },
      { submissions: 1000, price: 39 },
      { submissions: 10000, price: 49 },
      { submissions: 50000, price: 129 },
      { submissions: 100000, price: 129 },
    ],
  },
  tally: {
    name: 'Tally',
    color: '#1E1E1E',
    pricing: [
      { submissions: 100, price: 0 },
      { submissions: 1000, price: 0 },
      { submissions: 10000, price: 0 },
      { submissions: 50000, price: 29 },
      { submissions: 100000, price: 29 },
    ],
  },
};

const FORMA_PRICE = 0; // Free for all submission levels

const SUBMISSION_LEVELS = [100, 500, 1000, 5000, 10000, 25000, 50000, 100000];

function getCompetitorPrice(pricing: Array<{ submissions: number; price: number }>, submissions: number): number {
  for (let i = pricing.length - 1; i >= 0; i--) {
    if (submissions >= pricing[i].submissions) return pricing[i].price;
  }
  return pricing[0].price;
}

export default function ComparePage() {
  const params = useParams();
  const slug = params.competitor as string;
  const competitor = COMPETITORS[slug];
  const [sliderIndex, setSliderIndex] = useState(2); // Default 1000

  if (!competitor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Competitor not found</p>
      </div>
    );
  }

  const submissions = SUBMISSION_LEVELS[sliderIndex];
  const competitorPrice = getCompetitorPrice(competitor.pricing, submissions);
  const savings = competitorPrice - FORMA_PRICE;

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-9 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Stack size={24} weight="fill" className="text-safety-orange" />
            <span className="font-sans text-xl font-medium tracking-tight text-gray-900">Forma</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/compare/typeform" className={slug === 'typeform' ? 'text-sm font-medium text-safety-orange' : 'text-sm text-gray-500 hover:text-gray-900'}>vs Typeform</Link>
            <Link href="/compare/jotform" className={slug === 'jotform' ? 'text-sm font-medium text-safety-orange' : 'text-sm text-gray-500 hover:text-gray-900'}>vs Jotform</Link>
            <Link href="/compare/tally" className={slug === 'tally' ? 'text-sm font-medium text-safety-orange' : 'text-sm text-gray-500 hover:text-gray-900'}>vs Tally</Link>
            <Link href="/compare/google-forms" className={slug === 'google-forms' ? 'text-sm font-medium text-safety-orange' : 'text-sm text-gray-500 hover:text-gray-900'}>vs Google Forms</Link>
          </div>
        </div>
      </header>

      <main className="py-16 lg:py-24">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
            Forma vs {competitor.name} pricing
          </h1>
          <p className="text-gray-500 mb-12">Your expected number of submissions per month?</p>

          {/* Slider */}
          <div className="mb-12">
            <div className="text-2xl font-bold text-gray-900 mb-4">
              {submissions.toLocaleString()} submissions per month
            </div>
            <input
              type="range"
              min={0}
              max={SUBMISSION_LEVELS.length - 1}
              value={sliderIndex}
              onChange={(e) => setSliderIndex(parseInt(e.target.value))}
              className="w-full max-w-md accent-safety-orange h-2 rounded-full appearance-none bg-gray-200 cursor-pointer"
            />
            <div className="flex justify-between max-w-md mx-auto mt-2 text-xs text-gray-400">
              <span>100</span>
              <span>100K</span>
            </div>
          </div>

          {/* Price comparison */}
          <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto mb-8">
            {/* Forma */}
            <div className="card p-6 text-center border-safety-orange/30 bg-white">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Stack size={20} weight="fill" className="text-safety-orange" />
                <span className="font-semibold text-gray-900">Forma</span>
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-1">$0</div>
              <div className="text-3xl mb-2">🥳</div>
              <p className="text-xs text-gray-500">Unlimited submissions on all plans</p>
            </div>

            {/* Competitor */}
            <div className="card p-6 text-center bg-white">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-5 h-5 rounded" style={{ backgroundColor: competitor.color }} />
                <span className="font-semibold text-gray-900">{competitor.name}</span>
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-1">
                ${competitorPrice}
              </div>
              <div className="text-3xl mb-2">{competitorPrice > 0 ? '😭' : '🤝'}</div>
              <p className="text-xs text-gray-500">
                {competitorPrice > 0 ? `$${competitorPrice}/month for this tier` : 'Free at this level too'}
              </p>
            </div>
          </div>

          {/* Savings callout */}
          {savings > 0 && (
            <div className="inline-block bg-emerald-50 border border-emerald-200 rounded-full px-6 py-3 mb-12">
              <span className="text-emerald-700 font-semibold">
                You save ${savings}/month with Forma ✌️
              </span>
            </div>
          )}

          {savings === 0 && competitorPrice === 0 && (
            <div className="inline-block bg-blue-50 border border-blue-200 rounded-full px-6 py-3 mb-12">
              <span className="text-blue-700 font-semibold">
                Both free at this level — but Forma has more features
              </span>
            </div>
          )}

          <div className="space-y-3">
            <Link href="/signup" className="btn btn-primary text-base px-8 py-3">
              Get Started Free
            </Link>
            <p className="text-sm text-gray-400">No credit card required. Unlimited submissions forever.</p>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-9 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Forma. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
