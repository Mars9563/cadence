'use client';

import { FilePlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useActiveNoteId, useNoteTabs } from '@/store/selectors';

import { useNoteTree } from '../NoteTreeContext';
import { NoteEditor } from './NoteEditor';
import { NoteTabBar } from './NoteTabBar';

/**
 * The editor column: tab bar + one editor per open tab.
 *
 * Every open tab's editor stays mounted and inactive ones are hidden, so
 * switching tabs keeps undo history, scroll position and pending saves.
 */
export function NotesWorkspace() {
  const tabs = useNoteTabs();
  const activeNoteId = useActiveNoteId();

  return (
    <section
      aria-label="Editor"
      className="bg-background flex h-full min-w-0 flex-col overflow-hidden"
    >
      {tabs.length === 0 ? (
        <EmptyWorkspace />
      ) : (
        <>
          <NoteTabBar />

          <div className="relative min-h-0 flex-1">
            {tabs.map((tab) => (
              <div
                key={tab.noteId}
                role="tabpanel"
                hidden={tab.noteId !== activeNoteId}
                className="h-full"
              >
                <NoteEditor noteId={tab.noteId} />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/**
 * Nothing open: an Obsidian-style "New note" action. The note is created in
 * the root folder as "Untitled", opened in a tab, and its inline title is
 * selected so it can be named straight away.
 */
function EmptyWorkspace() {
  const { createNoteIn } = useNoteTree();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="space-y-1.5">
        <h2 className="text-foreground font-serif text-xl font-medium">
          No note open
        </h2>
        <p className="text-muted-foreground text-(length:--cd-text-ui)">
          Open a note from the sidebar, or start a new one.
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="text-(length:--cd-text-ui)"
        onClick={() => void createNoteIn(null)}
      >
        <FilePlus />
        New note
      </Button>
    </div>
  );
}
