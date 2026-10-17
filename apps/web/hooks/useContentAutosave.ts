import { useCallback, useEffect, useRef, useState } from 'react';

import { draftKey, type DraftScope } from '@/lib/sync/types';
import { useCadenceStore } from '@/store/store';

export type ContentSaveStatus =
  | 'idle'
  | 'dirty'
  | 'saving'
  | 'saved'
  | 'offline'
  | 'error';

type UseContentAutosaveOptions = {
  scope: DraftScope;
  docId: string;

  /** What the editor starts with (a pending draft if there is one). */
  initialContent: string;

  /** Mirror of the live text in the store (used when a tab reopens). */
  setStoreContent: (docId: string, content: string) => void;
};

/** Typing pause before the text is handed to the sync engine. */
const AUTOSAVE_DELAY_MS = 800;

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_NOTE_CONTENT: 'This note is too large to save.',
  INVALID_DAILY_NOTE_CONTENT: 'This daily note is too large to save.',
};

/**
 * Autosave for one open document (a note or a Daily Note).
 *
 * The editor stays the live source of truth. After a short typing pause the
 * text becomes a *draft* in the sync engine (store/slices/syncSlice), which:
 *
 *   - writes it to localStorage immediately, so a reload, a closed tab or a
 *     crash cannot lose it;
 *   - sends it over the socket when online, and again after reconnecting;
 *   - removes it only when the server confirmed that exact revision.
 *
 * Unmounting (closing a tab) and the page being hidden commit any text still
 * inside the typing pause, synchronously, so nothing typed is ever lost.
 *
 * Status, for the indicator:
 *   dirty    typing; not handed over yet
 *   saving   handed over; on its way to the server (or about to be)
 *   offline  stored on this device; will sync when the connection is back
 *   error    the server refused it (too large), or saving is retrying
 *   saved    the server has the latest text
 */
export function useContentAutosave({
  scope,
  docId,
  initialContent,
  setStoreContent,
}: UseContentAutosaveOptions) {
  const key = draftKey(scope, docId);

  const hasDraft = useCadenceStore((s) => s.drafts[key] !== undefined);
  const inFlight = useCadenceStore((s) => s.draftsInFlight[key] !== undefined);
  const draftError = useCadenceStore((s) => s.draftErrors[key]);
  const isConnected = useCadenceStore((s) => s.isSocketConnected);
  const isRetrying = useCadenceStore((s) => s.syncRetryAt !== null);

  const [typing, setTyping] = useState(false);
  const [touched, setTouched] = useState(hasDraft);

  const latestRef = useRef(initialContent);
  const committedRef = useRef(initialContent);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Hand the latest text to the sync engine now. Safe to call anytime. */
  const commit = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (latestRef.current !== committedRef.current) {
      committedRef.current = latestRef.current;
      useCadenceStore.getState().saveDraft(scope, docId, latestRef.current);
    }

    setTyping(false);
  }, [docId, scope]);

  const onChange = useCallback(
    (content: string, initialMarkdownNormalize = false) => {
      // MDXEditor reports its initial markdown normalization through
      // onChange. That is initialization, not a user edit.
      if (initialMarkdownNormalize) return;

      latestRef.current = content;
      setStoreContent(docId, content);
      setTouched(true);
      setTyping(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(commit, AUTOSAVE_DELAY_MS);
    },
    [commit, docId, setStoreContent],
  );

  // Closing the tab / switching away: commit what is still in the pause.
  useEffect(() => {
    const handleHidden = () => {
      if (document.visibilityState === 'hidden') commit();
    };

    window.addEventListener('pagehide', commit);
    document.addEventListener('visibilitychange', handleHidden);

    return () => {
      window.removeEventListener('pagehide', commit);
      document.removeEventListener('visibilitychange', handleHidden);
      commit();
    };
  }, [commit]);

  let status: ContentSaveStatus;
  let error: string | null = null;

  if (draftError) {
    status = 'error';
    error = ERROR_MESSAGES[draftError] ?? 'The server refused this text.';
  } else if (typing) {
    status = 'dirty';
  } else if (hasDraft) {
    if (!isConnected) {
      status = 'offline';
    } else if (isRetrying && !inFlight) {
      status = 'error';
      error = 'Could not save. Retrying…';
    } else {
      status = 'saving';
    }
  } else {
    status = touched ? 'saved' : 'idle';
  }

  return { status, error, onChange, flush: commit };
}
