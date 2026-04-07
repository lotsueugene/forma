'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Stack } from '@phosphor-icons/react';

const SUBMISSION_LEVELS = [100, 500, 1000, 5000, 10000, 25000, 50000, 100000];

const COMPETITORS = [
  {
    id: 'typeform',
    name: 'Typeform',
    logo: (
      <img src="https://images.ctfassets.net/co0pvta7hzrh/E1MiFAPdfhZrWqaMKi0C2/d7da6e8a9e34b47fd0c7a9d2b4afbe39/favicon-32x32.png" alt="Typeform" width={18} height={18} className="rounded" />
    ),
    pricing: [
      { threshold: 0, price: 29 },
      { threshold: 1000, price: 59 },
      { threshold: 10000, price: 99 },
      { threshold: 50000, price: 499 },
    ],
  },
  {
    id: 'jotform',
    name: 'Jotform',
    logo: (
      <img src="https://www.jotform.com/favicon-32x32.png" alt="Jotform" width={18} height={18} className="rounded" />
    ),
    pricing: [
      { threshold: 0, price: 0 },
      { threshold: 100, price: 39 },
      { threshold: 1000, price: 49 },
      { threshold: 10000, price: 129 },
    ],
  },
  {
    id: 'tally',
    name: 'Tally',
    logo: (
      <img src="https://tally.so/favicon.ico" alt="Tally" width={18} height={18} className="rounded" />
    ),
    pricing: [
      { threshold: 0, price: 0 },
      { threshold: 50000, price: 29 },
    ],
  },
];

function getPrice(pricing: Array<{ threshold: number; price: number }>, submissions: number): number {
  let price = pricing[0].price;
  for (const tier of pricing) {
    if (submissions >= tier.threshold) price = tier.price;
  }
  return price;
}

export default function ComparisonSection() {
  const [sliderIndex, setSliderIndex] = useState(2);
  const [competitorId, setCompetitorId] = useState('typeform');
  const submissions = SUBMISSION_LEVELS[sliderIndex];
  const competitor = COMPETITORS.find(c => c.id === competitorId) || COMPETITORS[0];
  const competitorPrice = getPrice(competitor.pricing, submissions);
  const savings = competitorPrice;

  return (
    <section className="relative py-16 sm:py-24 lg:py-32 bg-white">
      <div className="mx-auto w-full max-w-[1400px] px-4 lg:px-9">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 sm:mb-16 text-center"
        >
          <div className="text-pretty font-mono text-[15px] leading-[100%] tracking-[-0.0175rem] inline-flex items-center gap-3 uppercase mb-6 sm:mb-8 justify-center">
            <div className="size-2.5 transform-gpu rounded-full border bg-safety-orange border-transparent shadow-[0_0_8px_rgba(255,77,0,0.6)]" />
            <p className="whitespace-nowrap text-gray-700 text-pretty font-mono text-[11px] sm:text-[13px] leading-[100%] tracking-[-0.015rem] uppercase">
              Pricing Comparison
            </p>
          </div>

          <h2 className="font-normal text-[26px] sm:text-[32px] leading-[110%] tracking-[-0.06rem] lg:text-[48px] lg:tracking-[-0.12rem] mb-4 sm:mb-6 text-gray-900">
            Forma vs {competitor.name}<span className="text-safety-orange">.</span>
          </h2>

          {/* Competitor switcher */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit mx-auto mb-6">
            {COMPETITORS.map(c => (
              <button
                key={c.id}
                onClick={() => setCompetitorId(c.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-mono uppercase tracking-[-0.015rem] transition-all ${
                  competitorId === c.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {c.logo}
                {c.name}
              </button>
            ))}
          </div>

          <p className="font-mono text-[14px] sm:text-[16px] leading-[140%] tracking-[-0.02rem] lg:text-[18px] text-gray-700 max-w-2xl">
            How much do you expect to spend per month?
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-2xl mx-auto text-center"
        >
          {/* Slider */}
          <div className="mb-10">
            <div className="font-mono text-[13px] uppercase tracking-[-0.015rem] text-gray-500 mb-3">
              Expected submissions per month
            </div>
            <div className="text-[28px] sm:text-[36px] font-semibold text-gray-900 mb-6">
              {submissions.toLocaleString()}
            </div>
            <input
              type="range"
              min={0}
              max={SUBMISSION_LEVELS.length - 1}
              value={sliderIndex}
              onChange={(e) => setSliderIndex(parseInt(e.target.value))}
              className="w-full accent-safety-orange h-1.5 rounded-full appearance-none bg-gray-200 cursor-pointer"
            />
            <div className="flex justify-between mt-2 font-mono text-[11px] text-gray-400 uppercase">
              <span>100</span>
              <span>100,000</span>
            </div>
          </div>

          {/* Price cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* Forma */}
            <div className="border border-safety-orange/30 rounded-xl p-6 bg-safety-orange/[0.03]">
              <div className="flex items-center gap-2 mb-4">
                <Stack size={18} weight="fill" className="text-safety-orange" />
                <span className="font-mono text-[13px] uppercase tracking-[-0.015rem] text-gray-900">Forma</span>
              </div>
              <div className="text-[36px] sm:text-[48px] font-semibold text-gray-900 leading-none mb-2">
                $0
              </div>
              <div className="text-[24px] mb-3">🥳</div>
              <p className="font-mono text-[11px] text-gray-500 uppercase tracking-[-0.015rem]">
                Unlimited submissions
              </p>
            </div>

            {/* Competitor */}
            <div className="border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                {competitor.logo}
                <span className="font-mono text-[13px] uppercase tracking-[-0.015rem] text-gray-900">{competitor.name}</span>
              </div>
              <div className="text-[36px] sm:text-[48px] font-semibold text-gray-900 leading-none mb-2">
                ${competitorPrice}
              </div>
              <div className="text-[24px] mb-3">{competitorPrice > 0 ? '😭' : '🤝'}</div>
              <p className="font-mono text-[11px] text-gray-500 uppercase tracking-[-0.015rem]">
                {competitorPrice > 0 ? 'per month' : 'also free'}
              </p>
            </div>
          </div>

          {/* Savings */}
          {savings > 0 && (
            <p className="font-mono text-[14px] sm:text-[16px] text-gray-700 mb-8">
              You save <span className="text-safety-orange font-semibold">${savings}/month</span> with Forma.
            </p>
          )}

          <Link
            href="/signup"
            className="inline-flex items-center gap-2 font-mono text-[13px] uppercase tracking-[-0.015rem] text-safety-orange hover:text-accent-200 transition-colors"
          >
            Get started free →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
