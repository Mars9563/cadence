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
      className="bg-card flex h-11 shrink-0 items-end gap-1 overflow-x-auto overflow-y-hidden border-b px-2 [scrollbar-width:thin]"
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
        'group flex h-9 max-w-52 min-w-28 shrink-0 cursor-pointer items-center gap-2 rounded-t-lg border border-b-0 px-3 text-sm transition-colors select-none',
        isActive
          ? 'bg-background text-foreground border-border'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground border-transparent',
      )}
    >
      <FileText className="size-3.5 shrink-0" />

      <span className="min-w-0 flex-1 truncate">{title}</span>

      <button
        type="button"
        aria-label={`Close ${title}`}
        onClick={(event) => {
          event.stopPropagation();
          closeNoteTab(tab.noteId);
        }}
        className={cn(
          'hover:bg-muted flex size-5 shrink-0 items-center justify-center rounded-md',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
