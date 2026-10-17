import type { Socket } from 'socket.io';
import { RateLimiterMemory } from 'rate-limiter-flexible';

import { reply } from './ack.js';

/*
 * Socket.IO rate limits (rate-limiter-flexible), in memory per process.
 *
 *   connections   30 per minute per IP      (before authentication)
 *   saves        120 per minute per user    note:update, daily-note:update
 *   completions   60 per minute per user    item:complete
 *   other         30 per minute per user    everything else
 *
 * A limited event is dropped and, when the client asked for an ack, answered
 * with { ok: false, code: 'RATE_LIMITED' }. The web client's sync engine
 * treats that as retryable and backs off, so nothing is lost.
 */

const connections = new RateLimiterMemory({ points: 30, duration: 60 });
const saves = new RateLimiterMemory({ points: 120, duration: 60 });
const completions = new RateLimiterMemory({ points: 60, duration: 60 });
const other = new RateLimiterMemory({ points: 30, duration: 60 });

const SAVE_EVENTS = new Set(['note:update', 'daily-note:update']);

/** The client's IP; behind a trusted proxy, the first X-Forwarded-For hop. */
function clientIp(socket: Socket): string {
  const forwarded = socket.handshake.headers['x-forwarded-for'];

  if (process.env.TRUST_PROXY && typeof forwarded === 'string') {
    return forwarded.split(',')[0]!.trim();
  }

  return socket.handshake.address;
}

/** io.use(): refuse a burst of new connections from one IP. */
export async function socketConnectionLimit(
  socket: Socket,
  next: (err?: Error) => void,
) {
  try {
    await connections.consume(clientIp(socket));
    next();
  } catch {
    next(new Error('RATE_LIMITED'));
  }
}

/** Per-event limits for an authenticated socket. */
export function limitSocketEvents(socket: Socket) {
  socket.use(([event, ...args], next) => {
    const limiter = SAVE_EVENTS.has(event)
      ? saves
      : event === 'item:complete'
        ? completions
        : other;

    limiter
      .consume(socket.data.userId as string)
      .then(() => next())
      .catch(() => {
        // Dropped: not passed on to the handler.
        reply(args.at(-1), { ok: false, code: 'RATE_LIMITED' });
      });
  });
}
