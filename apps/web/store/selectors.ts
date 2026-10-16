import { DEFAULT_DAY_END_TIME } from '@/lib/cadenceDate';
import { useCadenceStore } from './store';

// ui selectors ----

export const useViewMode = () => useCadenceStore((s) => s.ViewMode);

export const useSetViewMode = () => useCadenceStore((s) => s.setViewMode);

export const useSignOutModalOpen = () =>
  useCadenceStore((s) => s.signOutModalOpen);

export const useSetSignOutModalOpen = () =>
  useCadenceStore((s) => s.setSignOutModalOpen);

export const useCurrentDateTime = () =>
  useCadenceStore((s) => s.currentDateTime);

export const useSetCurrentDateTime = () =>
  useCadenceStore((s) => s.setCurrentDateTime);

export const useCadenceDayEnd = () => useCadenceStore((s) => s.cadenceDayEnd);

export const useSetCadenceDayEnd = () =>
  useCadenceStore((s) => s.setCadenceDayEnd);

export const useSelectedDate = () => useCadenceStore((s) => s.selectedDate);

export const useSetSelectedDate = () =>
  useCadenceStore((s) => s.setSelectedDate);

// auth selectors ----

export const useUser = () => useCadenceStore((s) => s.user);

export const useIsAuthenticated = () =>
  useCadenceStore((s) => s.isAuthenticated);

export const useSetUser = () => useCadenceStore((s) => s.setUser);

export const useSetIsAuthenticated = () =>
  useCadenceStore((s) => s.setIsAuthenticated);

/**
 * The user's day boundary ('HH:MM:SS');
 * the default until the profile loads.
 */
export const useDayEndTime = () =>
  useCadenceStore((s) => s.user?.dayEndTime ?? DEFAULT_DAY_END_TIME);

// items selectors ----

export const useNormalItems = () => useCadenceStore((s) => s.normalItems);

export const useTaskItems = () => useCadenceStore((s) => s.taskItems);

export const useHabitItems = () => useCadenceStore((s) => s.habitItems);

export const useItemsStatus = () => useCadenceStore((s) => s.itemsStatus);

export const useItemsError = () => useCadenceStore((s) => s.itemsError);

/** Items are loaded AND the profile is available. */
export const useItemsReady = () =>
  useCadenceStore((s) => s.itemsStatus === 'ready' && s.user !== null);

export const useFetchItems = () => useCadenceStore((s) => s.fetchItems);

export const useAddNormalItem = () => useCadenceStore((s) => s.addNormalItem);

export const useAddTaskItem = () => useCadenceStore((s) => s.addTaskItem);

export const useAddHabitItem = () => useCadenceStore((s) => s.addHabitItem);

export const useUpdateNormalItem = () =>
  useCadenceStore((s) => s.updateNormalItem);

export const useUpdateTaskItem = () => useCadenceStore((s) => s.updateTaskItem);

export const useResetItems = () => useCadenceStore((s) => s.resetItems);

// socket selectors ----

export const useIsSocketConnected = () =>
  useCadenceStore((s) => s.isSocketConnected);

export const useIsSocketConnecting = () =>
  useCadenceStore((s) => s.isSocketConnecting);

export const useSocket = () => useCadenceStore((s) => s.socket);

export const useConnectSocket = () => useCadenceStore((s) => s.connectSocket);

export const useDisconnectSocket = () =>
  useCadenceStore((s) => s.disconnectSocket);

// habit completion selectors ----

export const useHabitCompletions = () =>
  useCadenceStore((s) => s.habitCompletions);

export const useHabitCompletionsStatus = () =>
  useCadenceStore((s) => s.habitCompletionsStatus);

export const useHabitCompletionsError = () =>
  useCadenceStore((s) => s.habitCompletionsError);

export const useHabitCompletionsReady = () =>
  useCadenceStore((s) => s.habitCompletionsStatus === 'ready');

export const useFetchHabitCompletions = () =>
  useCadenceStore((s) => s.fetchHabitCompletions);

export const useUpsertHabitCompletion = () =>
  useCadenceStore((s) => s.upsertHabitCompletion);

export const useRemoveHabitCompletion = () =>
  useCadenceStore((s) => s.removeHabitCompletion);

export const useResetHabitCompletions = () =>
  useCadenceStore((s) => s.resetHabitCompletions);

// completion loading selectors ----

export const usePendingCompletionItemIds = () =>
  useCadenceStore((s) => s.pendingCompletionItemIds);

export const useIsItemCompletionPending = (itemId: string) =>
  useCadenceStore((s) => s.pendingCompletionItemIds.includes(itemId));

export const useMarkItemCompletionPending = () =>
  useCadenceStore((s) => s.markItemCompletionPending);

export const useClearItemCompletionPending = () =>
  useCadenceStore((s) => s.clearItemCompletionPending);

// socket completion ----

export const useCompleteItem = () => useCadenceStore((s) => s.completeItem);


// daily note selectors ----

export const useDailyNotes = () =>
  useCadenceStore((s) => s.dailyNotes);

export const useDailyNotesStatus = () =>
  useCadenceStore((s) => s.dailyNotesStatus);

export const useDailyNotesError = () =>
  useCadenceStore((s) => s.dailyNotesError);

export const useDailyNotesReady = () =>
  useCadenceStore((s) => s.dailyNotesStatus === 'ready');

export const useFetchDailyNotes = () =>
  useCadenceStore((s) => s.fetchDailyNotes);

export const useEnsureTodayDailyNote = () =>
  useCadenceStore((s) => s.ensureTodayDailyNote);

export const useUpsertDailyNote = () =>
  useCadenceStore((s) => s.upsertDailyNote);

export const useSetDailyNoteContent = () =>
  useCadenceStore((s) => s.setDailyNoteContent);

export const useResetDailyNotes = () =>
  useCadenceStore((s) => s.resetDailyNotes);

// notes (folders + notes) selectors ----

export const useFolders = () => useCadenceStore((s) => s.folders);

export const useNotes = () => useCadenceStore((s) => s.notes);

export const useNotesStatus = () => useCadenceStore((s) => s.notesStatus);

export const useNotesError = () => useCadenceStore((s) => s.notesError);

export const useNotesReady = () =>
  useCadenceStore((s) => s.notesStatus === 'ready');

export const useFetchNotesTree = () =>
  useCadenceStore((s) => s.fetchNotesTree);

export const useUpsertFolder = () => useCadenceStore((s) => s.upsertFolder);

export const useRemoveFolder = () => useCadenceStore((s) => s.removeFolder);

export const useUpsertNote = () => useCadenceStore((s) => s.upsertNote);

export const useRemoveNote = () => useCadenceStore((s) => s.removeNote);

export const useResetNotes = () => useCadenceStore((s) => s.resetNotes);


export const useCreateFolder = () => useCadenceStore((s) => s.createFolder);

export const useCreateNote = () => useCadenceStore((s) => s.createNote);

export const useUpdateFolder = () => useCadenceStore((s) => s.updateFolder);

export const useUpdateNote = () => useCadenceStore((s) => s.updateNote);

export const useDeleteFolder = () => useCadenceStore((s) => s.deleteFolder);

export const useDeleteNote = () => useCadenceStore((s) => s.deleteNote);

// note tabs selectors ----

export const useNoteTabs = () => useCadenceStore((s) => s.noteTabs);

export const useActiveNoteId = () => useCadenceStore((s) => s.activeNoteId);

export const useNoteTab = (noteId: string) =>
  useCadenceStore((s) => s.noteTabs.find((tab) => tab.noteId === noteId));

export const useNoteSummary = (noteId: string) =>
  useCadenceStore((s) => s.notes.find((note) => note.id === noteId));

export const useOpenNoteTab = () => useCadenceStore((s) => s.openNoteTab);

export const useCloseNoteTab = () => useCadenceStore((s) => s.closeNoteTab);

export const useSetActiveNoteTab = () =>
  useCadenceStore((s) => s.setActiveNoteTab);

export const useToggleNoteTabReadOnly = () =>
  useCadenceStore((s) => s.toggleNoteTabReadOnly);

export const useSetNoteContent = () => useCadenceStore((s) => s.setNoteContent);

export const useTitleFocusNoteId = () =>
  useCadenceStore((s) => s.titleFocusNoteId);

export const useClearTitleFocusRequest = () =>
  useCadenceStore((s) => s.clearTitleFocusRequest);

export const useRestoreNoteTabs = () =>
  useCadenceStore((s) => s.restoreNoteTabs);
