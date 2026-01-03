import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Max consecutive errors before closing connection
const MAX_CONSECUTIVE_ERRORS = 5;
// Connection timeout (5 minutes)
const CONNECTION_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Server-Sent Events endpoint for real-time notification updates.
 * Clients connect here to receive notification count updates without polling.
 *
 * Usage:
 *   const eventSource = new EventSource('/api/notifications/stream');
 *   eventSource.onmessage = (event) => {
 *     const data = JSON.parse(event.data);
 *     console.log('Unread count:', data.count);
 *   };
 */
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let consecutiveErrors = 0;
      let isClosed = false;
      let countInterval: NodeJS.Timeout | null = null;
      let heartbeatInterval: NodeJS.Timeout | null = null;
      let timeoutId: NodeJS.Timeout | null = null;

      // Cleanup function to clear all intervals
      const cleanup = () => {
        if (isClosed) return;
        isClosed = true;

        if (countInterval) clearInterval(countInterval);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (timeoutId) clearTimeout(timeoutId);

        try {
          controller.close();
        } catch {
          // Already closed
        }
      };

      // Send count update
      const sendCount = async () => {
        if (isClosed) return;

        try {
          const count = await db.getUnreadNotificationCount(userId);
          const data = `data: ${JSON.stringify({ count, timestamp: Date.now() })}\n\n`;
          controller.enqueue(encoder.encode(data));
          consecutiveErrors = 0; // Reset on success
        } catch (error) {
          consecutiveErrors++;
          apiLogger.warn({ error, userId, consecutiveErrors }, 'SSE count fetch error');

          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            apiLogger.error({ userId }, 'SSE closing due to too many errors');
            // Send error event to client
            try {
              controller.enqueue(
                encoder.encode(
                  `event: error\ndata: ${JSON.stringify({ error: 'Connection error' })}\n\n`
                )
              );
            } catch {
              // Ignore
            }
            cleanup();
          }
        }
      };

      // Send heartbeat to keep connection alive
      const sendHeartbeat = () => {
        if (isClosed) return;

        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (error) {
          apiLogger.debug({ userId, error }, 'SSE heartbeat failed, closing connection');
          cleanup();
        }
      };

      // Initial count
      await sendCount();

      // Poll for updates every 5 seconds
      countInterval = setInterval(sendCount, 5000);

      // Heartbeat every 30 seconds
      heartbeatInterval = setInterval(sendHeartbeat, 30000);

      // Connection timeout to prevent infinite connections
      timeoutId = setTimeout(() => {
        apiLogger.debug({ userId }, 'SSE connection timeout, closing');
        cleanup();
      }, CONNECTION_TIMEOUT_MS);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        apiLogger.debug({ userId }, 'SSE client disconnected');
        cleanup();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
