'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, ArrowRight, Lightning, Crown, Buildings, Star, Spinner } from '@phosphor-icons/react';
import Magnetic from '@/components/animations/Magnetic';
import { cn } from '@/lib/utils';
import type { Icon } from '@phosphor-icons/react';

interface Feature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  icon: string;
  popular: boolean;
  ctaText: string;
  ctaLink: string | null;
  features: Feature[];
  sortOrder: number;
  active: boolean;
}

const defaultPlans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    slug: 'starter',
    description: 'Perfect for side projects and personal use',
    monthlyPrice: 0,
    yearlyPrice: 0,
    icon: 'Lightning',
    features: [
      { text: '3 forms', included: true },
      { text: '100 submissions/month', included: true },
      { text: 'Basic analytics', included: true },
      { text: 'Email notifications', included: true },
      { text: 'Community support', included: true },
      { text: 'Webhooks', included: false },
      { text: 'Custom branding', included: false },
      { text: 'Team members', included: false },
    ],
    ctaText: 'Start Free',
    ctaLink: null,
    popular: false,
    sortOrder: 0,
    active: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    slug: 'pro',
    description: 'For growing teams and businesses',
    monthlyPrice: 15,
    yearlyPrice: 12.50,
    icon: 'Crown',
    features: [
      { text: 'Unlimited forms', included: true },
      { text: '10,000 submissions/month', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'Webhooks & integrations', included: true },
      { text: 'Custom branding', included: true },
      { text: '5 team members', included: true },
      { text: 'Priority support', included: true },
      { text: 'API access', included: true },
    ],
    ctaText: 'Start Trial',
    ctaLink: null,
    popular: true,
    sortOrder: 1,
    active: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'For large organizations with custom needs',
    monthlyPrice: null,
    yearlyPrice: null,
    icon: 'Buildings',
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Unlimited submissions', included: true },
      { text: 'Unlimited team members', included: true },
      { text: 'SSO / SAML', included: true },
      { text: 'HIPAA compliance', included: true },
      { text: 'Dedicated support', included: true },
      { text: 'SLA guarantee', included: true },
      { text: 'Custom integrations', included: true },
    ],
    ctaText: 'Contact Sales',
    ctaLink: '/contact',
    popular: false,
    sortOrder: 2,
    active: true,
  },
];

const iconMap: Record<string, Icon> = {
  Lightning,
  Crown,
  Buildings,
  Star,
};

const getIcon = (iconName: string): Icon => {
  return iconMap[iconName] || Lightning;
};

export default function PricingSection() {
  const [isYearly, setIsYearly] = useState(true);
  const [plans, setPlans] = useState<PricingPlan[]>(defaultPlans);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pricing')
      .then(res => res.json())
      .then(data => {
        if (data.plans && data.plans.length > 0) {
          setPlans(data.plans);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const discountPercent = (() => {
    const planWithPrices = plans.find(
      p => p.monthlyPrice && p.yearlyPrice && p.monthlyPrice > 0 && p.yearlyPrice > 0
    );
    if (planWithPrices && planWithPrices.monthlyPrice && planWithPrices.yearlyPrice) {
      return Math.round((1 - planWithPrices.yearlyPrice / planWithPrices.monthlyPrice) * 100);
    }
    return 0;
  })();

  return (
    <section id="pricing" className="relative py-16 sm:py-24 lg:py-32 bg-[#0a0a0a]">
      <div className="relative mx-auto w-full max-w-[1400px] px-4 lg:px-9">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-12 lg:mb-16"
        >
          <div className="inline-flex items-center gap-3 uppercase mb-6 sm:mb-8 justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-safety-orange shadow-[0_0_8px_rgba(239,111,46,0.6)]" />
            <span className="font-mono text-[11px] sm:text-[13px] tracking-[-0.015rem] uppercase text-white/50">
              Pricing
            </span>
          </div>

          <h2 className="font-normal text-[28px] sm:text-[36px] lg:text-[52px] leading-[1.1] tracking-[-0.03em] mb-4 sm:mb-6 text-white">
            Simple, transparent pricing<span className="text-safety-orange">.</span>
          </h2>

          <p className="font-mono text-[14px] sm:text-[15px] text-white/40 max-w-2xl mx-auto mb-8">
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
            <button
              onClick={() => setIsYearly(false)}
              className={cn(
                'px-4 py-2 font-mono text-[12px] sm:text-[13px] uppercase tracking-[-0.015rem] rounded-md transition-all duration-150 whitespace-nowrap',
                !isYearly
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={cn(
                'px-4 py-2 font-mono text-[12px] sm:text-[13px] uppercase tracking-[-0.015rem] rounded-md transition-all duration-150 inline-flex items-center gap-2 whitespace-nowrap',
                isYearly
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              Yearly
              {discountPercent > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-sm bg-safety-orange text-white whitespace-nowrap">
                  save -{discountPercent}%
                </span>
              )}
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size={32} className="animate-spin text-white/30" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
            {plans.map((plan, index) => {
              const IconComponent = getIcon(plan.icon);

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{
                    type: 'spring',
                    stiffness: 100,
                    damping: 20,
                    delay: index * 0.1,
                  }}
                  className="relative"
                >
                  {/* Popular badge */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <div className="px-3 py-1 rounded-full bg-safety-orange text-white font-mono text-[10px] uppercase tracking-wider shadow-[0_0_16px_rgba(239,111,46,0.4)]">
                        Most popular
                      </div>
                    </div>
                  )}

                  <div
                    className={cn(
                      'h-full flex flex-col p-6 lg:p-8 rounded-2xl border transition-all duration-300 relative overflow-hidden',
                      plan.popular
                        ? 'border-safety-orange/30 bg-white/[0.04]'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    )}
                  >
                    {/* Orange gradient top for popular */}
                    {plan.popular && (
                      <div
                        className="absolute top-0 left-0 right-0 h-px"
                        style={{
                          background: 'linear-gradient(90deg, transparent, #ef6f2e, transparent)',
                        }}
                      />
                    )}

                    {/* Header */}
                    <div className="mb-6">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center mb-4',
                          plan.popular ? 'bg-safety-orange/20' : 'bg-white/5'
                        )}
                      >
                        <IconComponent
                          size={22}
                          weight="duotone"
                          className={plan.popular ? 'text-safety-orange' : 'text-white/50'}
                        />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-1">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-white/40 font-mono">{plan.description}</p>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      {plan.monthlyPrice !== null ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-white">
                            ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                          </span>
                          <span className="text-white/30 font-mono text-sm">/month</span>
                        </div>
                      ) : (
                        <div className="text-3xl font-bold text-white">Custom</div>
                      )}
                      {plan.yearlyPrice !== null && plan.yearlyPrice > 0 && isYearly && (
                        <p className="text-sm text-white/30 font-mono mt-1">
                          Billed annually (${plan.yearlyPrice * 12}/year)
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          {feature.included ? (
                            <Check
                              size={16}
                              weight="bold"
                              className="text-safety-orange mt-0.5 flex-shrink-0"
                            />
                          ) : (
                            <X
                              size={16}
                              weight="bold"
                              className="text-white/15 mt-0.5 flex-shrink-0"
                            />
                          )}
                          <span
                            className={cn(
                              'text-sm font-mono',
                              feature.included ? 'text-white/70' : 'text-white/25'
                            )}
                          >
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Magnetic pull={0.1}>
                      <a
                        href={plan.ctaLink || '/signup'}
                        className={cn(
                          'w-full py-3 px-4 rounded-lg font-mono text-[13px] uppercase tracking-[-0.015rem] transition-all duration-200 flex items-center justify-center gap-2',
                          plan.popular
                            ? 'bg-safety-orange text-white hover:bg-[#ee6018]'
                            : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20'
                        )}
                      >
                        {plan.ctaText}
                        <ArrowRight size={14} weight="bold" />
                      </a>
                    </Magnetic>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
