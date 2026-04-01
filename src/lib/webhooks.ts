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

async function deliverWithRetry(
  endpoint: { id: string; url: string; secret: string },
  rawBody: string,
  event: string
) {
  const maxAttempts = 3;
  let lastError: string | null = null;
  let lastStatusCode: number | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const deliveryId = crypto.randomUUID();
    try {
      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forma-Event': event,
          'X-Forma-Delivery-Id': deliveryId,
          'X-Forma-Signature': signBody(endpoint.secret, rawBody),
        },
        body: rawBody,
      });

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

