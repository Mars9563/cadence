'use client';

import { useMemo, type ReactNode } from 'react';
import { toast } from 'sonner';
import { FilePlus, FolderPlus } from 'lucide-react';
import { Tree, type NodeApi } from 'react-arborist';
import { useResizeObserver } from 'use-resize-observer';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toUserMessage } from '@/lib/errors';
import {
  buildNoteTree,
  toNoteTreeEntries,
  type NoteTreeEntry,
} from '@/lib/noteTree';
import {
  useActiveNoteId,
  useCreateFolder,
  useFetchNotesTree,
  useFolders,
  useNotes,
  useNotesStatus,
  useOpenNoteTab,
  useUpdateFolder,
  useUpdateNote,
} from '@/store/selectors';

import { useMobileNotes } from '../../mobile/MobileNotesContext';
import { useNoteTree } from '../NoteTreeContext';
import { NoteTreeRow } from './NoteTreeRow';

/*
 * 30px rows. The indent equals the chevron column plus its gap (16 + 4), so
 * a child's chevron sits directly under its parent's folder icon.
 */
const ROW_HEIGHT = 30;
const INDENT = 20;

const NEW_FOLDER_NAME = 'New folder';

/**
 * True when `target` is `node` itself or sits somewhere beneath it.
 * Dropping a folder there would create a cycle.
 */
function isSelfOrDescendant(
  node: NodeApi<NoteTreeEntry>,
  target: NodeApi<NoteTreeEntry> | null,
): boolean {
  for (let current = target; current; current = current.parent) {
    if (current.id === node.id) return true;
  }

  return false;
}

export function FileSystemPanel() {
  const folders = useFolders();
  const notes = useNotes();
  const activeNoteId = useActiveNoteId();
  const notesStatus = useNotesStatus();
  const fetchNotesTree = useFetchNotesTree();

  const openNoteTab = useOpenNoteTab();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const updateNote = useUpdateNote();

  const { treeRef, createNoteIn } = useNoteTree();

  // Phones: the tree is a drawer that closes when a note opens.
  const mobile = useMobileNotes();

  /*
   * react-arborist is virtualised, so it needs real pixel dimensions.
   * The observer reports the size the flex layout gave this container.
   */
  const { ref: treeContainerRef, width, height } =
    useResizeObserver<HTMLDivElement>();

  /*
   * The tree is DERIVED from the flat store arrays and rebuilt only when
   * one of them changes. The root folder itself is not shown; its
   * contents are the top level, and "top level" means the root folder.
   */
  const root = useMemo(() => buildNoteTree(folders, notes), [folders, notes]);

  const data = useMemo(() => (root ? toNoteTreeEntries(root) : []), [root]);

  const rootFolderId = root?.folder.id ?? null;

  /** react-arborist uses parentId === null for the top level. */
  const toFolderId = (parentId: string | null) => parentId ?? rootFolderId;

  /**
   * The folder a row currently lives in. Top-level rows have react-arborist's
   * hidden internal root as their parent, which stands for our root folder.
   */
  const currentFolderIdOf = (node: NodeApi<NoteTreeEntry>) =>
    toFolderId(node.parent && !node.parent.isRoot ? node.parent.id : null);

  const reportError = (error: unknown, fallback: string) => {
    toast.error(toUserMessage(error, fallback));
  };

  /*
   * Header buttons. Both target "the current folder": a focused folder, or
   * the folder of a focused note, or the top level (root folder).
   *
   * +note goes through createNoteIn: the note opens in a tab with its
   * inline title selected (no tree rename).
   *
   * +folder goes through tree.create(), which calls onCreate below and then
   * puts the new row straight into rename mode in the tree.
   */
  const targetFolderId = () => {
    const focused = treeRef.current?.focusedNode;

    if (!focused) return rootFolderId;

    return focused.data.kind === 'folder'
      ? focused.id
      : currentFolderIdOf(focused);
  };

  const handleNewNoteClick = () => {
    void createNoteIn(targetFolderId());
  };

  const handleNewFolderClick = () => {
    void treeRef.current?.create({ type: 'internal' });
  };

  const handleCreate = async ({
    parentId,
    type,
  }: {
    parentId: string | null;
    type: 'internal' | 'leaf';
  }) => {
    // Notes are created through createNoteIn, never through tree.create().
    if (type !== 'internal') return null;

    const folderId = toFolderId(parentId);

    if (!folderId) return null;

    try {
      // Make sure the new row is visible before it enters rename mode.
      if (parentId) treeRef.current?.open(parentId);

      const folder = await createFolder({
        name: NEW_FOLDER_NAME,
        parentId: folderId,
      });

      return { id: folder.id };
    } catch (error) {
      reportError(error, 'Could not create the folder.');

      return null;
    }
  };

  const handleRename = async ({
    id,
    name,
    node,
  }: {
    id: string;
    name: string;
    node: NodeApi<NoteTreeEntry>;
  }) => {
    const trimmed = name.trim();

    // Empty or unchanged: nothing to save, the old name stays.
    if (!trimmed || trimmed === node.data.name) return;

    try {
      if (node.data.kind === 'folder') {
        await updateFolder(id, { name: trimmed });
      } else {
        await updateNote(id, { title: trimmed });
      }
    } catch (error) {
      reportError(error, 'Could not rename. The previous name was restored.');
    }
  };

  /*
   * Drag and drop only changes the PARENT. Order inside a folder is always
   * alphabetical, so the drop index is ignored.
   */
  const handleMove = async ({
    dragNodes,
    parentId,
  }: {
    dragNodes: NodeApi<NoteTreeEntry>[];
    parentId: string | null;
  }) => {
    const targetFolderId = toFolderId(parentId);

    if (!targetFolderId) return;

    const moves = dragNodes
      .filter((node) => currentFolderIdOf(node) !== targetFolderId)
      .map((node) =>
        node.data.kind === 'folder'
          ? updateFolder(node.id, { parentId: targetFolderId })
          : updateNote(node.id, { folderId: targetFolderId }),
      );

    const results = await Promise.allSettled(moves);

    const failed = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    if (failed) {
      reportError(failed.reason, 'Could not move. It was put back.');
    }
  };

  return (
    <section
      aria-label="Notes"
      className="bg-sidebar flex h-full w-full flex-col"
    >
      {/* Header, in the shared top band. */}
      <header className="flex h-(--cd-band-height) shrink-0 items-center gap-0.5 pr-2 pl-4">
        <h2 className="text-foreground flex-1 text-(length:--cd-text-ui) font-medium">
          Notes
        </h2>

        <HeaderButton label="New note" onClick={handleNewNoteClick}>
          <FilePlus />
        </HeaderButton>

        <HeaderButton label="New folder" onClick={handleNewFolderClick}>
          <FolderPlus />
        </HeaderButton>
      </header>

      {/* Tree */}
      {/*
       * F2 renames the focused row. Captured here because react-arborist's
       * own keyboard handling only maps Enter to rename.
       */}
      <div
        ref={treeContainerRef}
        className="relative min-h-0 flex-1 px-2 pb-2"
        onKeyDownCapture={(event) => {
          if (event.key !== 'F2') return;

          const focused = treeRef.current?.focusedNode;

          if (focused && !focused.isEditing) {
            event.preventDefault();
            void focused.edit();
          }
        }}
      >
        {width && height ? (
          <Tree<NoteTreeEntry>
            ref={treeRef}
            data={data}
            width={width}
            height={height}
            rowHeight={ROW_HEIGHT}
            indent={INDENT}
            /*
             * react-arborist gives every row an inline
             * `min-width: max-content`, which lets long names widen the row
             * (and the list) instead of truncating. Rows must fit the panel.
             */
            rowClassName="min-w-0! outline-none"
            className="outline-none"
            openByDefault={false}
            disableMultiSelection
            selection={activeNoteId ?? undefined}
            onCreate={handleCreate}
            onRename={handleRename}
            onMove={handleMove}
            disableDrop={({ parentNode, dragNodes }) =>
              dragNodes.some((node) => isSelfOrDescendant(node, parentNode))
            }
            onActivate={(node) => {
              // Always a new tab (or focus the tab it is already open in).
              if (node.data.kind === 'note') {
                openNoteTab(node.id);
                mobile?.closeTree();
              }
            }}
            aria-label="Notes and folders"
          >
            {NoteTreeRow}
          </Tree>
        ) : null}

        {data.length === 0 && notesStatus === 'error' && (
          <div
            role="alert"
            className="absolute inset-x-0 top-0 flex flex-col items-center gap-3 px-6 pt-10 text-center"
          >
            <div className="space-y-1">
              <p className="text-foreground text-(length:--cd-text-ui) font-medium">
                Your notes didn’t load
              </p>
              <p className="text-muted-foreground text-(length:--cd-text-meta) leading-relaxed">
                They load again by themselves when Cadence reconnects.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="text-(length:--cd-text-ui)"
              onClick={() => void fetchNotesTree()}
            >
              Try again
            </Button>
          </div>
        )}

        {data.length === 0 && notesStatus !== 'error' && (
          <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-3 px-6 pt-10 text-center">
            <div className="space-y-1">
              <p className="text-foreground text-(length:--cd-text-ui) font-medium">
                No notes yet
              </p>
              <p className="text-muted-foreground text-(length:--cd-text-meta) leading-relaxed">
                Notes and folders you create appear here.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="text-(length:--cd-text-ui)"
              onClick={handleNewNoteClick}
            >
              <FilePlus />
              New note
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function HeaderButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            className="text-muted-foreground hover:bg-fill-hover dark:hover:bg-fill-hover hover:text-foreground size-7 rounded-md"
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>

      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
