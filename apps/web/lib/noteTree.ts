import type { Folder, NoteSummary } from '@cadence/types';

export type FolderTreeNode = {
  folder: Folder;
  childFolders: FolderTreeNode[];
  notes: NoteSummary[];
};

/*
 * numeric: "Note 2" sorts before "Note 10".
 * sensitivity 'base': "apple" and "Apple" sort together.
 */
const compareNames = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

/**
 * Builds the folder/note tree from the flat lists in the store.
 *
 * Orphans (a folder whose parent, or a note whose folder, is not in
 * `folders`) are skipped. Returns null when there is no root folder yet.
 * Throws if more than one root exists, which the database forbids.
 */
export function buildNoteTree(
  folders: Folder[],
  notes: NoteSummary[],
): FolderTreeNode | null {
  const nodesById = new Map<string, FolderTreeNode>();

  // 1. One empty node per folder, before any linking.
  for (const folder of folders) {
    nodesById.set(folder.id, {
      folder,
      childFolders: [],
      notes: [],
    });
  }

  // 2. Link each folder into its parent's childFolders.
  let root: FolderTreeNode | null = null;

  for (const folder of folders) {
    const node = nodesById.get(folder.id)!;

    if (folder.isRoot) {
      if (root) {
        throw new Error('Multiple root folders found.');
      }

      root = node;
      continue;
    }

    if (folder.parentId === null) continue;

    // Orphan: parent missing -> skipped (its whole subtree is unreachable).
    nodesById.get(folder.parentId)?.childFolders.push(node);
  }

  // 3. Drop each note into its folder. Orphans are skipped.
  for (const note of notes) {
    nodesById.get(note.folderId)?.notes.push(note);
  }

  // 4. Folders by name, notes by title, at every level.
  for (const node of nodesById.values()) {
    node.childFolders.sort((a, b) => compareNames(a.folder.name, b.folder.name));
    node.notes.sort((a, b) => compareNames(a.title, b.title));
  }

  return root;
}

/**
 * One row in the file-system tree view (react-arborist's data shape).
 *
 * Folders ALWAYS have a `children` array, even an empty one: that is how
 * react-arborist tells an openable, droppable folder apart from a leaf.
 * Notes have no `children`, so they render as leaves.
 */
export type NoteTreeEntry = {
  id: string;
  name: string;
  kind: 'folder' | 'note';
  children?: NoteTreeEntry[];
};

/**
 * Converts a built folder node into tree-view entries: sub-folders first,
 * then notes, keeping the order buildNoteTree already sorted them in.
 *
 * Pass the ROOT node to get the top level. The root itself is not shown;
 * its contents are the top level of the tree.
 */
export function toNoteTreeEntries(node: FolderTreeNode): NoteTreeEntry[] {
  return [
    ...node.childFolders.map((child) => ({
      id: child.folder.id,
      name: child.folder.name,
      kind: 'folder' as const,
      children: toNoteTreeEntries(child),
    })),
    ...node.notes.map((note) => ({
      id: note.id,
      name: note.title,
      kind: 'note' as const,
    })),
  ];
}
