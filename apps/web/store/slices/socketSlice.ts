import { io, type Socket } from 'socket.io-client';
import { StateCreator } from 'zustand';

import type { HabitCompletion, NormalItem, TaskItem } from '@cadence/types';

import type { CadenceAppStore } from '../types';

const SOCKET_URL = process.env.PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

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

      // IMPORTANT:
      // The backend expects:
      // socket.handshake.auth.authorization
      //
      // and expects it to be:
      // "Bearer <token>"
      auth: {
        authorization: `Bearer ${token}`,
      },
    });

    socket.on('connect', () => {
      console.log('[Socket] connected:', socket.id);

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
      console.log('[Socket] disconnected:', reason);

      set({
        isSocketConnected: false,
        isSocketConnecting: false,
      });
    });

    socket.on('item:normal:completed', ({ item }: NormalCompletedPayload) => {
      console.log('[Socket] item:normal:completed received:', item);

      get().updateNormalItem(item);

      get().clearItemCompletionPending(item.id);
    });

    socket.on('item:task:completed', ({ item }: TaskCompletedPayload) => {
      console.log('[Socket] item:task:completed received:', item);

      get().updateTaskItem(item);

      get().clearItemCompletionPending(item.id);
    });

    /*
     * Habit completion confirmed by the server.
     */
    socket.on(
      'item:habit:completed',
      ({ completion }: HabitCompletedPayload) => {
        console.log('[Socket] item:habit:completed received:', completion);

        // Put the persisted completion into the habit completion array.
        get().upsertHabitCompletion(completion);

        // The server has confirmed this item's completion.
        get().clearItemCompletionPending(completion.itemId);
      },
    );

    /*
     * Completion failed on the server.
     */
    socket.on(
      'item:completion:failed',
      ({ itemId, code }: CompletionFailedPayload) => {
        console.error('[Socket] item:completion:failed:', {
          itemId,
          code,
        });

        // Stop the loading state even though the request failed.
        get().clearItemCompletionPending(itemId);
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

    console.log('[Socket] item:complete:', itemId);

    // Show loading state in the UI.
    get().markItemCompletionPending(itemId);

    // Send completion request to backend.
    socket.emit('item:complete', {
      itemId,
    });
  },
});
