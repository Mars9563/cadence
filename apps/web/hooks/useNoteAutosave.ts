import {
  useContentAutosave,
  type ContentSaveStatus,
} from './useContentAutosave';

export type NoteSaveStatus = ContentSaveStatus;

type UseNoteAutosaveOptions = {
  noteId: string;
  initialContent: string;
  setStoreContent: (noteId: string, content: string) => void;
};

/** Autosave for a Note's content. See useContentAutosave. */
export function useNoteAutosave({
  noteId,
  initialContent,
  setStoreContent,
}: UseNoteAutosaveOptions) {
  return useContentAutosave({
    scope: 'note',
    docId: noteId,
    initialContent,
    setStoreContent,
  });
}
