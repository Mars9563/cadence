import type { Socket } from 'socket.io';
import { supabase } from '../../supabase/supabase.js';

export async function socketAuth(socket: Socket, next: (err?: Error) => void) {
  try {
    const authorization = socket.handshake.auth?.authorization;

    if (!authorization) {
      return next(new Error('Authorization header is required.'));
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return next(
        new Error('Authorization header must use Bearer authentication.'),
      );
    }

    const { data, error } = await supabase.auth.getClaims(token);

    if (error || !data) {
      return next(new Error('The authentication token is invalid or expired.'));
    }

    const userId = data.claims.sub;

    if (!userId) {
      return next(
        new Error('Authentication token does not contain a user ID.'),
      );
    }

    socket.data.userId = userId;
    socket.data.token = token;

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);

    next(new Error('An unexpected authentication error occurred.'));
  }
}
