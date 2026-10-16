import { StateCreator } from 'zustand';

import type { CadenceAppStore } from '../types';

export type NoteTab = {
  noteId: string;

  /** Per-tab reading mode. Tabs open editable. */
  readOnly: boolean;
};

export interface noteTabsState {
  /** Open tabs, in tab-bar order. */
  noteTabs: NoteTab[];

  /** The tab shown in the editor area (also highlighted in the tree). */
  activeNoteId: string | null;

  /**
   * Last known Markdown per note, mirrored from the editor on every change
   * (same idea as the Daily Note store mirror).
   *
   * Re-opening a tab starts from this instead of re-fetching, so a tab
   * closed a moment ago never reloads content its final save has not
   * reached the server with yet.
   */
  noteContents: Record<string, string>;

  /**
   * One-shot request: the editor for this note focuses and selects its
   * inline title once it is ready, then clears the request. Used right
   * after creating a note so the user can type its name immediately.
   */
  titleFocusNoteId: string | null;

  /** Whether tabs were restored from this browser for the current user. */
  noteTabsRestored: boolean;

  /** Open the note in a new tab, or focus the tab it is already in. */
  openNoteTab: (noteId: string, options?: { focusTitle?: boolean }) => void;

  /** Close a tab; the neighbour to its right (else left) becomes active. */
  closeNoteTab: (noteId: string) => void;

  /** Close every tab for these notes (used when notes are deleted). */
  closeNoteTabsFor: (noteIds: Set<string>) => void;

  setActiveNoteTab: (noteId: string) => void;

  toggleNoteTabReadOnly: (noteId: string) => void;

  setNoteContent: (noteId: string, content: string) => void;

  clearTitleFocusRequest: () => void;

  /**
   * Restore the tabs saved in this browser, dropping any whose note no
   * longer exists. Runs once, after notes and the profile have loaded.
   */
  restoreNoteTabs: () => void;

  resetNoteTabs: () => void;
}

const initialNoteTabsState = {
  noteTabs: [] as NoteTab[],
  activeNoteId: null as string | null,
  noteContents: {} as Record<string, string>,
  titleFocusNoteId: null as string | null,
  noteTabsRestored: false,
};

/* ── persistence (per user, per browser) ───────────────────────────────── */

type PersistedNoteTabs = {
  tabs: NoteTab[];
  activeNoteId: string | null;
};

const storageKey = (userId: string) => `cadence:note-tabs:${userId}`;

function readPersistedTabs(userId: string): PersistedNoteTabs | null {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));

    return raw ? (JSON.parse(raw) as PersistedNoteTabs) : null;
  } catch {
    return null;
  }
}

function writePersistedTabs(state: CadenceAppStore) {
  // Never overwrite saved tabs with the empty pre-restore state.
  if (!state.user || !state.noteTabsRestored) return;

  const persisted: PersistedNoteTabs = {
    tabs: state.noteTabs,
    activeNoteId: state.activeNoteId,
  };

  try {
    window.localStorage.setItem(
      storageKey(state.user.id),
      JSON.stringify(persisted),
    );
  } catch {
    // Storage full or blocked: tabs just won't survive a reload.
  }
}

export const CreateNoteTabsSlice: StateCreator<
  CadenceAppStore,
  [],
  [],
  noteTabsState
> = (set, get) => {
  /** Apply a tab change, then save the result. */
  const setTabs = (
    update: (
      state: CadenceAppStore,
    ) => Pick<noteTabsState, 'noteTabs' | 'activeNoteId'>,
  ) => {
    set((state) => update(state));
    writePersistedTabs(get());
  };

  return {
    ...initialNoteTabsState,

    openNoteTab: (noteId, options) => {
      setTabs((state) => ({
        noteTabs: state.noteTabs.some((tab) => tab.noteId === noteId)
          ? state.noteTabs
          : [...state.noteTabs, { noteId, readOnly: false }],
        activeNoteId: noteId,
      }));

      if (options?.focusTitle) {
        set({ titleFocusNoteId: noteId });
      }
    },

    closeNoteTab: (noteId) => {
      setTabs((state) => {
        const index = state.noteTabs.findIndex((tab) => tab.noteId === noteId);

        if (index === -1) {
          return state;
        }

        const noteTabs = state.noteTabs.filter((tab) => tab.noteId !== noteId);

        if (state.activeNoteId !== noteId) {
          return { noteTabs, activeNoteId: state.activeNoteId };
        }

        const neighbour = noteTabs[index] ?? noteTabs[index - 1] ?? null;

        return { noteTabs, activeNoteId: neighbour?.noteId ?? null };
      });
    },

    closeNoteTabsFor: (noteIds) => {
      if (noteIds.size === 0) return;

      setTabs((state) => {
        const noteTabs = state.noteTabs.filter(
          (tab) => !noteIds.has(tab.noteId),
        );

        const activeStillOpen = noteTabs.some(
          (tab) => tab.noteId === state.activeNoteId,
        );

        return {
          noteTabs,
          activeNoteId: activeStillOpen
            ? state.activeNoteId
            : (noteTabs.at(-1)?.noteId ?? null),
        };
      });

      set((state) => {
        const noteContents = { ...state.noteContents };

        for (const id of noteIds) delete noteContents[id];

        return { noteContents };
      });
    },

    setActiveNoteTab: (noteId) => {
      setTabs((state) => ({
        noteTabs: state.noteTabs,
        activeNoteId: noteId,
      }));
    },

    toggleNoteTabReadOnly: (noteId) => {
      setTabs((state) => ({
        noteTabs: state.noteTabs.map((tab) =>
          tab.noteId === noteId ? { ...tab, readOnly: !tab.readOnly } : tab,
        ),
        activeNoteId: state.activeNoteId,
      }));
    },

    setNoteContent: (noteId, content) => {
      set((state) => ({
        noteContents: { ...state.noteContents, [noteId]: content },
      }));
    },

    clearTitleFocusRequest: () => {
      set({ titleFocusNoteId: null });
    },

    restoreNoteTabs: () => {
      const { user, notes, noteTabsRestored } = get();

      if (noteTabsRestored || !user) return;

      const persisted = readPersistedTabs(user.id);
      const existingIds = new Set(notes.map((note) => note.id));

      const tabs = (persisted?.tabs ?? []).filter((tab) =>
        existingIds.has(tab.noteId),
      );

      const activeNoteId =
        persisted?.activeNoteId &&
        tabs.some((tab) => tab.noteId === persisted.activeNoteId)
          ? persisted.activeNoteId
          : (tabs.at(-1)?.noteId ?? null);

      set({
        noteTabs: tabs,
        activeNoteId,
        noteTabsRestored: true,
      });

      // Saves the pruned list, so deleted notes do not linger in storage.
      writePersistedTabs(get());
    },

    resetNoteTabs: () => {
      set({
        ...initialNoteTabsState,
      });
    },
  };
};
