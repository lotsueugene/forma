import { NextResponse } from 'next/server';
import { getSubscriptionInfo, type SubscriptionInfo } from './subscription';
import type { PlanFeatures } from './stripe';

/**
 * Check if a workspace has access to a specific feature.
 * Returns null if allowed, or a NextResponse error if not.
 *
 * Usage in API routes:
 *   const denied = await requireFeature(workspaceId, 'analytics');
 *   if (denied) return denied;
 */
export async function requireFeature(
  workspaceId: string,
  feature: keyof PlanFeatures
): Promise<NextResponse | null> {
  const info = await getSubscriptionInfo(workspaceId);

  if (!info.features[feature]) {
    return NextResponse.json(
      { error: `This feature requires a Pro subscription.` },
      { status: 402 }
    );
  }

  return null;
}

/**
 * Get subscription info and return error if workspace can't perform action.
 * Returns the subscription info if allowed, or a NextResponse error.
 */
export async function requireAction(
  workspaceId: string,
  action: 'submit' | 'createForm' | 'inviteMember'
): Promise<{ info: SubscriptionInfo } | NextResponse> {
  const { checkLimit } = await import('./subscription');
  const result = await checkLimit(workspaceId, action);

  if (!result.allowed) {
    return NextResponse.json(
      { error: result.reason },
      { status: 402 }
    );
  }

  const info = await getSubscriptionInfo(workspaceId);
  return { info };
}
