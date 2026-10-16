import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

import type { NoteSaveAck } from '@cadence/types';

export type NoteSaveStatus =
  'idle' | 'dirty' | 'saving' | 'saved' | 'error';

type NoteOperationFailedPayload = {
  operation: 'update';
  noteId?: string;
  saveId?: number;
  code: string;
};

type UseNoteAutosaveOptions = {
  noteId: string;
  initialContent: string;
  socket: Socket | null;
  isSocketConnected: boolean;
  setStoreContent: (noteId: string, content: string) => void;
};

const AUTOSAVE_DELAY_MS = 1000;
const RETRY_DELAY_MS = 1000;
// Matches updateNoteSchema in @cadence/validation.
const MAX_NOTE_LENGTH = 1_000_000;

/**
 * Autosave for Notes over the `note:*` socket events.
 *
 * A copy of useDailyNoteAutosave (kept separate on purpose so the Daily Note
 * flow stays untouched); only event names, the size limit and messages
 * differ. The design notes below apply unchanged.
 *
 * Autosave is deliberately implemented as a small state machine.
 *
 * Important invariants:
 *
 *   1. The editor is the live source of truth while this hook is mounted.
 *      The server only ever sends back an acknowledgement
 *      (`{ noteId, saveId }`), never document content, so nothing the server
 *      says can replace what the user is typing.
 *
 *   2. Every save attempt gets a fresh, monotonically increasing `saveId`
 *      that the server echoes. An acknowledgement (or failure) only counts if
 *      it matches the one save currently in flight for this note, so a late
 *      response from an earlier attempt can never mark newer text as saved.
 *
 *   3. Only one save is in flight at a time, which also keeps the order in
 *      which the database sees writes deterministic.
 *
 * The hook is one instance per open Note: its state starts from
 * `initialContent` and the consumer remounts it (via `key`) when the active
 * note changes, so there is no in-place reset to get wrong.
 */
export function useNoteAutosave({
  noteId,
  initialContent,
  socket,
  isSocketConnected,
  setStoreContent,
}: UseNoteAutosaveOptions) {
  const [status, setStatus] = useState<NoteSaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const revisionRef = useRef(0);
  const latestContentRef = useRef(initialContent);
  const lastSavedContentRef = useRef(initialContent);

  // Never reset: ids must stay unique for the lifetime of the hook.
  const saveIdRef = useRef(0);

  const inFlightRef = useRef<{
    saveId: number;
    noteId: string;
    revision: number;
    content: string;
  } | null>(null);

  const scheduleRef = useRef<() => void>(() => undefined);
  const flushRef = useRef<() => void>(() => undefined);
  const exitFlushRef = useRef<() => void>(() => undefined);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const sendSnapshot = useCallback(() => {
    if (!mountedRef.current) return;
    if (!socket || !isSocketConnected) return;
    if (inFlightRef.current) return;

    const content = latestContentRef.current;
    const revision = revisionRef.current;

    if (content.length > MAX_NOTE_LENGTH) {
      setStatus('error');
      setError('Note is too large to save.');
      return;
    }

    // Nothing changed since the last confirmed server value.
    if (content === lastSavedContentRef.current) {
      setStatus('saved');
      setError(null);
      return;
    }

    const saveId = ++saveIdRef.current;

    inFlightRef.current = { saveId, noteId, revision, content };
    setStatus('saving');
    setError(null);

    socket.emit('note:update', {
      noteId,
      content,
      saveId,
    });
  }, [isSocketConnected, noteId, socket]);

  /*
   * "Latest ref" pattern: timers, socket listeners and the unmount cleanup
   * call these through refs so they always run the newest closure.
   */
  useEffect(() => {
    flushRef.current = sendSnapshot;

    scheduleRef.current = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        sendSnapshot();
      }, AUTOSAVE_DELAY_MS);
    };

    // Best-effort final flush for the moments this hook is about to disappear
    // (the note's tab is closed, or the page is being hidden). Without it,
    // an edit made within the last debounce window would never be sent. It
    // bypasses the in-flight bookkeeping on purpose: nobody will be listening
    // for the acknowledgement, and re-sending content that is already in
    // flight is harmless because the write is idempotent.
    exitFlushRef.current = () => {
      if (!socket || !isSocketConnected) return;
      if (latestContentRef.current === lastSavedContentRef.current) return;
      if (latestContentRef.current.length > MAX_NOTE_LENGTH) return;

      socket.emit('note:update', {
        noteId,
        content: latestContentRef.current,
        saveId: ++saveIdRef.current,
      });
    };
  }, [isSocketConnected, noteId, sendSnapshot, socket]);

  const onChange = useCallback(
    (content: string, initialMarkdownNormalize = false) => {
      // MDXEditor may report its initial markdown normalization through
      // onChange. That is initialization, not a user edit, so it must not
      // start an autosave cycle.
      if (initialMarkdownNormalize) return;

      revisionRef.current += 1;
      latestContentRef.current = content;

      setStoreContent(noteId, content);

      if (content.length > MAX_NOTE_LENGTH) {
        setError('Note is too large to save.');
        setStatus('error');
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        return;
      }

      setError(null);

      // A local edit always wins over an older server operation.
      if (inFlightRef.current) {
        setStatus('dirty');
      } else {
        setStatus(content === lastSavedContentRef.current ? 'saved' : 'dirty');
      }

      scheduleRef.current();
    },
    [noteId, setStoreContent],
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      exitFlushRef.current();

      mountedRef.current = false;
      clearTimers();
      inFlightRef.current = null;
    };
  }, [clearTimers]);

  useEffect(() => {
    if (!socket) return;

    const handleSaved = ({ noteId: savedNoteId, saveId }: NoteSaveAck) => {
      const inFlight = inFlightRef.current;

      // Only the acknowledgement of the exact save in flight for this note
      // counts. Anything else is a stale response and must be ignored.
      if (
        !inFlight ||
        inFlight.saveId !== saveId ||
        inFlight.noteId !== savedNoteId ||
        savedNoteId !== noteId
      ) {
        return;
      }

      inFlightRef.current = null;
      lastSavedContentRef.current = inFlight.content;
      setError(null);

      if (latestContentRef.current === inFlight.content) {
        setStatus('saved');
        return;
      }

      // The user typed while the request was in flight. Their newer text
      // stays in the editor and is sent by the pending debounce, or right
      // away if that debounce already fired while this save was in flight.
      setStatus('dirty');

      if (!timerRef.current) {
        flushRef.current();
      }
    };

    const handleFailed = ({
      operation,
      noteId: failedNoteId,
      saveId,
      code,
    }: NoteOperationFailedPayload) => {
      if (operation !== 'update' || failedNoteId !== noteId) return;

      const inFlight = inFlightRef.current;

      // A failure for a save that is no longer the one in flight is stale.
      if (!inFlight || inFlight.saveId !== saveId) return;

      inFlightRef.current = null;

      // If a newer local revision exists, keep it dirty and let its debounce
      // send the newest content. Otherwise retry the exact unsaved snapshot.
      console.error('[Note] save failed:', { noteId, saveId, code });
      setStatus('error');
      setError('Could not save. Retrying…');

      if (revisionRef.current === inFlight.revision) {
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          sendSnapshot();
        }, RETRY_DELAY_MS);
      } else {
        scheduleRef.current();
      }
    };

    socket.on('note:saved', handleSaved);
    socket.on('note:operation:failed', handleFailed);

    return () => {
      socket.off('note:saved', handleSaved);
      socket.off('note:operation:failed', handleFailed);
    };
  }, [noteId, sendSnapshot, socket]);

  // If the connection disappears while a snapshot is in flight, we cannot
  // know whether the server persisted it before the disconnect. Dropping the
  // in-flight record and re-sending the same content is safe and makes
  // reconnect recovery idempotent.
  useEffect(() => {
    if (isSocketConnected) return;

    if (inFlightRef.current) {
      inFlightRef.current = null;
      if (latestContentRef.current !== lastSavedContentRef.current) {
        setStatus('dirty');
      }
    }
  }, [isSocketConnected]);

  // If the socket was unavailable when the debounce expired, flush as soon as
  // it reconnects. No keystrokes are lost while disconnected.
  useEffect(() => {
    if (!isSocketConnected) return;
    if (latestContentRef.current === lastSavedContentRef.current) return;
    if (inFlightRef.current) return;

    sendSnapshot();
  }, [isSocketConnected, sendSnapshot]);

  useEffect(() => {
    const handlePageHide = () => exitFlushRef.current();

    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, []);

  return {
    status,
    error,
    onChange,
    flush: () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      flushRef.current();
    },
  };
}
