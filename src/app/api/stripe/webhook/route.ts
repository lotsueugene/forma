import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { upgradeToProPlan, downgradeToFreePlan, incrementSubmissionCount } from '@/lib/subscription';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { publishToUser } from '@/lib/notifications/pubsub';
import { deliverSubmissionCreatedWebhook } from '@/lib/webhooks';
import { deliverToIntegrations } from '@/lib/integrations';

// This needs to be exported for Next.js to handle raw body
export const runtime = 'nodejs';

/** Billing period end (Stripe 2026+ exposes this on subscription items, not the subscription root). */
function subscriptionPeriodEndUnix(subscription: Stripe.Subscription): number {
  const end = subscription.items.data[0]?.current_period_end;
  if (end != null) {
    return end;
  }
  throw new Error('Stripe subscription missing item current_period_end');
}

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspaceId;

        // Handle form payment completion — create submission after successful payment
        if (session.metadata?.formId && session.metadata?.formData && session.mode === 'payment') {
          try {
            const formId = session.metadata.formId;
            const formData = JSON.parse(session.metadata.formData);
            const submissionMetadata = session.metadata.submissionMetadata
              ? JSON.parse(session.metadata.submissionMetadata)
              : {};

            // Add payment info to metadata
            submissionMetadata.payment = {
              status: 'paid',
              amount: session.amount_total ? session.amount_total / 100 : 0,
              currency: session.currency,
              stripeSessionId: session.id,
              paidAt: new Date().toISOString(),
            };

            const submission = await prisma.submission.create({
              data: {
                formId,
                data: JSON.stringify(formData),
                metadata: JSON.stringify(submissionMetadata),
              },
            });

            // Get form for workspace info and notifications
            const form = await prisma.form.findUnique({
              where: { id: formId },
              select: { name: true, workspaceId: true },
            });

            // Increment usage counter
            if (form) {
              await incrementSubmissionCount(form.workspaceId);
            }

            if (form) {
              // Deliver webhooks
              deliverSubmissionCreatedWebhook({
                event: 'submission.created',
                data: {
                  submissionId: submission.id,
                  formId,
                  formName: form.name,
                  workspaceId: form.workspaceId,
                  submittedAt: submission.createdAt.toISOString(),
                  submission: formData,
                  metadata: submissionMetadata,
                },
              }).catch((err) => console.error('Webhook delivery error:', err));

              // Deliver to integrations
              deliverToIntegrations({
                submissionId: submission.id,
                formId,
                formName: form.name,
                workspaceId: form.workspaceId,
                submittedAt: submission.createdAt.toISOString(),
                data: formData,
                metadata: submissionMetadata,
              }).catch((err) => console.error('Integration delivery error:', err));
            }

            console.log(`Payment submission created: ${submission.id} for form ${formId}`);
          } catch (err) {
            console.error('Error creating paid submission:', err);
          }
          break;
        }

        if (workspaceId && session.subscription) {
          // Find the workspace owner's userId
          const wsOwner = await prisma.workspaceMember.findFirst({
            where: { workspaceId, role: 'owner' },
            select: { userId: true },
          });

          if (wsOwner) {
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription as string
            );

            await upgradeToProPlan(
              wsOwner.userId,
              subscription.id,
              subscription.items.data[0].price.id,
              new Date(subscriptionPeriodEndUnix(subscription) * 1000)
            );
          }

          // In-app notification to admins/owners
          try {
            const members = await prisma.workspaceMember.findMany({
              where: { workspaceId, role: { in: ['owner', 'manager'] } },
              select: {
                userId: true,
                user: {
                  select: { settings: { select: { notifyBilling: true } } },
                },
              },
            });
            const recipientIds = members
              .filter((m) => m.user.settings?.notifyBilling !== false)
              .map((m) => m.userId);

            if (recipientIds.length > 0) {
              await prisma.notification.createMany({
                data: recipientIds.map((userId) => ({
                  userId,
                  workspaceId,
                  type: 'billing',
                  title: 'Upgraded to Pro',
                  body: 'Your subscription is now active.',
                  href: '/dashboard/settings?tab=billing',
                })),
              });
              for (const userId of recipientIds) {
                publishToUser(userId, { type: 'billing', workspaceId });
              }
            }
          } catch (notifyErr) {
            console.error('Error creating billing notifications:', notifyErr);
          }

          console.log(`Upgraded workspace ${workspaceId} to Pro`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const workspaceId = subscription.metadata?.workspaceId;

        if (workspaceId) {
          const wsOwner = await prisma.workspaceMember.findFirst({
            where: { workspaceId, role: 'owner' },
            select: { userId: true },
          });
          const ownerUserId = wsOwner?.userId;

          if (ownerUserId && subscription.status === 'active') {
            await upgradeToProPlan(
              ownerUserId,
              subscription.id,
              subscription.items.data[0].price.id,
              new Date(subscriptionPeriodEndUnix(subscription) * 1000)
            );
          } else if (ownerUserId && (subscription.status === 'canceled' || subscription.status === 'unpaid')) {
            await downgradeToFreePlan(ownerUserId);

            try {
              const members = await prisma.workspaceMember.findMany({
                where: { workspaceId, role: { in: ['owner', 'manager'] } },
                select: {
                  userId: true,
                  user: {
                    select: { settings: { select: { notifyBilling: true } } },
                  },
                },
              });
              const recipientIds = members
                .filter((m) => m.user.settings?.notifyBilling !== false)
                .map((m) => m.userId);

              if (recipientIds.length > 0) {
                await prisma.notification.createMany({
                  data: recipientIds.map((userId) => ({
                    userId,
                    workspaceId,
                    type: 'billing',
                    title: 'Subscription downgraded',
                    body: 'Your workspace is now on the Free plan.',
                    href: '/dashboard/settings?tab=billing',
                  })),
                });
                for (const userId of recipientIds) {
                  publishToUser(userId, { type: 'billing', workspaceId });
                }
              }
            } catch (notifyErr) {
              console.error('Error creating billing notifications:', notifyErr);
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const workspaceId = subscription.metadata?.workspaceId;

        if (workspaceId) {
          const wsOwner = await prisma.workspaceMember.findFirst({
            where: { workspaceId, role: 'owner' },
            select: { userId: true },
          });
          if (wsOwner) await downgradeToFreePlan(wsOwner.userId);

          try {
            const members = await prisma.workspaceMember.findMany({
              where: { workspaceId, role: { in: ['owner', 'manager'] } },
              select: {
                userId: true,
                user: {
                  select: { settings: { select: { notifyBilling: true } } },
                },
              },
            });
            const recipientIds = members
              .filter((m) => m.user.settings?.notifyBilling !== false)
              .map((m) => m.userId);

            if (recipientIds.length > 0) {
              await prisma.notification.createMany({
                data: recipientIds.map((userId) => ({
                  userId,
                  workspaceId,
                  type: 'billing',
                  title: 'Subscription canceled',
                  body: 'Your workspace is now on the Free plan.',
                  href: '/dashboard/settings?tab=billing',
                })),
              });
              for (const userId of recipientIds) {
                publishToUser(userId, { type: 'billing', workspaceId });
              }
            }
          } catch (notifyErr) {
            console.error('Error creating billing notifications:', notifyErr);
          }

          console.log(`Downgraded workspace ${workspaceId} to Free`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // Could send email notification here
        console.log(`Payment failed for invoice ${invoice.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
