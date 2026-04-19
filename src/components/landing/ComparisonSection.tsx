'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Stack, ArrowRight } from '@phosphor-icons/react';

const SUBMISSION_LEVELS = [100, 500, 1000, 5000, 10000, 25000, 50000, 100000];

const COMPETITORS = [
  {
    id: 'typeform',
    name: 'Typeform',
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
          <div className="inline-flex items-center gap-3 uppercase mb-6 sm:mb-8 justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-safety-orange shadow-[0_0_8px_rgba(239,111,46,0.6)]" />
            <span className="font-mono text-[11px] sm:text-[13px] tracking-[-0.015rem] uppercase text-gray-500">
              Pricing Comparison
            </span>
          </div>

          <h2 className="font-normal text-[28px] sm:text-[36px] lg:text-[52px] leading-[1.1] tracking-[-0.03em] mb-6 text-gray-900">
            Forma vs {competitor.name}<span className="text-safety-orange">.</span>
          </h2>

          {/* Competitor switcher */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit mx-auto mb-6">
            {COMPETITORS.map(c => (
              <button
                key={c.id}
                onClick={() => setCompetitorId(c.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-[12px] sm:text-[13px] font-mono uppercase tracking-[-0.015rem] transition-all ${
                  competitorId === c.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <p className="font-mono text-[14px] sm:text-[15px] text-gray-500 max-w-2xl mx-auto">
            Slide to see how much you could save per month.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-2xl mx-auto"
        >
          {/* Slider */}
          <div className="mb-10 text-center">
            <div className="font-mono text-[12px] uppercase tracking-wider text-gray-400 mb-3">
              Expected submissions per month
            </div>
            <div className="text-[32px] sm:text-[40px] font-semibold text-gray-900 mb-6 tracking-tight">
              {submissions.toLocaleString()}
            </div>
            <style>{`
              .forma-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 999px; background: linear-gradient(to right, #ef6f2e ${(sliderIndex / (SUBMISSION_LEVELS.length - 1)) * 100}%, #e5e7eb ${(sliderIndex / (SUBMISSION_LEVELS.length - 1)) * 100}%); cursor: pointer; outline: none; }
              .forma-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #ef6f2e; border: 3px solid white; box-shadow: 0 1px 6px rgba(0,0,0,0.15); cursor: pointer; transition: transform 0.15s; }
              .forma-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
              .forma-slider::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: #ef6f2e; border: 3px solid white; box-shadow: 0 1px 6px rgba(0,0,0,0.15); cursor: pointer; }
            `}</style>
            <input
              type="range"
              min={0}
              max={SUBMISSION_LEVELS.length - 1}
              value={sliderIndex}
              onChange={(e) => setSliderIndex(parseInt(e.target.value))}
              className="forma-slider"
            />
            <div className="flex justify-between mt-2 font-mono text-[11px] text-gray-400 uppercase">
              <span>100</span>
              <span>100,000</span>
            </div>
          </div>

          {/* Price cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* Forma */}
            <div className="border border-safety-orange/20 rounded-2xl p-6 bg-safety-orange/[0.02]">
              <div className="flex items-center gap-2 mb-5">
                <Stack size={18} weight="fill" className="text-safety-orange" />
                <span className="font-mono text-[13px] uppercase tracking-[-0.015rem] text-gray-900 font-medium">Forma</span>
              </div>
              <div className="text-[36px] sm:text-[48px] font-bold text-gray-900 leading-none mb-1 tracking-tight">
                $0
              </div>
              <p className="font-mono text-[11px] text-gray-400 uppercase tracking-wider mt-3">
                Unlimited submissions
              </p>
            </div>

            {/* Competitor */}
            <div className="border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-[18px] h-[18px] rounded bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                  {competitor.name[0]}
                </span>
                <span className="font-mono text-[13px] uppercase tracking-[-0.015rem] text-gray-900 font-medium">{competitor.name}</span>
              </div>
              <div className="text-[36px] sm:text-[48px] font-bold text-gray-900 leading-none mb-1 tracking-tight">
                ${competitorPrice}
              </div>
              <p className="font-mono text-[11px] text-gray-400 uppercase tracking-wider mt-3">
                {competitorPrice > 0 ? 'per month' : 'also free'}
              </p>
            </div>
          </div>

          {/* Savings */}
          {savings > 0 && (
            <motion.div
              key={savings}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center mb-8 p-4 rounded-xl bg-safety-orange/5 border border-safety-orange/10"
            >
              <p className="font-mono text-[14px] sm:text-[15px] text-gray-700">
                You save <span className="text-safety-orange font-semibold">${savings}/month</span> with Forma
              </p>
            </motion.div>
          )}

          <div className="text-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 font-mono text-[13px] uppercase tracking-[-0.015rem] text-safety-orange hover:text-[#ee6018] transition-colors"
            >
              Get started free
              <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
