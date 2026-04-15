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

/**
 * Get the owner's userId for a workspace
 */
async function getWorkspaceOwnerId(workspaceId: string): Promise<string | null> {
  const owner = await prisma.workspaceMember.findFirst({
    where: { workspaceId, role: 'owner' },
    select: { userId: true },
  });
  return owner?.userId || null;
}

export interface SubscriptionInfo {
  plan: PlanType;
  status: string;
  billingInterval: 'monthly' | 'yearly' | null;
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
 * Get or create subscription for a user
 */
export async function getOrCreateUserSubscription(userId: string) {
  let subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: {
        userId,
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
 * Get or create subscription for a workspace (finds owner, gets their subscription)
 * This is the main entry point — everything still works through workspaceId
 */
export async function getOrCreateSubscription(workspaceId: string) {
  // First try user-level subscription (new model)
  const ownerId = await getWorkspaceOwnerId(workspaceId);
  if (ownerId) {
    const userSub = await prisma.subscription.findUnique({
      where: { userId: ownerId },
    });
    if (userSub) return userSub;
  }

  // Fall back to workspace-level subscription (legacy)
  let subscription = await prisma.subscription.findUnique({
    where: { workspaceId },
  });

  if (!subscription && ownerId) {
    // Create user-level subscription
    subscription = await prisma.subscription.create({
      data: {
        userId: ownerId,
        plan: 'free',
        status: 'active',
        submissionsLimit: PLAN_LIMITS.free.submissions,
        formsLimit: PLAN_LIMITS.free.forms,
        membersLimit: PLAN_LIMITS.free.members,
      },
    });
  }

  if (!subscription) {
    // Last resort: create workspace-level (shouldn't happen with proper data)
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
 * Get current month's usage record (still per-workspace)
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
 * Looks up the workspace owner's subscription
 */
export async function getSubscriptionInfo(workspaceId: string): Promise<SubscriptionInfo> {
  const subscription = await getOrCreateSubscription(workspaceId);
  const usage = await getCurrentUsage(workspaceId);

  const [formsCount, membersCount, pendingInviteCount, isAdminWorkspace] = await Promise.all([
    prisma.form.count({ where: { workspaceId } }),
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.invitation.count({
      where: { workspaceId, expiresAt: { gt: new Date() } },
    }),
    hasAdminOwner(workspaceId),
  ]);

  const plan = subscription.plan as PlanType;

  const isTrialing =
    subscription.plan === 'trial' &&
    subscription.trialEndsAt != null &&
    new Date() < subscription.trialEndsAt;

  let effectivePlan: PlanType = (subscription.plan === 'trial' && !isTrialing) ? 'free' : plan;
  if (isAdminWorkspace) {
    effectivePlan = 'pro';
  }
  const effectiveConfig = PLAN_LIMITS[effectivePlan];

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

  const canSubmit = limits.submissions === -1 || currentUsage.submissions < limits.submissions;
  const canCreateForm = limits.forms === -1 || currentUsage.forms < limits.forms;
  const seatsCommitted = membersCount + pendingInviteCount;
  const canInviteMembers =
    effectiveConfig.features.teamMembers &&
    (limits.members === -1 || seatsCommitted < limits.members);

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
 * Start a trial for a user
 */
export async function startTrial(userId: string, days: number = 14) {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + days);

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan: 'trial',
      status: 'trialing',
      trialEndsAt,
      submissionsLimit: PLAN_LIMITS.trial.submissions,
      formsLimit: PLAN_LIMITS.trial.forms,
      membersLimit: PLAN_LIMITS.trial.members,
    },
    create: {
      userId,
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
  userId: string,
  stripeSubscriptionId: string,
  stripePriceId: string,
  currentPeriodEnd: Date
) {
  await prisma.subscription.upsert({
    where: { userId },
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
      userId,
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
 * Downgrade to free plan
 */
export async function downgradeToFreePlan(userId: string) {
  await prisma.subscription.upsert({
    where: { userId },
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
      userId,
      plan: 'free',
      status: 'active',
      submissionsLimit: PLAN_LIMITS.free.submissions,
      formsLimit: PLAN_LIMITS.free.forms,
      membersLimit: PLAN_LIMITS.free.members,
    },
  });
}
