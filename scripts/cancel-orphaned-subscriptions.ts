/**
 * cancel-orphaned-subscriptions.ts
 *
 * One-off remediation for the bug where deleting a user account did
 * not cancel the matching Stripe subscription, so deleted users kept
 * getting charged.
 *
 * Finds local Subscription rows that:
 *   - have a stripeSubscriptionId
 *   - are NOT already marked canceled locally
 *   - have BOTH userId and workspaceId set to NULL (i.e. the user and
 *     their owned workspace(s) have been deleted)
 *
 * For each, it cancels the subscription in Stripe (immediate, no
 * end-of-period) and marks the local row as canceled so it stops
 * showing up as "active" in metrics.
 *
 * Usage (dry run):
 *   npx tsx scripts/cancel-orphaned-subscriptions.ts
 *
 * Usage (apply):
 *   npx tsx scripts/cancel-orphaned-subscriptions.ts --apply
 *
 * Usage (apply + refund the most recent invoice on each canceled sub):
 *   npx tsx scripts/cancel-orphaned-subscriptions.ts --apply --refund-last
 *
 * STRIPE_SECRET_KEY must be set in the environment (the script reads
 * the same .env that the app does).
 */

import 'dotenv/config';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const apply = process.argv.includes('--apply');
const refundLast = process.argv.includes('--refund-last');

const prisma = new PrismaClient();

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is not set. Aborting.');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-03-25.dahlia',
  typescript: true,
});

async function main() {
  console.log(apply ? 'APPLY MODE — will mutate Stripe and DB' : 'DRY RUN — no changes will be made');
  if (refundLast) console.log('REFUND-LAST MODE — will refund the most recent invoice on each canceled subscription');

  const orphans = await prisma.subscription.findMany({
    where: {
      userId: null,
      workspaceId: null,
      stripeSubscriptionId: { not: null },
      NOT: { status: 'canceled' },
    },
    select: {
      id: true,
      stripeSubscriptionId: true,
      status: true,
      plan: true,
      stripeCurrentPeriodEnd: true,
      updatedAt: true,
    },
  });

  if (orphans.length === 0) {
    console.log('No orphaned subscriptions found.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${orphans.length} orphaned subscription(s):`);
  for (const o of orphans) {
    console.log(
      `  - local=${o.id}  stripe=${o.stripeSubscriptionId}  status=${o.status}  plan=${o.plan}  periodEnd=${o.stripeCurrentPeriodEnd?.toISOString() ?? 'n/a'}`
    );
  }

  if (!apply) {
    console.log('\nRe-run with --apply to actually cancel these.');
    await prisma.$disconnect();
    return;
  }

  for (const o of orphans) {
    const sid = o.stripeSubscriptionId!;
    try {
      const stripeSub = await stripe.subscriptions.retrieve(sid).catch((err) => {
        if ((err as { statusCode?: number }).statusCode === 404) return null;
        throw err;
      });

      if (!stripeSub) {
        console.log(`  [${sid}] no longer exists in Stripe — marking local row canceled`);
      } else if (stripeSub.status === 'canceled') {
        console.log(`  [${sid}] already canceled in Stripe — syncing local row`);
      } else {
        await stripe.subscriptions.cancel(sid);
        console.log(`  [${sid}] canceled in Stripe`);

        if (refundLast) {
          // Refund the most recent paid invoice on this subscription.
          // The 2026 Stripe API exposes payments via Invoice.payments
          // rather than the old top-level `charge` field, so we expand
          // them and pull the PaymentIntent / Charge from there.
          const list = await stripe.invoices.list({ subscription: sid, limit: 1 });
          const latestStub = list.data[0];
          if (latestStub?.id && latestStub.status === 'paid') {
            const latest = await stripe.invoices.retrieve(latestStub.id, { expand: ['payments'] });
            const payment = latest.payments?.data[0]?.payment;
            const piId = typeof payment?.payment_intent === 'string' ? payment.payment_intent : payment?.payment_intent?.id;
            const chargeId = typeof payment?.charge === 'string' ? payment.charge : payment?.charge?.id;

            if (piId) {
              await stripe.refunds.create({ payment_intent: piId, reason: 'requested_by_customer' });
              console.log(`  [${sid}] refunded latest invoice ${latest.id} via PaymentIntent (${(latest.amount_paid / 100).toFixed(2)} ${latest.currency.toUpperCase()})`);
            } else if (chargeId) {
              await stripe.refunds.create({ charge: chargeId, reason: 'requested_by_customer' });
              console.log(`  [${sid}] refunded latest invoice ${latest.id} via Charge (${(latest.amount_paid / 100).toFixed(2)} ${latest.currency.toUpperCase()})`);
            } else {
              console.log(`  [${sid}] latest invoice ${latest.id} had no refundable payment`);
            }
          } else {
            console.log(`  [${sid}] no paid invoice found to refund`);
          }
        }

        // Best-effort: also delete the customer so we stop storing
        // their card / email on Stripe (matches what the new account
        // delete path does going forward).
        if (stripeSub.customer) {
          const custId = typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;
          await stripe.customers.del(custId).catch((err) => {
            if ((err as { statusCode?: number }).statusCode !== 404) {
              console.warn(`  [${sid}] failed to delete customer ${custId}:`, (err as Error).message);
            }
          });
        }
      }

      await prisma.subscription.update({
        where: { id: o.id },
        data: { status: 'canceled', plan: 'free' },
      });
    } catch (err) {
      console.error(`  [${sid}] FAILED:`, (err as Error).message);
    }
  }

  await prisma.$disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
