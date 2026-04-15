import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin-auth';

/**
 * POST /api/admin/migrate-subscriptions
 * One-time migration: move workspace-level subscriptions to user-level.
 * For each subscription with workspaceId but no userId,
 * find the workspace owner and assign it to them.
 */
export async function POST() {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find all workspace-level subscriptions
    const workspaceSubs = await prisma.subscription.findMany({
      where: {
        workspaceId: { not: null },
        userId: null,
      },
    });

    let migrated = 0;
    let skipped = 0;

    for (const sub of workspaceSubs) {
      if (!sub.workspaceId) continue;

      // Find workspace owner
      const owner = await prisma.workspaceMember.findFirst({
        where: { workspaceId: sub.workspaceId, role: 'owner' },
        select: { userId: true },
      });

      if (!owner) {
        skipped++;
        continue;
      }

      // Check if user already has a subscription
      const existingUserSub = await prisma.subscription.findUnique({
        where: { userId: owner.userId },
      });

      if (existingUserSub) {
        // User already has a subscription — keep the better plan
        if (sub.plan === 'pro' && existingUserSub.plan !== 'pro') {
          await prisma.subscription.update({
            where: { id: existingUserSub.id },
            data: {
              plan: sub.plan,
              status: sub.status,
              stripeSubscriptionId: sub.stripeSubscriptionId,
              stripePriceId: sub.stripePriceId,
              stripeCurrentPeriodEnd: sub.stripeCurrentPeriodEnd,
              submissionsLimit: sub.submissionsLimit,
              formsLimit: sub.formsLimit,
              membersLimit: sub.membersLimit,
            },
          });
        }
        // Delete the old workspace subscription
        await prisma.subscription.delete({ where: { id: sub.id } });
        migrated++;
      } else {
        // Move subscription to user
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            userId: owner.userId,
            workspaceId: null,
          },
        });
        migrated++;
      }
    }

    return NextResponse.json({
      success: true,
      migrated,
      skipped,
      total: workspaceSubs.length,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
