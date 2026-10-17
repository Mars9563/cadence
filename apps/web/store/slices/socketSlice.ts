import { io, type Socket } from 'socket.io-client';
import { StateCreator } from 'zustand';

import { BACKEND_URL } from '@/lib/api/request';
import { createClient } from '@/lib/supabase/client';
import { getAccessToken } from '@/lib/supabase/accessToken';

import type { CadenceAppStore } from '../types';

/**
 * Handles that live outside the store: they are not state, just things to
 * clean up on disconnect.
 */
let authSubscription: { unsubscribe: () => void } | null = null;
let removeWindowListeners: (() => void) | null = null;

/** Socket.IO's reconnection gives up on server-initiated disconnects. */
const SERVER_DISCONNECT_RETRY_MS = 2_000;

export interface socketState {
  socket: Socket | null;

  isSocketConnected: boolean;
  isSocketConnecting: boolean;

  /** True once the first connection succeeded in this page session. */
  hasEverConnected: boolean;

  connectSocket: (token: string) => void;
  disconnectSocket: () => void;
}

export const CreateSocketSlice: StateCreator<
  CadenceAppStore,
  [],
  [],
  socketState
> = (set, get) => ({
  socket: null,

  isSocketConnected: false,
  isSocketConnecting: false,
  hasEverConnected: false,

  connectSocket: (token) => {
    // Prevent creating multiple socket connections.
    if (get().socket) {
      return;
    }

    const socket = io(BACKEND_URL, {
      autoConnect: false,
      withCredentials: true,

      /*
       * Reconnect forever (with Socket.IO's backoff, capped at 10s): the
       * app keeps working offline and syncs whenever the server is back.
       */
      reconnection: true,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,

      /*
       * A function, not a fixed object: Socket.IO calls it for EVERY
       * handshake, so a reconnect (network drop, laptop sleep) presents the
       * current token instead of the one from the first connection, which
       * may have expired since.
       */
      auth: (callback) => {
        void getAccessToken().then((freshToken) => {
          callback({ authorization: `Bearer ${freshToken ?? token}` });
        });
      },
    });

    /*
     * The server keeps the token from the handshake and uses it for every
     * write on this socket. Access tokens expire (~1h) while the socket
     * stays open, so each time Supabase refreshes the session the new token
     * is handed to the server. Without this, all socket writes start
     * failing with `JWT expired` an hour after connecting.
     */
    authSubscription?.unsubscribe();
    authSubscription = createClient().auth.onAuthStateChange(
      (event, session) => {
        if (event !== 'TOKEN_REFRESHED' || !session) return;

        if (socket.connected) {
          socket.emit('auth:refresh', {
            authorization: `Bearer ${session.access_token}`,
          });
        }
      },
    ).data.subscription;

    socket.on('auth:refresh:failed', ({ code }: { code: string }) => {
      console.error('[Socket] auth:refresh:failed:', code);
    });

    socket.on('connect', () => {
      const isReconnect = get().hasEverConnected;

      set({
        isSocketConnected: true,
        isSocketConnecting: false,
        hasEverConnected: true,
      });

      get().setSessionExpired(false);

      /*
       * Back online: send everything that waited, then re-read server state
       * so changes made elsewhere while we were away show up. The first
       * connection does not reconcile: bootstrap has just loaded the data.
       */
      if (isReconnect) {
        get().requestReconcile();
      } else {
        void get().flushSync();
      }
    });

    socket.io.on('reconnect_attempt', () => {
      set({ isSocketConnecting: true });
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] connection error:', error.message);

      // socketAuth rejects an expired or invalid session with this message.
      if (/invalid or expired|authorization/i.test(error.message)) {
        get().setSessionExpired(true);
      }

      set({
        isSocketConnected: false,
        isSocketConnecting: false,
      });
    });

    socket.on('disconnect', (reason) => {
      set({
        isSocketConnected: false,
        isSocketConnecting: false,
      });

      // The server closed the connection on purpose (e.g. a restart). The
      // client does not reconnect by itself in this case.
      if (reason === 'io server disconnect') {
        setTimeout(() => {
          if (get().socket === socket && !socket.connected) socket.connect();
        }, SERVER_DISCONNECT_RETRY_MS);
      }
    });

    /*
     * The browser knows about connectivity before Socket.IO's backoff timer
     * does: reconnect immediately when the network comes back, and when a
     * hidden tab becomes visible again (laptop lid, background tab).
     */
    const reconnectNow = () => {
      if (get().socket === socket && !socket.connected) socket.connect();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') reconnectNow();
    };

    removeWindowListeners?.();
    window.addEventListener('online', reconnectNow);
    document.addEventListener('visibilitychange', handleVisibility);
    removeWindowListeners = () => {
      window.removeEventListener('online', reconnectNow);
      document.removeEventListener('visibilitychange', handleVisibility);
    };

    // Put the socket into Zustand before starting the connection.
    set({
      socket,
      isSocketConnecting: true,
      isSocketConnected: false,
    });

    socket.connect();
  },

  disconnectSocket: () => {
    const socket = get().socket;

    if (!socket) {
      return;
    }

    authSubscription?.unsubscribe();
    authSubscription = null;

    removeWindowListeners?.();
    removeWindowListeners = null;

    socket.removeAllListeners();
    socket.io.removeAllListeners();
    socket.disconnect();

    set({
      socket: null,
      isSocketConnected: false,
      isSocketConnecting: false,
    });
  },
});
