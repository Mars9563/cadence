'use client';

import { SquarePen } from 'lucide-react';

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
    <section className="bg-card flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border shadow-sm">
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
    <div className="flex h-full items-center justify-center">
      <Button
        variant="outline"
        className="rounded-xl"
        onClick={() => void createNoteIn(null)}
      >
        <SquarePen />
        New note
      </Button>
    </div>
  );
}
