import { Socket } from 'socket.io';

import { supabase } from '../../supabase/supabase';

type RefreshAuthPayload = {
  authorization: string;
};

export function registerAuthHandlers(socket: Socket) {
  /*
   * Replace the socket's access token.
   *
   * The token is verified once in the handshake (socketAuth) and then used
   * for every database call on this socket. Supabase access tokens expire
   * (about an hour), while the socket can stay open far longer, so without
   * this every write starts failing with `JWT expired`.
   *
   * The client sends the new token whenever its Supabase session refreshes.
   * It is only accepted if it is valid AND belongs to the same user the
   * socket was authenticated as; a socket can never switch users.
   */
  socket.on('auth:refresh', async (payload: RefreshAuthPayload) => {
    try {
      const authorization =
        typeof payload?.authorization === 'string' ? payload.authorization : '';

      const [scheme, token] = authorization.split(' ');

      if (scheme !== 'Bearer' || !token) {
        socket.emit('auth:refresh:failed', { code: 'INVALID_AUTHORIZATION' });
        return;
      }

      const { data, error } = await supabase.auth.getClaims(token);

      if (error || !data) {
        socket.emit('auth:refresh:failed', { code: 'INVALID_TOKEN' });
        return;
      }

      if (data.claims.sub !== socket.data.userId) {
        socket.emit('auth:refresh:failed', { code: 'USER_MISMATCH' });
        return;
      }

      socket.data.token = token;

      socket.emit('auth:refreshed');
    } catch (error) {
      console.error('Socket token refresh error:', error);

      socket.emit('auth:refresh:failed', { code: 'AUTH_REFRESH_FAILED' });
    }
  });
}
