import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyFormAccess } from '@/lib/workspace-auth';
import { checkLimit, incrementSubmissionCount } from '@/lib/subscription';
import { publishToUser } from '@/lib/notifications/pubsub';
import { deliverSubmissionCreatedWebhook } from '@/lib/webhooks';
import { checkSpam, parseSpamSettings, cleanSpamFields } from '@/lib/spam-protection';
import { sendSubmissionNotification, isEmailConfigured } from '@/lib/email';
import { deliverToIntegrations } from '@/lib/integrations';

// GET /api/forms/[id]/submissions - List submissions for a form (authenticated)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this form through workspace
    const access = await verifyFormAccess(session.user.id, id);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.error === 'Form not found' ? 404 : 403 });
    }

    const submissions = await prisma.submission.findMany({
      where: { formId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      submissions: submissions.map((sub) => ({
        id: sub.id,
        data: JSON.parse(sub.data),
        metadata: sub.metadata ? JSON.parse(sub.metadata) : null,
        createdAt: sub.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}

// CORS headers for cross-origin form submissions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// OPTIONS /api/forms/[id]/submissions - CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// POST /api/forms/[id]/submissions - Create a submission (public - no auth required)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find the form (public access for submissions)
    const form = await prisma.form.findFirst({
      where: {
        id,
        status: 'active', // Only active forms accept submissions
      },
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found or not active' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Check subscription limits
    const limitCheck = await checkLimit(form.workspaceId, 'submit');
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.reason || 'Submission limit reached' },
        { status: 402, headers: corsHeaders }
      );
    }

    // Parse request body based on content type
    const contentType = request.headers.get('content-type') || '';
    let data: Record<string, unknown>;

    if (contentType.includes('application/json')) {
      data = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      data = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    } else {
      // Default to trying JSON for backwards compatibility
      try {
        data = await request.json();
      } catch {
        return NextResponse.json(
          { error: 'Unsupported content type. Use application/json or application/x-www-form-urlencoded' },
          { status: 415, headers: corsHeaders }
        );
      }
    }

    // Extract special fields before spam check
    const redirectUrl = data._redirect as string | undefined;
    const recaptchaToken = (data['g-recaptcha-response'] || data.recaptchaToken) as string | undefined;

    // Get metadata from request
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');

    // Run spam protection checks
    const spamSettings = parseSpamSettings(form.settings);
    const spamCheck = await checkSpam({
      formId: id,
      ip,
      data,
      settings: spamSettings,
      recaptchaToken,
    });

    if (!spamCheck.allowed) {
      // For honeypot, silently accept but don't store (don't reveal to bots)
      if (spamCheck.code === 'honeypot') {
        if (redirectUrl) {
          return NextResponse.redirect(redirectUrl, 303);
        }
        return NextResponse.json(
          { success: true, submission: { id: 'blocked', createdAt: new Date() } },
          { headers: corsHeaders }
        );
      }

      // For rate limiting, return 429 with retry-after header
      if (spamCheck.code === 'rate_limit') {
        const headers = new Headers(corsHeaders);
        if (spamCheck.retryAfter) {
          headers.set('Retry-After', String(spamCheck.retryAfter));
        }
        return NextResponse.json(
          { error: spamCheck.reason },
          { status: 429, headers }
        );
      }

      // For reCAPTCHA failures
      return NextResponse.json(
        { error: spamCheck.reason || 'Submission blocked' },
        { status: 422, headers: corsHeaders }
      );
    }

    // Clean spam-related fields from submission data
    const cleanedData = cleanSpamFields(data);

    // Build full metadata
    const metadata = {
      userAgent: request.headers.get('user-agent'),
      ip,
      submittedAt: new Date().toISOString(),
    };

    // Increment form views (could be separated into a separate tracking)
    await prisma.form.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        formId: id,
        data: JSON.stringify(cleanedData),
        metadata: JSON.stringify(metadata),
      },
    });

    // Increment usage counter
    await incrementSubmissionCount(form.workspaceId);

    // Create in-app notifications for workspace members (respects user settings)
    try {
      const membersToNotify = await prisma.workspaceMember.findMany({
        where: { workspaceId: form.workspaceId },
        select: {
          userId: true,
          user: {
            select: {
              settings: {
                select: { notifyNewSubmissions: true },
              },
            },
          },
        },
      });

      const recipientIds = membersToNotify
        .filter((m) => m.user.settings?.notifyNewSubmissions !== false)
        .map((m) => m.userId);

      if (recipientIds.length > 0) {
        await prisma.notification.createMany({
          data: recipientIds.map((userId) => ({
            userId,
            workspaceId: form.workspaceId,
            type: 'submission',
            title: 'New submission received',
            body: form.name,
            href: `/dashboard/forms/${form.id}`,
          })),
        });

        for (const userId of recipientIds) {
          publishToUser(userId, { type: 'submission', workspaceId: form.workspaceId });
        }
      }
    } catch (notifyErr) {
      // Do not block submissions if notifications fail
      console.error('Error creating submission notifications:', notifyErr);
    }

    // Send email notification if configured (non-blocking)
    if (isEmailConfigured()) {
      (async () => {
        try {
          // Get workspace with notification email
          const workspace = await prisma.workspace.findUnique({
            where: { id: form.workspaceId },
            select: { notificationEmail: true, name: true },
          });

          const emailTo = workspace?.notificationEmail;
          if (emailTo) {
            await sendSubmissionNotification(emailTo, {
              formName: form.name,
              formId: form.id,
              submissionId: submission.id,
              submittedAt: submission.createdAt.toISOString(),
              data: cleanedData as Record<string, unknown>,
              workspaceName: workspace?.name,
            });
          }
        } catch (emailErr) {
          console.error('Error sending email notification:', emailErr);
        }
      })();
    }

    // Deliver customer webhooks (best effort; never blocks submission response)
    deliverSubmissionCreatedWebhook({
      event: 'submission.created',
      data: {
        submissionId: submission.id,
        formId: form.id,
        formName: form.name,
        workspaceId: form.workspaceId,
        submittedAt: submission.createdAt.toISOString(),
        submission: cleanedData,
        metadata,
      },
    }).catch((webhookErr) => {
      console.error('Error delivering submission webhooks:', webhookErr);
    });

    // Deliver to connected integrations (best effort; never blocks submission response)
    deliverToIntegrations({
      submissionId: submission.id,
      formId: form.id,
      formName: form.name,
      workspaceId: form.workspaceId,
      submittedAt: submission.createdAt.toISOString(),
      data: cleanedData as Record<string, unknown>,
      metadata,
    }).catch((integrationErr) => {
      console.error('Error delivering to integrations:', integrationErr);
    });

    // Handle redirect for HTML form submissions
    if (redirectUrl) {
      return NextResponse.redirect(redirectUrl, 303);
    }

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        createdAt: submission.createdAt,
      },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500, headers: corsHeaders }
    );
  }
}
