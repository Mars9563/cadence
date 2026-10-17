import {
  useContentAutosave,
  type ContentSaveStatus,
} from './useContentAutosave';

export type DailyNoteSaveStatus = ContentSaveStatus;

type UseDailyNoteAutosaveOptions = {
  noteId: string;
  initialContent: string;
  setStoreContent: (noteId: string, content: string) => void;
};

/** Autosave for a Daily Note's content. See useContentAutosave. */
export function useDailyNoteAutosave({
  noteId,
  initialContent,
  setStoreContent,
}: UseDailyNoteAutosaveOptions) {
  return useContentAutosave({
    scope: 'daily',
    docId: noteId,
    initialContent,
    setStoreContent,
  });
}
