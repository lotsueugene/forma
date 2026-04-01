'use client';

import { useEffect, useRef } from 'react';

export function useNotificationStream(onMessage: () => void) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/notifications/stream');
      es.addEventListener('notification', () => onMessageRef.current());
      es.addEventListener('hello', () => onMessageRef.current());
      es.onerror = () => {
        // If SSE isn't supported in the current environment, just close and rely on polling.
        try {
          es?.close();
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore
    }
    return () => {
      try {
        es?.close();
      } catch {
        // ignore
      }
    };
  }, []);
}

