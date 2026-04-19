'use client';

import { useState, useEffect, useRef } from 'react';

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
    description: 'For side projects, personal use, and kicking the tires.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    icon: 'Lightning',
    features: [
      { text: '3 forms', included: true },
      { text: '100 submissions / mo', included: true },
      { text: 'Basic analytics', included: true },
      { text: 'Email notifications', included: true },
      { text: 'Webhooks', included: false },
      { text: 'Custom branding', included: false },
      { text: 'Team members', included: false },
    ],
    ctaText: 'Start free',
    ctaLink: null,
    popular: false,
    sortOrder: 0,
    active: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    slug: 'pro',
    description: 'For growing teams who need everything. Most popular plan.',
    monthlyPrice: 15,
    yearlyPrice: 12.50,
    icon: 'Crown',
    features: [
      { text: 'Unlimited forms', included: true },
      { text: '10,000 submissions / mo', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'Webhooks & integrations', included: true },
      { text: 'Custom branding', included: true },
      { text: '5 team members', included: true },
      { text: 'API access', included: true },
    ],
    ctaText: 'Start 14-day trial',
    ctaLink: null,
    popular: true,
    sortOrder: 1,
    active: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'For organizations with SSO, compliance, and dedicated-support needs.',
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
    ],
    ctaText: 'Contact sales',
    ctaLink: '/contact',
    popular: false,
    sortOrder: 2,
    active: true,
  },
];

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
);

const ChevronIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);

export default function PricingSection() {
  const [isYearly, setIsYearly] = useState(true);
  const [plans, setPlans] = useState<PricingPlan[]>(defaultPlans);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);

  // Fetch plans from API — preserving existing DB logic
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

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
          }
        });
      },
      { threshold: 0.15 }
    );

    const reveals = sectionRef.current?.querySelectorAll('.reveal');
    reveals?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [loading]);

  // Calculate discount percentage from plans
  const discountPercent = (() => {
    const planWithPrices = plans.find(
      p => p.monthlyPrice && p.yearlyPrice && p.monthlyPrice > 0 && p.yearlyPrice > 0
    );
    if (planWithPrices && planWithPrices.monthlyPrice && planWithPrices.yearlyPrice) {
      return Math.round((1 - planWithPrices.yearlyPrice / planWithPrices.monthlyPrice) * 100);
    }
    return 17;
  })();

  const formatPrice = (plan: PricingPlan) => {
    if (plan.monthlyPrice === null) return null;
    const price = isYearly ? (plan.yearlyPrice ?? plan.monthlyPrice) : plan.monthlyPrice;
    return price === 0 ? '0' : price.toFixed(2).replace(/\.00$/, '');
  };

  const getPriceLabel = (plan: PricingPlan) => {
    if (plan.monthlyPrice === null) return null;
    if (plan.monthlyPrice === 0) return 'forever';
    return '/mo';
  };

  return (
    <section className="pricing-section" id="pricing" ref={sectionRef}>
      <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%' }}>
        <div className="section-head reveal">
          <div className="section-head-left">
            <div className="eyebrow"><span className="dot-pulse" />Pricing</div>
            <h2>Simple,<br/>transparent<br/>pricing<span className="orange-dot">.</span></h2>
          </div>
          <div>
            <p className="section-head-meta" style={{ marginBottom: 12 }}>
              Start free, scale as you grow. No hidden fees, no surprises.
            </p>
            <div className="billing-toggle" role="tablist">
              <button
                className={!isYearly ? 'active' : ''}
                onClick={() => setIsYearly(false)}
              >
                Monthly
              </button>
              <button
                className={isYearly ? 'active' : ''}
                onClick={() => setIsYearly(true)}
              >
                Yearly<span className="save">&minus;{discountPercent}%</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pricing-grid reveal">
          {plans.map((plan) => {
            const price = formatPrice(plan);
            const priceLabel = getPriceLabel(plan);

            return (
              <div key={plan.id} className={`plan-card ${plan.popular ? 'plan-popular' : ''}`}>
                <div className="plan-name">{plan.name}</div>
                {price !== null ? (
                  <div className="plan-price">
                    ${price} <span className="per">{priceLabel}</span>
                    {plan.monthlyPrice !== 0 && <span className="dot-end">.</span>}
                  </div>
                ) : (
                  <div className="plan-price" style={{ fontSize: 56 }}>
                    Custom<span className="dot-end">.</span>
                  </div>
                )}
                <p className="plan-desc">{plan.description}</p>
                <a href={plan.ctaLink || '/signup'} className="plan-cta">
                  {plan.ctaText}
                  <ChevronIcon />
                </a>
                {plan.features.map((feat, i) => (
                  <div key={i} className={`plan-feat ${!feat.included ? 'off' : ''}`}>
                    {feat.included ? <CheckIcon /> : <XIcon />}
                    {feat.text}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
