import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyFormAccess } from '@/lib/workspace-auth';
import { checkLimit, incrementSubmissionCount, getSubscriptionInfo } from '@/lib/subscription';
import { publishToUser } from '@/lib/notifications/pubsub';
import { deliverSubmissionCreatedWebhook } from '@/lib/webhooks';
import { checkSpam, parseSpamSettings, cleanSpamFields } from '@/lib/spam-protection';
import { sendSubmissionNotification, isEmailConfigured } from '@/lib/email';
import { deliverToIntegrations } from '@/lib/integrations';
import { stripe, getPlatformFeePercentage } from '@/lib/stripe';
import { processAutomations } from '@/lib/automations';

// Geolocation lookup using ip-api.com (free, no API key needed)
async function fetchGeolocation(ip: string): Promise<{
  country: string;
  countryCode: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
  continent: string;
} | null> {
  try {
    // Skip private/local IPs
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return null;
    }
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,city,lat,lon,continent`, {
      signal: AbortSignal.timeout(3000), // 3s timeout
    });
    const data = await response.json();
    if (data.status === 'success') {
      return {
        country: data.country,
        countryCode: data.countryCode,
        region: data.region,
        city: data.city,
        lat: data.lat,
        lon: data.lon,
        continent: data.continent || 'Unknown',
      };
    }
    return null;
  } catch {
    return null;
  }
}

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

    // Verify user has editor+ access to view submission content
    const access = await verifyFormAccess(session.user.id, id, 'editor');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.error === 'Form not found' ? 404 : 403 });
    }

    // Pagination
    const url = request.nextUrl;
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where: { formId: id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.submission.count({ where: { formId: id } }),
    ]);

    return NextResponse.json({
      submissions: submissions.map((sub) => ({
        id: sub.id,
        data: (() => { try { return JSON.parse(sub.data); } catch { return {}; } })(),
        metadata: (() => { try { return sub.metadata ? JSON.parse(sub.metadata) : null; } catch { return null; } })(),
        createdAt: sub.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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
// Allow all origins for form submissions (forms can be embedded anywhere)
// but restrict methods and headers
function getCorsHeaders(request?: NextRequest): Record<string, string> {
  const origin = request?.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// OPTIONS /api/forms/[id]/submissions - CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(request) });
}

// POST /api/forms/[id]/submissions - Create a submission (public - no auth required)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsHeaders = getCorsHeaders(request);
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
      const rawData = await request.json();
      // Support both { data: {...} } and flat {...} formats
      data = rawData.data && typeof rawData.data === 'object' && !Array.isArray(rawData.data)
        ? rawData.data
        : rawData;
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      data = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    } else {
      // Default to trying JSON for backwards compatibility
      try {
        const rawData = await request.json();
        // Support both { data: {...} } and flat {...} formats
        data = rawData.data && typeof rawData.data === 'object' && !Array.isArray(rawData.data)
          ? rawData.data
          : rawData;
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

    // Build full metadata with geolocation (fetched async)
    const metadata: Record<string, unknown> = {
      userAgent: request.headers.get('user-agent'),
      ip,
      submittedAt: new Date().toISOString(),
    };

    // Check for booking field overlap
    const formFields = JSON.parse(form.fields) as Array<{ id?: string; type: string; amount?: number; currency?: string; label?: string }>;
    const bookingFields = formFields.filter((f) => f.type === 'booking');

    for (const bookingField of bookingFields) {
      const bookingValue = bookingField.id ? data[bookingField.id] : null;
      if (!bookingValue) continue;

      let rawParsed: unknown = bookingValue;
      if (typeof rawParsed === 'string') {
        try { rawParsed = JSON.parse(rawParsed as string); } catch { continue; }
      }

      const parsed = rawParsed as { date?: string; slots?: Array<{ start: string; end: string }> } | null;
      if (!parsed?.date || !Array.isArray(parsed.slots)) continue;

      {
        // Fetch existing bookings for this date
        const existingSubs = await prisma.submission.findMany({
          where: { formId: id },
          select: { data: true },
        });

        const existingSlots: Array<{ start: string; end: string }> = [];
        for (const sub of existingSubs) {
          const subData = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data;
          const existingBooking = bookingField.id ? (subData as Record<string, unknown>)[bookingField.id] : null;
          if (!existingBooking) continue;

          let rawExisting: unknown = existingBooking;
          if (typeof rawExisting === 'string') {
            try { rawExisting = JSON.parse(rawExisting as string); } catch { continue; }
          }

          const existingParsed = rawExisting as { date?: string; slots?: Array<{ start: string; end: string }> } | null;
          if (existingParsed?.date === parsed.date && Array.isArray(existingParsed.slots)) {
            existingSlots.push(...existingParsed.slots);
          }
        }

        // Validate and check for overlap
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        for (const newSlot of parsed.slots) {
          if (!timeRegex.test(newSlot.start) || !timeRegex.test(newSlot.end)) {
            return NextResponse.json(
              { error: 'Invalid time format. Use HH:MM (24-hour).' },
              { status: 400, headers: corsHeaders }
            );
          }
          const newStart = parseInt(newSlot.start.replace(':', ''));
          const rawNewEnd = parseInt(newSlot.end.replace(':', ''));
          // Handle overnight slots (e.g. 2100–0100 → treat end as 2500)
          const newEnd = rawNewEnd <= newStart ? rawNewEnd + 2400 : rawNewEnd;
          for (const existing of existingSlots) {
            const exStart = parseInt(existing.start.replace(':', ''));
            const rawExEnd = parseInt(existing.end.replace(':', ''));
            const exEnd = rawExEnd <= exStart ? rawExEnd + 2400 : rawExEnd;
            if (newStart < exEnd && exStart < newEnd) {
              return NextResponse.json(
                { error: `Time slot ${newSlot.start}-${newSlot.end} overlaps with an existing booking (${existing.start}-${existing.end})` },
                { status: 400, headers: corsHeaders }
              );
            }
          }
        }
      }
    }

    // Check if form has a payment field — if so, redirect to Stripe before saving
    const paymentField = formFields.find((f) => f.type === 'payment' && f.amount && f.amount > 0);

    if (paymentField && stripe) {
      // Verify workspace has Pro plan for payments
      const subscriptionInfo = await getSubscriptionInfo(form.workspaceId);
      if (!subscriptionInfo.features.payments) {
        return NextResponse.json(
          { error: 'Payment forms require a Pro plan. Please contact the form owner.' },
          { status: 402, headers: corsHeaders }
        );
      }

      const workspace = await prisma.workspace.findUnique({
        where: { id: form.workspaceId },
        select: { stripeConnectAccountId: true },
      });

      if (!workspace?.stripeConnectAccountId) {
        return NextResponse.json(
          { error: 'Payment is not configured for this form. Please contact the form owner.' },
          { status: 400, headers: corsHeaders }
        );
      }

      {
        try {
          const feePercent = await getPlatformFeePercentage();
          const applicationFee = Math.round((paymentField.amount || 0) * 100 * (feePercent / 100));
          const checkoutSession = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
              price_data: {
                currency: paymentField.currency || 'usd',
                product_data: {
                  name: form.name,
                  description: paymentField.label || 'Form payment',
                },
                unit_amount: Math.round((paymentField.amount || 0) * 100),
              },
              quantity: 1,
            }],
            mode: 'payment',
            payment_intent_data: {
              application_fee_amount: applicationFee,
            },
            success_url: `${process.env.NEXTAUTH_URL || request.nextUrl.origin}/f/${id}?payment=success&session_id={CHECKOUT_SESSION_ID}&acct=${workspace.stripeConnectAccountId}`,
            cancel_url: `${process.env.NEXTAUTH_URL || request.nextUrl.origin}/f/${id}?payment=cancelled`,
            metadata: {
              formId: form.id,
              formData: JSON.stringify(cleanedData),
              submissionMetadata: JSON.stringify(metadata),
            },
          }, {
            stripeAccount: workspace.stripeConnectAccountId,
          });

          return NextResponse.json({
            success: true,
            paymentUrl: checkoutSession.url,
            pendingPayment: true,
          }, { headers: corsHeaders });
        } catch (paymentErr) {
          console.error('Error creating payment session:', paymentErr);
          // Fall through to save submission without payment
        }
      }
    }

    // Fetch geolocation data (non-blocking, we'll update submission after)
    const geoPromise = ip ? fetchGeolocation(ip) : Promise.resolve(null);

    // Increment form views (could be separated into a separate tracking)
    await prisma.form.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    // Create submission (only for non-payment forms, or if payment setup failed)
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

    // Send email notification if configured and plan allows it (non-blocking)
    const subInfo = await getSubscriptionInfo(form.workspaceId);
    if (isEmailConfigured() && subInfo.features.emailNotifications) {
      (async () => {
        try {
          // Get workspace with notification email and all members' emails as fallback
          const workspace = await prisma.workspace.findUnique({
            where: { id: form.workspaceId },
            select: {
              notificationEmail: true,
              name: true,
              members: {
                select: {
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

          // Determine email recipients
          let emailRecipients: string[] = [];

          if (workspace?.notificationEmail) {
            // If workspace notification email is set, use only that
            emailRecipients = [workspace.notificationEmail];
          } else {
            // Otherwise, send to all team members who have notifications enabled
            emailRecipients = (workspace?.members || [])
              .filter((m) => m.user.settings?.notifyNewSubmissions !== false)
              .map((m) => m.user.email)
              .filter((email): email is string => !!email);
          }

          // Parse form fields to get labels
          const formFields = form.fields ? JSON.parse(form.fields) : [];

          // Send to all recipients
          for (const emailTo of emailRecipients) {
            await sendSubmissionNotification(emailTo, {
              formName: form.name,
              formId: form.id,
              submissionId: submission.id,
              submittedAt: submission.createdAt.toISOString(),
              data: cleanedData as Record<string, unknown>,
              workspaceName: workspace?.name,
              fields: formFields,
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

    // Process automations (auto-reply, follow-ups — best effort, non-blocking)
    processAutomations({
      formId: form.id,
      submissionId: submission.id,
      data: cleanedData as Record<string, unknown>,
      fields: formFields.map((f: { id?: string; type: string; label?: string }) => ({
        id: f.id || '',
        label: f.label || '',
        type: f.type,
      })),
    }).catch((automationErr) => {
      console.error('Error processing automations:', automationErr);
    });

    // Update submission with geolocation (non-blocking, don't await)
    geoPromise.then(async (geo) => {
      if (geo) {
        try {
          const updatedMetadata = { ...metadata, geo };
          await prisma.submission.update({
            where: { id: submission.id },
            data: { metadata: JSON.stringify(updatedMetadata) },
          });
        } catch (geoErr) {
          console.error('Error updating submission with geolocation:', geoErr);
        }
      }
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

// DELETE /api/forms/[id]/submissions - Delete selected submissions
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await verifyFormAccess(session.user.id, id, 'editor');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { submissionIds } = await request.json() as { submissionIds: string[] };

    if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
      return NextResponse.json({ error: 'submissionIds array is required' }, { status: 400 });
    }

    const result = await prisma.submission.deleteMany({
      where: {
        id: { in: submissionIds },
        formId: id,
      },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error('Error deleting submissions:', error);
    return NextResponse.json({ error: 'Failed to delete submissions' }, { status: 500 });
  }
}
