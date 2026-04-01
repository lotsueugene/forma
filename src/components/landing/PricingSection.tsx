'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Lightning, Crown, Buildings, ArrowRight, Star, Spinner } from '@phosphor-icons/react';
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

// Default plans as fallback (should match database seed)
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

  // Calculate discount percentage from plans that have both monthly and yearly prices
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
    <section id="pricing" className="relative py-24 lg:py-32 bg-white">
      <div className="relative mx-auto w-full max-w-[1400px] px-4 lg:px-9">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 lg:mb-16"
        >
          {/* Status Badge */}
          <div className="text-pretty font-mono text-[15px] leading-[100%] tracking-[-0.0175rem] inline-flex items-center gap-3 uppercase mb-8 justify-center">
            <div className="size-2.5 transform-gpu rounded-full border bg-safety-orange border-transparent shadow-[0_0_8px_rgba(255,77,0,0.6)]" />
            <p className="whitespace-nowrap text-gray-700 text-pretty font-mono text-[13px] leading-[100%] tracking-[-0.015rem] uppercase">
              Pricing
            </p>
          </div>

          <h2
            className="font-normal text-[32px] leading-[100%] tracking-[-0.08rem] lg:text-[48px] lg:tracking-[-0.12rem] mb-6 text-gray-900"
          >
            Simple, transparent pricing<span className="text-safety-orange">.</span>
          </h2>

          <p className="font-mono text-[16px] leading-[140%] tracking-[-0.02rem] lg:text-[18px] text-gray-700 max-w-2xl mx-auto mb-8">
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-gray-100 border border-gray-200 flex-nowrap">
            <button
              onClick={() => setIsYearly(false)}
              className={cn(
                'px-4 py-2 font-mono text-[13px] uppercase tracking-[-0.015rem] rounded-md transition-all duration-150 whitespace-nowrap',
                !isYearly
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={cn(
                'px-4 py-2 font-mono text-[13px] uppercase tracking-[-0.015rem] rounded-md transition-all duration-150 inline-flex items-center gap-2 whitespace-nowrap',
                isYearly
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              )}
            >
              Yearly
              {discountPercent > 0 && (
                <span
                  className={cn(
                    'text-[11px] px-2 py-0.5 rounded-sm whitespace-nowrap',
                    isYearly
                      ? 'bg-safety-orange text-white'
                      : 'bg-safety-orange/20 text-safety-orange'
                  )}
                >
                  -{discountPercent}%
                </span>
              )}
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size={32} className="animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
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
                  className={cn('relative', plan.popular && 'lg:-mt-4 lg:mb-4')}
                >
                  {/* Popular badge */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <div className="px-3 py-1 rounded-sm bg-safety-orange text-white font-mono text-[11px] uppercase tracking-wider shadow-[0_0_8px_rgba(255,77,0,0.5)]">
                        Most Popular
                      </div>
                    </div>
                  )}

                  <div
                    className={cn(
                      'h-full flex flex-col p-6 lg:p-8 rounded-xl border transition-all duration-300',
                      plan.popular
                        ? 'bg-white border-safety-orange/30 shadow-[0_0_40px_rgba(239,111,46,0.1)]'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg'
                    )}
                  >
                    {/* Header */}
                    <div className="mb-6">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center mb-4',
                          plan.popular ? 'bg-safety-orange/20' : 'bg-gray-100'
                        )}
                      >
                        <IconComponent
                          size={22}
                          weight="duotone"
                          className={plan.popular ? 'text-safety-orange' : 'text-gray-700'}
                        />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-gray-700 font-mono">{plan.description}</p>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      {plan.monthlyPrice !== null ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-gray-900">
                            ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                          </span>
                          <span className="text-gray-500 font-mono text-sm">/month</span>
                        </div>
                      ) : (
                        <div className="text-3xl font-bold text-gray-900">Custom</div>
                      )}
                      {plan.yearlyPrice !== null && plan.yearlyPrice > 0 && isYearly && (
                        <p className="text-sm text-gray-500 font-mono mt-1">
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
                              size={18}
                              weight="bold"
                              className="text-safety-orange mt-0.5 flex-shrink-0"
                            />
                          ) : (
                            <X
                              size={18}
                              weight="bold"
                              className="text-gray-300 mt-0.5 flex-shrink-0"
                            />
                          )}
                          <span
                            className={cn(
                              'text-sm font-mono',
                              feature.included ? 'text-gray-700' : 'text-gray-500'
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
                        className="w-full py-3 px-4 rounded-sm font-mono text-[13px] uppercase tracking-[-0.015rem] transition-all duration-150 flex items-center justify-center gap-2 bg-safety-orange text-white hover:bg-accent-200 border border-transparent"
                      >
                        {plan.ctaText}
                        <ArrowRight size={16} weight="bold" />
                      </a>
                    </Magnetic>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Enterprise callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-900 font-medium text-lg mb-2">
            Need help?
          </p>
          <p className="text-gray-600 text-sm mb-4">
            Can't find what you're looking for? Reach out to our support team.
          </p>
          <Magnetic pull={0.1}>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-sm font-mono text-[13px] uppercase tracking-[-0.015rem] bg-safety-orange text-white hover:bg-accent-200 transition-all duration-150"
            >
              Contact Support
              <ArrowRight size={16} weight="bold" />
            </a>
          </Magnetic>
        </motion.div>
      </div>
    </section>
  );
}
