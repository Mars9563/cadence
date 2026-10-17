import type { NextFunction, Request, Response } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

import { authenticate } from '../middleware/auth.js';

/*
 * REST rate limits (express-rate-limit), in memory per process.
 *
 * Counted per signed-in user (the id authenticate() puts on the request),
 * falling back to the client IP. Behind a proxy, set TRUST_PROXY so the IP
 * is the client's (see app.ts). With several replicas each process counts
 * on its own; a shared store (e.g. Redis) would make the limits global.
 */

const WINDOW_MS = 60_000;

const TOO_MANY = {
  success: false,
  error: 'RATE_LIMITED',
  message: 'Too many requests. Wait a moment and try again.',
};

const userOrIp = (req: Request) => req.userId ?? ipKeyGenerator(req.ip ?? '');

/** 300 requests per minute per user on authenticated routes. */
const userLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: userOrIp,
  message: TOO_MANY,
});

/**
 * 60 failed sign-ins (401) per minute per IP. Counted before authenticate
 * runs, so a flood of bad tokens is cut off before it reaches Supabase.
 */
const failedAuthLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
  skipSuccessfulRequests: true,
  requestWasSuccessful: (_req, res) => res.statusCode !== 401,
  message: TOO_MANY,
});

/** 10 avatar upload signatures per minute per user. */
export const avatarUploadLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: userOrIp,
  message: TOO_MANY,
});

/** Signed-in user required, with the per-user and failed-auth limits. */
export const requireUser: Array<
  (req: Request, res: Response, next: NextFunction) => unknown
> = [failedAuthLimiter, authenticate, userLimiter];
