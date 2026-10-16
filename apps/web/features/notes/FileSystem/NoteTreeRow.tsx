'use client';

import type { NodeRendererProps } from 'react-arborist';
import {
  ChevronRight,
  Ellipsis,
  FileText,
  Folder,
  FolderOpen,
  Pencil,
  Trash2,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { NoteTreeEntry } from '@/lib/noteTree';
import { useActiveNoteId } from '@/store/selectors';

import { useNoteTree } from '../NoteTreeContext';

/**
 * Renders one row of the file-system tree.
 *
 * react-arborist owns the behaviour (selection, drag and drop, keyboard,
 * edit mode); this component only draws the row for the state it reports.
 * `style` carries the indentation for the row's depth and must be applied.
 */
export function NoteTreeRow({
  node,
  style,
  dragHandle,
}: NodeRendererProps<NoteTreeEntry>) {
  const { requestDelete } = useNoteTree();
  const activeNoteId = useActiveNoteId();

  const isFolder = node.data.kind === 'folder';

  /*
   * "Open" (shown in the editor) is tracked separately from react-arborist's
   * selection: clicking a folder selects it, but the open note should stay
   * marked so the tree always shows where the editor is.
   */
  const isOpenNote = !isFolder && node.id === activeNoteId;

  const FolderIcon = node.isOpen ? FolderOpen : Folder;

  return (
    <div
      ref={dragHandle}
      style={style}
      data-open-note={isOpenNote || undefined}
      className={cn(
        'group text-muted-foreground relative flex h-full cursor-pointer items-center gap-1 rounded-md pr-1 text-(length:--cd-text-ui) transition-colors duration-(--cd-duration-fast) select-none',
        'hover:bg-fill-hover hover:text-foreground',
        node.isSelected && !isOpenNote && 'bg-fill-hover text-foreground',
        isOpenNote &&
          'bg-fill-selected text-foreground hover:bg-fill-selected before:bg-primary before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full',
        /* Keyboard focus: only while the tree itself is keyboard-focused. */
        node.isFocused &&
          'in-focus-visible:ring-primary/60 in-focus-visible:ring-1 in-focus-visible:ring-inset',
        node.willReceiveDrop && 'bg-primary/10 ring-primary/40 ring-1 ring-inset',
        node.isDragging && 'opacity-50',
      )}
      onClick={() => {
        if (isFolder) node.toggle();
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        void node.edit();
      }}
    >
      {/* Chevron column; notes keep the space so names line up. */}
      <span className="text-faint-foreground flex size-4 shrink-0 items-center justify-center pl-1 box-content">
        {isFolder && (
          <ChevronRight
            aria-hidden="true"
            className={cn(
              'size-3.5 transition-transform duration-(--cd-duration-base) ease-(--cd-ease)',
              node.isOpen && 'rotate-90',
            )}
          />
        )}
      </span>

      {isFolder ? (
        <FolderIcon
          aria-hidden="true"
          className="text-faint-foreground group-hover:text-muted-foreground size-4 shrink-0 transition-colors"
        />
      ) : (
        <FileText
          aria-hidden="true"
          className={cn(
            'size-4 shrink-0 transition-colors',
            isOpenNote
              ? 'text-muted-foreground'
              : 'text-faint-foreground group-hover:text-muted-foreground',
          )}
        />
      )}

      {node.isEditing ? (
        <RenameInput
          defaultValue={node.data.name}
          onSubmit={(value) => node.submit(value)}
          onCancel={() => node.reset()}
        />
      ) : (
        <>
          <span className="ml-1 min-w-0 flex-1 truncate" title={node.data.name}>
            {node.data.name}
          </span>

          <RowMenu
            onRename={() => void node.edit()}
            onDelete={() => requestDelete(node.data)}
          />
        </>
      )}
    </div>
  );
}

/**
 * The ⋯ button, visible on hover (and while its menu is open).
 */
function RowMenu({
  onRename,
  onDelete,
}: {
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="More actions"
        // Keep clicks on the button from toggling/selecting the row.
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        className={cn(
          'text-muted-foreground hover:bg-fill-selected hover:text-foreground data-popup-open:bg-fill-selected data-popup-open:text-foreground flex size-6 shrink-0 items-center justify-center rounded-sm transition-opacity',
          'focus-visible:ring-primary/60 outline-none focus-visible:ring-1',
          'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100',
        )}
      >
        <Ellipsis aria-hidden="true" className="size-4" />
      </DropdownMenuTrigger>

      {/*
       * finalFocus={false}: when the menu closes it must NOT move focus back
       * to the ⋯ button, or the rename input that just opened would lose
       * focus and submit immediately.
       */}
      <DropdownMenuContent
        align="end"
        className="w-40"
        finalFocus={false}
        // The menu is portalled, but React still bubbles its clicks to the row.
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuItem onClick={onRename}>
          <Pencil />
          Rename
          <kbd className="text-muted-foreground ml-auto font-sans text-(length:--cd-text-meta)">
            F2
          </kbd>
        </DropdownMenuItem>

        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RenameInput({
  defaultValue,
  onSubmit,
  onCancel,
}: {
  defaultValue: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  return (
    <input
      autoFocus
      defaultValue={defaultValue}
      onFocus={(event) => event.currentTarget.select()}
      onClick={(event) => event.stopPropagation()}
      onBlur={(event) => onSubmit(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onSubmit(event.currentTarget.value);
        if (event.key === 'Escape') onCancel();
      }}
      aria-label="Name"
      className="bg-background border-primary/60 text-foreground ml-0.5 h-6 min-w-0 flex-1 rounded-sm border px-1.5 text-(length:--cd-text-ui) outline-none"
    />
  );
}
