import crypto from 'crypto';
import { prisma } from './prisma';

interface SubmissionCreatedPayload {
  event: 'submission.created';
  data: {
    submissionId: string;
    formId: string;
    formName: string;
    workspaceId: string;
    submittedAt: string;
    submission: unknown;
    metadata: unknown;
  };
}

function signBody(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Block internal/private URLs to prevent SSRF attacks */
function isUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Block private/internal hostnames
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;
    if (hostname === '0.0.0.0' || hostname.endsWith('.local')) return false;
    if (hostname === 'metadata.google.internal') return false;

    // Block private IP ranges
    const parts = hostname.split('.').map(Number);
    if (parts.length === 4 && parts.every(p => !isNaN(p))) {
      if (parts[0] === 10) return false; // 10.x.x.x
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false; // 172.16-31.x.x
      if (parts[0] === 192 && parts[1] === 168) return false; // 192.168.x.x
      if (parts[0] === 169 && parts[1] === 254) return false; // 169.254.x.x (AWS metadata)
    }

    // Must be HTTPS in production
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') return false;

    return true;
  } catch {
    return false;
  }
}

async function deliverWithRetry(
  endpoint: { id: string; url: string; secret: string },
  rawBody: string,
  event: string
) {
  const maxAttempts = 3;
  let lastError: string | null = null;
  let lastStatusCode: number | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (!isUrlSafe(endpoint.url)) {
      lastError = 'URL blocked: internal or private addresses are not allowed';
      break;
    }
    const deliveryId = crypto.randomUUID();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forma-Event': event,
          'X-Forma-Delivery-Id': deliveryId,
          'X-Forma-Signature': signBody(endpoint.secret, rawBody),
        },
        body: rawBody,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      lastStatusCode = res.status;
      if (res.ok) {
        await prisma.webhookEndpoint.update({
          where: { id: endpoint.id },
          data: {
            lastTriggeredAt: new Date(),
            lastStatusCode: res.status,
            lastError: null,
          },
        });
        return;
      }

      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Network error';
    }

    if (attempt < maxAttempts) {
      await sleep(300 * attempt);
    }
  }

  await prisma.webhookEndpoint.update({
    where: { id: endpoint.id },
    data: {
      lastTriggeredAt: new Date(),
      lastStatusCode,
      lastError: lastError?.slice(0, 500) || 'Delivery failed',
    },
  });
}

export async function deliverSubmissionCreatedWebhook(payload: SubmissionCreatedPayload) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      workspaceId: payload.data.workspaceId,
      active: true,
    },
    select: {
      id: true,
      url: true,
      secret: true,
      events: true,
    },
  });

  const eventName = payload.event;
  const rawBody = JSON.stringify(payload);

  const filtered = endpoints.filter((e) =>
    e.events
      .split(',')
      .map((x) => x.trim())
      .includes(eventName)
  );

  await Promise.allSettled(
    filtered.map((endpoint) =>
      deliverWithRetry(
        { id: endpoint.id, url: endpoint.url, secret: endpoint.secret },
        rawBody,
        eventName
      )
    )
  );
}

