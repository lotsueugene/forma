import { prisma } from './prisma';
import { PLAN_LIMITS, PlanType, PlanFeatures, STRIPE_PRICES, getPlanLimitsFromDB } from './stripe';

/**
 * Check if workspace has an admin owner (admins get Pro features automatically)
 */
async function hasAdminOwner(workspaceId: string): Promise<boolean> {
  const adminOwner = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      role: 'owner',
      user: { role: 'admin' },
    },
  });
  return !!adminOwner;
}

export interface SubscriptionInfo {
  plan: PlanType;
  status: string;
  billingInterval: 'monthly' | 'yearly' | null; // null for free/trial
  limits: {
    submissions: number;
    forms: number;
    members: number;
  };
  features: PlanFeatures;
  usage: {
    submissions: number;
    forms: number;
    members: number;
  };
  isTrialing: boolean;
  trialEndsAt: Date | null;
  canInviteMembers: boolean;
  canAccessAnalytics: boolean;
  canCreateForm: boolean;
  canSubmit: boolean;
}

/**
 * Get or create subscription for a workspace
 */
export async function getOrCreateSubscription(workspaceId: string) {
  let subscription = await prisma.subscription.findUnique({
    where: { workspaceId },
  });

  if (!subscription) {
    // Create free subscription by default
    subscription = await prisma.subscription.create({
      data: {
        workspaceId,
        plan: 'free',
        status: 'active',
        submissionsLimit: PLAN_LIMITS.free.submissions,
        formsLimit: PLAN_LIMITS.free.forms,
        membersLimit: PLAN_LIMITS.free.members,
      },
    });
  }

  return subscription;
}

/**
 * Get current month's usage record
 */
export async function getCurrentUsage(workspaceId: string) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let usage = await prisma.usageRecord.findUnique({
    where: {
      workspaceId_periodStart: {
        workspaceId,
        periodStart,
      },
    },
  });

  if (!usage) {
    usage = await prisma.usageRecord.create({
      data: {
        workspaceId,
        periodStart,
        periodEnd,
        submissions: 0,
      },
    });
  }

  return usage;
}

/**
 * Increment submission count for the current month
 */
export async function incrementSubmissionCount(workspaceId: string) {
  const usage = await getCurrentUsage(workspaceId);

  await prisma.usageRecord.update({
    where: { id: usage.id },
    data: { submissions: { increment: 1 } },
  });
}

/**
 * Get full subscription info with usage and limits
 */
export async function getSubscriptionInfo(workspaceId: string): Promise<SubscriptionInfo> {
  const subscription = await getOrCreateSubscription(workspaceId);
  const usage = await getCurrentUsage(workspaceId);

  // Get actual counts (pending invites count toward seat usage for team invites)
  const [formsCount, membersCount, pendingInviteCount, isAdminWorkspace] = await Promise.all([
    prisma.form.count({ where: { workspaceId } }),
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.invitation.count({
      where: { workspaceId, expiresAt: { gt: new Date() } },
    }),
    hasAdminOwner(workspaceId),
  ]);

  const plan = subscription.plan as PlanType;

  // Check if trial is active (expired trials are treated as free below)
  const isTrialing =
    subscription.plan === 'trial' &&
    subscription.trialEndsAt != null &&
    new Date() < subscription.trialEndsAt;

  // If trial expired, treat as free; admins always get Pro features
  let effectivePlan: PlanType = (subscription.plan === 'trial' && !isTrialing) ? 'free' : plan;
  if (isAdminWorkspace) {
    effectivePlan = 'pro'; // Admins always get Pro features
  }
  const effectiveConfig = PLAN_LIMITS[effectivePlan];

  // Get limits from database (single source of truth)
  const dbLimits = await getPlanLimitsFromDB(effectivePlan);
  const limits = {
    submissions: dbLimits.submissions,
    forms: dbLimits.forms,
    members: dbLimits.members,
  };

  const currentUsage = {
    submissions: usage.submissions,
    forms: formsCount,
    members: membersCount,
  };

  // Check if can do things
  const canSubmit = limits.submissions === -1 || currentUsage.submissions < limits.submissions;
  const canCreateForm = limits.forms === -1 || currentUsage.forms < limits.forms;
  const seatsCommitted = membersCount + pendingInviteCount;
  const canInviteMembers =
    effectiveConfig.features.teamMembers &&
    (limits.members === -1 || seatsCommitted < limits.members);

  // Determine billing interval from Stripe price ID
  let billingInterval: 'monthly' | 'yearly' | null = null;
  if (subscription.stripePriceId) {
    if (subscription.stripePriceId === STRIPE_PRICES.pro_monthly) {
      billingInterval = 'monthly';
    } else if (subscription.stripePriceId === STRIPE_PRICES.pro_yearly) {
      billingInterval = 'yearly';
    }
  }

  return {
    plan: effectivePlan,
    status: subscription.status,
    billingInterval,
    limits,
    features: effectiveConfig.features,
    usage: currentUsage,
    isTrialing,
    trialEndsAt: subscription.trialEndsAt,
    canInviteMembers,
    canAccessAnalytics: effectiveConfig.features.analytics,
    canCreateForm,
    canSubmit,
  };
}

/**
 * Check if workspace can perform an action
 */
export async function checkLimit(
  workspaceId: string,
  action: 'submit' | 'createForm' | 'inviteMember'
): Promise<{ allowed: boolean; reason?: string }> {
  const info = await getSubscriptionInfo(workspaceId);

  switch (action) {
    case 'submit':
      if (!info.canSubmit) {
        return {
          allowed: false,
          reason: `Monthly submission limit reached (${info.limits.submissions}). Upgrade to Pro for unlimited submissions.`,
        };
      }
      break;

    case 'createForm':
      if (!info.canCreateForm) {
        return {
          allowed: false,
          reason: `Form limit reached (${info.limits.forms}). Upgrade to Pro for unlimited forms.`,
        };
      }
      break;

    case 'inviteMember':
      if (!info.features.teamMembers) {
        return {
          allowed: false,
          reason: 'Team members require a Pro subscription. Upgrade to invite team members.',
        };
      }
      if (info.limits.members !== -1) {
        const pendingInvites = await prisma.invitation.count({
          where: { workspaceId, expiresAt: { gt: new Date() } },
        });
        const seatsCommitted = info.usage.members + pendingInvites;
        if (seatsCommitted >= info.limits.members) {
          return {
            allowed: false,
            reason: `Team member limit reached (${info.limits.members} seats, including pending invites). Upgrade for more seats.`,
          };
        }
      }
      break;
  }

  return { allowed: true };
}

/**
 * Start a trial for a workspace
 */
export async function startTrial(workspaceId: string, days: number = 14) {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + days);

  await prisma.subscription.upsert({
    where: { workspaceId },
    update: {
      plan: 'trial',
      status: 'trialing',
      trialEndsAt,
      submissionsLimit: PLAN_LIMITS.trial.submissions,
      formsLimit: PLAN_LIMITS.trial.forms,
      membersLimit: PLAN_LIMITS.trial.members,
    },
    create: {
      workspaceId,
      plan: 'trial',
      status: 'trialing',
      trialEndsAt,
      submissionsLimit: PLAN_LIMITS.trial.submissions,
      formsLimit: PLAN_LIMITS.trial.forms,
      membersLimit: PLAN_LIMITS.trial.members,
    },
  });
}

/**
 * Upgrade to pro plan (called after successful Stripe payment)
 */
export async function upgradeToProPlan(
  workspaceId: string,
  stripeSubscriptionId: string,
  stripePriceId: string,
  currentPeriodEnd: Date
) {
  await prisma.subscription.upsert({
    where: { workspaceId },
    update: {
      plan: 'pro',
      status: 'active',
      stripeSubscriptionId,
      stripePriceId,
      stripeCurrentPeriodEnd: currentPeriodEnd,
      submissionsLimit: PLAN_LIMITS.pro.submissions,
      formsLimit: PLAN_LIMITS.pro.forms,
      membersLimit: PLAN_LIMITS.pro.members,
      trialEndsAt: null,
    },
    create: {
      workspaceId,
      plan: 'pro',
      status: 'active',
      stripeSubscriptionId,
      stripePriceId,
      stripeCurrentPeriodEnd: currentPeriodEnd,
      submissionsLimit: PLAN_LIMITS.pro.submissions,
      formsLimit: PLAN_LIMITS.pro.forms,
      membersLimit: PLAN_LIMITS.pro.members,
    },
  });
}

/**
 * Downgrade to free plan (called when subscription canceled)
 */
export async function downgradeToFreePlan(workspaceId: string) {
  await prisma.subscription.upsert({
    where: { workspaceId },
    update: {
      plan: 'free',
      status: 'active',
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
      submissionsLimit: PLAN_LIMITS.free.submissions,
      formsLimit: PLAN_LIMITS.free.forms,
      membersLimit: PLAN_LIMITS.free.members,
    },
    create: {
      workspaceId,
      plan: 'free',
      status: 'active',
      submissionsLimit: PLAN_LIMITS.free.submissions,
      formsLimit: PLAN_LIMITS.free.forms,
      membersLimit: PLAN_LIMITS.free.members,
    },
  });
}
