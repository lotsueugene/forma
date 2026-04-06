import Stripe from 'stripe';
import { prisma } from './prisma';

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
      payments: false,
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
      payments: false,
    },
  },
  pro: {
    submissions: 10000, // 10,000/month (matches PricingPlan DB)
    forms: -1, // unlimited
    members: 5, // 5 team members (matches PricingPlan DB)
    features: {
      analytics: true,
      teamMembers: true,
      apiAccess: true,
      customDomain: true,
      webhooks: true,
      integrations: true,
      emailNotifications: true,
      spamProtection: true,
      payments: true,
    },
  },
};

export type PlanType = keyof typeof PLAN_LIMITS;
export type PlanFeatures = typeof PLAN_LIMITS.free.features;

// Platform fee percentage — read from SiteSetting, cached for 60 seconds
let cachedFee: { value: number; fetchedAt: number } | null = null;

export async function getPlatformFeePercentage(): Promise<number> {
  if (cachedFee && Date.now() - cachedFee.fetchedAt < 60_000) {
    return cachedFee.value;
  }
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: 'platform_fee_percentage' },
    });
    const value = setting ? parseFloat(setting.value) : 5;
    cachedFee = { value, fetchedAt: Date.now() };
    return value;
  } catch {
    return 5; // default 5%
  }
}

// Map plan types to PricingPlan slugs
const PLAN_TO_SLUG: Record<PlanType, string> = {
  free: 'starter',
  trial: 'pro', // trial uses pro limits
  pro: 'pro',
};

// Cache for plan limits (refreshed every 5 minutes)
let planLimitsCache: Record<string, { submissions: number; forms: number; members: number }> | null = null;
let planLimitsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get plan limits from database (with caching)
 * Falls back to hardcoded PLAN_LIMITS if DB unavailable
 */
export async function getPlanLimitsFromDB(planType: PlanType): Promise<{
  submissions: number;
  forms: number;
  members: number;
}> {
  const now = Date.now();

  // Refresh cache if expired
  if (!planLimitsCache || now - planLimitsCacheTime > CACHE_TTL) {
    try {
      const plans = await prisma.pricingPlan.findMany({
        where: { active: true },
        select: {
          slug: true,
          submissionsLimit: true,
          formsLimit: true,
          membersLimit: true,
        },
      });

      planLimitsCache = {};
      for (const plan of plans) {
        planLimitsCache[plan.slug] = {
          submissions: plan.submissionsLimit,
          forms: plan.formsLimit,
          members: plan.membersLimit,
        };
      }
      planLimitsCacheTime = now;
    } catch (error) {
      console.error('Failed to fetch plan limits from DB, using defaults:', error);
      // Fall back to hardcoded limits
      return {
        submissions: PLAN_LIMITS[planType].submissions,
        forms: PLAN_LIMITS[planType].forms,
        members: PLAN_LIMITS[planType].members,
      };
    }
  }

  const slug = PLAN_TO_SLUG[planType];
  const dbLimits = planLimitsCache?.[slug];

  if (dbLimits) {
    return dbLimits;
  }

  // Fall back to hardcoded limits
  return {
    submissions: PLAN_LIMITS[planType].submissions,
    forms: PLAN_LIMITS[planType].forms,
    members: PLAN_LIMITS[planType].members,
  };
}
