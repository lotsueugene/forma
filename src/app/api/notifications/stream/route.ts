import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { subscribeUser } from '@/lib/notifications/pubsub';

export const runtime = 'nodejs';

// GET /api/notifications/stream - Server-Sent Events stream (best-effort)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // initial hello
      send('hello', { ok: true });

      // keepalive ping
      const ping = setInterval(() => {
        send('ping', { t: Date.now() });
      }, 20000);

      const unsubscribe = subscribeUser(session.user.id, (payload) => {
        send('notification', payload);
      });

      const abort = () => {
        clearInterval(ping);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      request.signal.addEventListener('abort', abort);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

