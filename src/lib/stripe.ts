import Stripe from 'stripe';

// Only initialize Stripe if the secret key is set
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia',
      typescript: true,
    })
  : null;

// Price IDs for plans (set these in your .env file after creating products in Stripe)
export const STRIPE_PRICES = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
  pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
};

// Plan limits configuration
export const PLAN_LIMITS = {
  free: {
    submissions: 50,
    forms: 3,
    members: 1, // owner only
    features: {
      analytics: false,
      teamMembers: false,
      apiAccess: true,
      customDomain: false,
      webhooks: false,
      integrations: false,
      emailNotifications: false,
      spamProtection: true, // Basic (honeypot only)
    },
  },
  trial: {
    submissions: -1, // unlimited
    forms: -1, // unlimited
    members: 10,
    features: {
      analytics: true,
      teamMembers: true,
      apiAccess: true,
      customDomain: false,
      webhooks: true,
      integrations: true,
      emailNotifications: true,
      spamProtection: true, // Full (honeypot + rate limit + reCAPTCHA)
    },
  },
  pro: {
    submissions: -1, // unlimited
    forms: -1, // unlimited
    members: -1, // unlimited
    features: {
      analytics: true,
      teamMembers: true,
      apiAccess: true,
      customDomain: true,
      webhooks: true,
      integrations: true,
      emailNotifications: true,
      spamProtection: true,
    },
  },
};

export type PlanType = keyof typeof PLAN_LIMITS;
export type PlanFeatures = typeof PLAN_LIMITS.free.features;
