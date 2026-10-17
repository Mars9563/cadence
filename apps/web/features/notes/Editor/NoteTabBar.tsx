'use client';

import { useEffect, useRef } from 'react';
import { FileText, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { NoteTab } from '@/store/slices/noteTabsSlice';
import {
  useActiveNoteId,
  useCloseNoteTab,
  useNoteSummary,
  useNoteTabs,
  useSetActiveNoteTab,
} from '@/store/selectors';

/**
 * Open notes as tabs. Click to switch, × or middle-click to close.
 * Scrolls horizontally when there are more tabs than fit.
 */
export function NoteTabBar() {
  const tabs = useNoteTabs();

  return (
    <div
      role="tablist"
      aria-label="Open notes"
      className="bg-sidebar flex h-(--cd-band-height) shrink-0 items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-border/70 px-2 [scrollbar-color:transparent_transparent] hover:[scrollbar-color:var(--cd-border-subtle)_transparent]"
    >
      {tabs.map((tab) => (
        <NoteTabButton key={tab.noteId} tab={tab} />
      ))}
    </div>
  );
}

function NoteTabButton({ tab }: { tab: NoteTab }) {
  const note = useNoteSummary(tab.noteId);
  const activeNoteId = useActiveNoteId();
  const setActiveNoteTab = useSetActiveNoteTab();
  const closeNoteTab = useCloseNoteTab();

  const isActive = activeNoteId === tab.noteId;
  const title = note?.title ?? 'Untitled';

  const tabRef = useRef<HTMLDivElement>(null);

  // Keep the active tab visible when it changes (e.g. opened from the tree).
  useEffect(() => {
    if (isActive) {
      tabRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [isActive]);

  return (
    <div
      ref={tabRef}
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      title={title}
      onClick={() => setActiveNoteTab(tab.noteId)}
      onAuxClick={(event) => {
        // Middle-click closes, like a browser tab.
        if (event.button === 1) {
          event.preventDefault();
          closeNoteTab(tab.noteId);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setActiveNoteTab(tab.noteId);
        }
      }}
      className={cn(
        'group flex h-7 max-w-56 min-w-24 shrink-0 cursor-pointer items-center gap-2 rounded-md pr-1 pl-2.5 text-(length:--cd-text-ui) transition-colors duration-(--cd-duration-fast) outline-none select-none',
        'focus-visible:ring-primary/60 focus-visible:ring-1',
        isActive
          ? 'bg-fill-selected text-foreground'
          : 'text-muted-foreground hover:bg-fill-hover hover:text-foreground',
      )}
    >
      <FileText
        aria-hidden="true"
        className={cn(
          'size-3.5 shrink-0',
          isActive ? 'text-muted-foreground' : 'text-faint-foreground',
        )}
      />

      <span className="min-w-0 flex-1 truncate">{title}</span>

      <button
        type="button"
        aria-label={`Close ${title}`}
        onClick={(event) => {
          event.stopPropagation();
          closeNoteTab(tab.noteId);
        }}
        className={cn(
          'text-muted-foreground hover:bg-fill-selected hover:text-foreground flex size-5 shrink-0 items-center justify-center rounded-sm outline-none',
          'focus-visible:ring-primary/60 focus-visible:ring-1 focus-visible:opacity-100',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 touch:opacity-100',
        )}
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  );
}
