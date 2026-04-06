import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { incrementSubmissionCount } from '@/lib/subscription';
import { deliverSubmissionCreatedWebhook } from '@/lib/webhooks';
import { deliverToIntegrations } from '@/lib/integrations';
import { sendSubmissionNotification, isEmailConfigured } from '@/lib/email';
import { publishToUser } from '@/lib/notifications/pubsub';

// POST /api/stripe/connect/confirm - Confirm payment and create submission
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const { sessionId, connectedAccountId } = await request.json();
    if (!sessionId || !connectedAccountId) {
      return NextResponse.json({ error: 'Session ID and account ID required' }, { status: 400 });
    }

    // Retrieve the checkout session from the connected account
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    }, {
      stripeAccount: connectedAccountId,
    });

    // Verify payment was successful
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Check if submission already exists (prevent duplicates)
    const formId = session.metadata?.formId;
    if (!formId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    // Check for existing submission with this session ID
    const existing = await prisma.submission.findFirst({
      where: {
        formId,
        metadata: { contains: sessionId },
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, alreadyCreated: true });
    }

    // Parse form data from metadata
    const formData = session.metadata?.formData ? JSON.parse(session.metadata.formData) : {};
    const submissionMetadata = session.metadata?.submissionMetadata
      ? JSON.parse(session.metadata.submissionMetadata)
      : {};

    // Add payment info
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

    // Get form for workspace info
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { name: true, workspaceId: true },
    });

    if (form) {
      await incrementSubmissionCount(form.workspaceId);

      // Deliver webhooks and integrations (fire and forget)
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

      deliverToIntegrations({
        submissionId: submission.id,
        formId,
        formName: form.name,
        workspaceId: form.workspaceId,
        submittedAt: submission.createdAt.toISOString(),
        data: formData,
        metadata: submissionMetadata,
      }).catch((err) => console.error('Integration delivery error:', err));

      // In-app notifications and email (fire and forget)
      (async () => {
        try {
          const workspace = await prisma.workspace.findUnique({
            where: { id: form.workspaceId },
            select: {
              name: true,
              notificationEmail: true,
              members: {
                select: {
                  userId: true,
                  user: {
                    select: {
                      email: true,
                      settings: {
                        select: { notifyNewSubmissions: true },
                      },
                    },
                  },
                },
              },
            },
          });

          // In-app notifications
          const recipientIds = (workspace?.members || [])
            .filter((m) => m.user.settings?.notifyNewSubmissions !== false)
            .map((m) => m.userId);

          if (recipientIds.length > 0) {
            await prisma.notification.createMany({
              data: recipientIds.map((userId) => ({
                userId,
                workspaceId: form.workspaceId,
                type: 'submission',
                title: `New paid submission`,
                body: `${form.name} received a new paid submission ($${submissionMetadata.payment?.amount || 0}).`,
                href: `/dashboard/forms/${formId}`,
              })),
            });
            for (const userId of recipientIds) {
              publishToUser(userId, { type: 'submission', workspaceId: form.workspaceId });
            }
          }

          // Email notifications
          if (isEmailConfigured()) {
            let emailRecipients: string[] = [];
            if (workspace?.notificationEmail) {
              emailRecipients = [workspace.notificationEmail];
            } else {
              emailRecipients = (workspace?.members || [])
                .filter((m) => m.user.settings?.notifyNewSubmissions !== false)
                .map((m) => m.user.email)
                .filter((email): email is string => !!email);
            }

            const fullForm = await prisma.form.findUnique({ where: { id: formId }, select: { fields: true } });
            const formFields = fullForm?.fields ? JSON.parse(fullForm.fields) : [];

            for (const emailTo of emailRecipients) {
              await sendSubmissionNotification(emailTo, {
                formName: form.name,
                formId,
                submissionId: submission.id,
                submittedAt: submission.createdAt.toISOString(),
                data: formData as Record<string, unknown>,
                workspaceName: workspace?.name,
                fields: formFields,
              });
            }
          }
        } catch (notifyErr) {
          console.error('Error sending payment notifications:', notifyErr);
        }
      })();
    }

    return NextResponse.json({ success: true, submissionId: submission.id });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 });
  }
}
