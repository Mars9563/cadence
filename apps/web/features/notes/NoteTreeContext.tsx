'use client';

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import type { TreeApi } from 'react-arborist';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toUserMessage } from '@/lib/errors';
import type { NoteTreeEntry } from '@/lib/noteTree';
import { useCadenceStore } from '@/store/store';
import {
  useCreateNote,
  useDeleteFolder,
  useDeleteNote,
  useOpenNoteTab,
  useSetNoteContent,
} from '@/store/selectors';

const NEW_NOTE_TITLE = 'Untitled';

type NoteTreeContextValue = {
  /**
   * The react-arborist instance, set by FileSystemPanel. Anything outside
   * the tree (e.g. the editor's "New note" button) drives it through this.
   */
  treeRef: RefObject<TreeApi<NoteTreeEntry> | null>;

  /**
   * Delete a row. Notes and EMPTY folders go immediately; a folder with
   * contents asks for confirmation first.
   */
  requestDelete: (entry: NoteTreeEntry) => void;

  /**
   * Create an "Untitled" note in `folderId` (null = the root folder), open
   * it in a new tab and select its inline title so it can be named
   * straight away. The tree reveals and highlights it.
   */
  createNoteIn: (folderId: string | null) => Promise<void>;
};

const NoteTreeContext = createContext<NoteTreeContextValue | null>(null);

export function useNoteTree() {
  const context = useContext(NoteTreeContext);

  if (!context) {
    throw new Error('useNoteTree must be used inside <NoteTreeProvider>.');
  }

  return context;
}

/** Everything nested under a folder entry, at any depth. */
function countContents(entry: NoteTreeEntry) {
  let folders = 0;
  let notes = 0;

  const toVisit = [...(entry.children ?? [])];

  while (toVisit.length > 0) {
    const current = toVisit.pop()!;

    if (current.kind === 'folder') {
      folders += 1;
      toVisit.push(...(current.children ?? []));
    } else {
      notes += 1;
    }
  }

  return { folders, notes };
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export function NoteTreeProvider({ children }: { children: ReactNode }) {
  const treeRef = useRef<TreeApi<NoteTreeEntry> | null>(null);

  const deleteFolder = useDeleteFolder();
  const deleteNote = useDeleteNote();
  const createNote = useCreateNote();
  const openNoteTab = useOpenNoteTab();
  const setNoteContent = useSetNoteContent();

  const createNoteIn = async (folderId: string | null) => {
    const targetFolderId =
      folderId ??
      useCadenceStore.getState().folders.find((folder) => folder.isRoot)?.id;

    if (!targetFolderId) return;

    try {
      const note = await createNote({
        folderId: targetFolderId,
        title: NEW_NOTE_TITLE,
        content: '',
      });

      // A brand-new note is known to be empty: its tab opens without a fetch.
      setNoteContent(note.id, '');
      openNoteTab(note.id, { focusTitle: true });

      // The tree re-renders with the new row first; then open its folders.
      setTimeout(() => treeRef.current?.get(note.id)?.openParents());
    } catch (error) {
      toast.error(toUserMessage(error, 'Could not create the note.'));
    }
  };

  const [pendingDelete, setPendingDelete] = useState<NoteTreeEntry | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const performDelete = async (entry: NoteTreeEntry) => {
    try {
      if (entry.kind === 'folder') {
        await deleteFolder(entry.id);
      } else {
        await deleteNote(entry.id);
      }
    } catch (error) {
      toast.error(toUserMessage(error, `Could not delete “${entry.name}”.`));
    }
  };

  const requestDelete = (entry: NoteTreeEntry) => {
    const isNonEmptyFolder =
      entry.kind === 'folder' && (entry.children?.length ?? 0) > 0;

    if (isNonEmptyFolder) {
      setPendingDelete(entry);
      return;
    }

    void performDelete(entry);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    setIsDeleting(true);

    try {
      await performDelete(pendingDelete);
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  };

  const contents = pendingDelete ? countContents(pendingDelete) : null;

  return (
    <NoteTreeContext.Provider value={{ treeRef, requestDelete, createNoteIn }}>
      {children}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.name}”?</AlertDialogTitle>

            <AlertDialogDescription>
              {contents &&
                `This folder contains ${[
                  contents.folders > 0 && plural(contents.folders, 'folder'),
                  contents.notes > 0 && plural(contents.notes, 'note'),
                ]
                  .filter(Boolean)
                  .join(' and ')}. Everything inside it will be deleted. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>

            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </NoteTreeContext.Provider>
  );
}
