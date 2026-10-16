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

  const isFolder = node.data.kind === 'folder';

  const FolderIcon = node.isOpen ? FolderOpen : Folder;

  return (
    <div
      ref={dragHandle}
      style={style}
      className={cn(
        'group flex h-full cursor-pointer items-center gap-1.5 rounded-lg pr-2 text-sm transition-colors',
        'hover:bg-muted/70',
        node.isSelected && 'bg-muted text-foreground font-medium',
        node.willReceiveDrop && 'bg-primary/10 ring-primary/40 ring-1',
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
      <span className="text-muted-foreground flex size-4 shrink-0 items-center justify-center">
        {isFolder && (
          <ChevronRight
            className={cn(
              'size-3.5 transition-transform',
              node.isOpen && 'rotate-90',
            )}
          />
        )}
      </span>

      {isFolder ? (
        <FolderIcon className="text-primary size-4 shrink-0" />
      ) : (
        <FileText className="text-muted-foreground size-4 shrink-0" />
      )}

      {node.isEditing ? (
        <RenameInput
          defaultValue={node.data.name}
          onSubmit={(value) => node.submit(value)}
          onCancel={() => node.reset()}
        />
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate">{node.data.name}</span>

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
          'text-muted-foreground hover:bg-background hover:text-foreground flex size-6 shrink-0 items-center justify-center rounded-md',
          'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100',
        )}
      >
        <Ellipsis className="size-4" />
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
          <span className="text-muted-foreground ml-auto text-xs">F2</span>
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
      className="bg-background border-ring min-w-0 flex-1 rounded-md border px-1.5 py-0.5 text-sm outline-none"
    />
  );
}
