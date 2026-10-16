import { io, type Socket } from 'socket.io-client';
import { StateCreator } from 'zustand';

import type { HabitCompletion, NormalItem, TaskItem } from '@cadence/types';

import { createClient } from '@/lib/supabase/client';
import { getAccessToken } from '@/lib/supabase/accessToken';

import type { CadenceAppStore } from '../types';

const SOCKET_URL = process.env.PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

/**
 * Supabase auth listener that forwards refreshed tokens to the socket.
 * Lives outside the store: it is not state, just a handle to clean up.
 */
let authSubscription: { unsubscribe: () => void } | null = null;

export interface socketState {
  socket: Socket | null;

  isSocketConnected: boolean;
  isSocketConnecting: boolean;

  connectSocket: (token: string) => void;
  disconnectSocket: () => void;

  completeItem: (itemId: string) => void;
}

type NormalCompletedPayload = {
  item: NormalItem;
};

type TaskCompletedPayload = {
  item: TaskItem;
};

type HabitCompletedPayload = {
  completion: HabitCompletion;
};

type CompletionFailedPayload = {
  itemId: string;
  code: string;
};

type DailyNoteOperationFailedPayload = {
  operation: 'create' | 'update';
  noteId?: string;
  saveId?: number;
  code: string;
};

export const CreateSocketSlice: StateCreator<
  CadenceAppStore,
  [],
  [],
  socketState
> = (set, get) => ({
  socket: null,

  isSocketConnected: false,
  isSocketConnecting: false,

  connectSocket: (token) => {
    // Prevent creating multiple socket connections.
    if (get().socket) {
      return;
    }

    const socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,

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
      set({
        isSocketConnected: true,
        isSocketConnecting: false,
      });
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] connection error:', error.message);

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
    });

    socket.on('item:normal:completed', ({ item }: NormalCompletedPayload) => {
      get().updateNormalItem(item);

      get().clearItemCompletionPending(item.id);
    });

    socket.on('item:task:completed', ({ item }: TaskCompletedPayload) => {
      get().updateTaskItem(item);

      get().clearItemCompletionPending(item.id);
    });

    socket.on(
      'item:habit:completed',
      ({ completion }: HabitCompletedPayload) => {
        get().upsertHabitCompletion(completion);

        get().clearItemCompletionPending(completion.itemId);
      },
    );

    socket.on(
      'item:completion:failed',
      ({ itemId, code }: CompletionFailedPayload) => {
        console.error('[Socket] item:completion:failed:', {
          itemId,
          code,
        });

        get().clearItemCompletionPending(itemId);
      },
    );

    /*
     * ------------------------------------------------------------------------
     * DAILY NOTES
     * ------------------------------------------------------------------------
     *
     * Creation is intentionally NOT done over Socket.IO.
     *
     * AppBootstrap creates the current Daily Note over HTTP if it does not
     * already exist.
     *
     * Socket.IO is only responsible for persisting note content changes.
     * The server answers with a minimal `daily-note:saved` acknowledgement
     * ({ noteId, saveId }) that is consumed by `useDailyNoteAutosave`; it is
     * deliberately NOT written into this store, because the editor owns the
     * live document while the user is typing.
     */

    socket.on(
      'daily-note:operation:failed',
      ({ operation, noteId, saveId, code }: DailyNoteOperationFailedPayload) => {
        console.error('[Socket] daily-note:operation:failed:', {
          operation,
          noteId,
          saveId,
          code,
        });

        /*
         * Save status and retries are handled by `useDailyNoteAutosave`,
         * which also listens to this event. The local content is retained.
         */
      },
    );

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

    socket.removeAllListeners();
    socket.disconnect();

    set({
      socket: null,
      isSocketConnected: false,
      isSocketConnecting: false,
    });
  },

  completeItem: (itemId) => {
    const socket = get().socket;

    if (!socket) {
      console.error(
        '[Socket] Cannot complete item: socket is not initialized.',
      );

      return;
    }

    if (!socket.connected) {
      console.error('[Socket] Cannot complete item: socket is not connected.');

      return;
    }

    get().markItemCompletionPending(itemId);

    socket.emit('item:complete', {
      itemId,
    });
  },
});
