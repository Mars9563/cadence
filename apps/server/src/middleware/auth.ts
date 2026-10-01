import { NextFunction, Request, Response } from 'express';
import { supabase } from '../supabase/supabase.js';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authorization header is required.',
      });
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        error: 'INVALID_AUTHORIZATION',
        message: 'Authorization header must use Bearer authentication.',
      });
    }

    const { data, error } = await supabase.auth.getClaims(token);

    if (error || !data) {
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'The authentication token is invalid or expired.',
      });
    }

    const userId = data.claims.sub;

    if (!userId) {
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Authentication token does not contain a user ID.',
      });
    }

    req.userId = userId;
    req.userJWT = token;

    return next();
  } catch (error) {
    console.error('Authentication middleware error:', error);

    return res.status(500).json({
      error: 'AUTHENTICATION_ERROR',
      message: 'An unexpected authentication error occurred.',
    });
  }
}
