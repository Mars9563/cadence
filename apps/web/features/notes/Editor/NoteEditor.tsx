'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { MDXEditor } from '@mdxeditor/editor';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import { Orb } from '@yogesharc/thinking-orbs';
import { BookOpen, PanelLeft, PencilLine } from 'lucide-react';

import '@mdxeditor/editor/style.css';
// The Daily Note's writing-surface styles are reused as-is.
import '@/features/dashboard/DailyNote/dailyNote.css';
import './noteEditor.css';

import { getNote } from '@/api/getNote';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNoteAutosave } from '@/hooks/useNoteAutosave';
import { isRetryableError } from '@/lib/api/request';
import { toUserMessage } from '@/lib/errors';
import { draftKey } from '@/lib/sync/types';
import { cn } from '@/lib/utils';
import { useCadenceStore } from '@/store/store';
import {
  useIsSocketConnected,
  useFolders,
  useNoteSummary,
  useNoteTab,
  useSetNoteContent,
  useToggleNoteTabReadOnly,
} from '@/store/selectors';

import { useWritingFocus } from '@/hooks/useWritingFocus';
import { useMobileNotes } from '../../mobile/MobileNotesContext';
import { NoteSaveIndicator } from './NoteSaveIndicator';
import { NoteTitle } from './NoteTitle';
import { createWritingPlugins } from './writingPlugins';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; offline: boolean }
  | { status: 'ready'; content: string };

/**
 * One open tab. Stays mounted while the tab is open (hidden when inactive),
 * so undo history, scroll position and a pending autosave all survive
 * switching tabs.
 *
 * Content comes from the store's mirror when this note was open before in
 * this session, otherwise it is fetched once.
 */
export function NoteEditor({ noteId }: { noteId: string }) {
  const setNoteContent = useSetNoteContent();

  const isSocketConnected = useIsSocketConnected();

  const [load, setLoad] = useState<LoadState>(() => {
    const state = useCadenceStore.getState();

    // Newest first: unsaved text, then this session's copy.
    const draft = state.drafts[draftKey('note', noteId)];

    if (draft) return { status: 'ready', content: draft.content };

    const cached = state.noteContents[noteId];

    if (cached !== undefined) return { status: 'ready', content: cached };

    // Created offline and not on the server yet: it is empty by definition.
    const pendingCreate = state.outbox.some(
      (op) => op.type === 'note.create' && op.input.id === noteId,
    );

    if (pendingCreate) return { status: 'ready', content: '' };

    return { status: 'loading' };
  });

  const [attempt, setAttempt] = useState(0);

  // Opened while offline: fetch again by itself once the connection is back.
  const retryOnReconnect =
    load.status === 'error' && load.offline && isSocketConnected;

  useEffect(() => {
    if (load.status === 'ready') return;

    let cancelled = false;

    getNote(noteId)
      .then((result) => {
        if (cancelled) return;

        const content = result.data?.content ?? '';

        setNoteContent(noteId, content);
        setLoad({ status: 'ready', content });
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        setLoad({
          status: 'error',
          offline: isRetryableError(error),
          message: isRetryableError(error)
            ? 'This note opens when Cadence is back online.'
            : toUserMessage(error, 'Could not open this note.'),
        });
      });

    return () => {
      cancelled = true;
    };
    // `attempt` re-runs the fetch for "Try again", `retryOnReconnect` when
    // the connection returns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, attempt, retryOnReconnect]);

  if (load.status === 'loading') {
    return (
      <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 text-(length:--cd-text-ui)">
        <Orb state="searching" size={24} label="Opening note" className="text-faint-foreground" />
        <span aria-hidden="true">Opening note…</span>
      </div>
    );
  }

  if (load.status === 'error') {
    return (
      <div
        role="alert"
        className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <div className="space-y-1">
          <p className="text-foreground text-(length:--cd-text-control) font-medium">
            {load.offline ? 'You’re offline' : 'This note didn’t open'}
          </p>
          <p className="text-muted-foreground text-(length:--cd-text-ui)">{load.message}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-(length:--cd-text-ui)"
          onClick={() => {
            setLoad({ status: 'loading' });
            setAttempt((value) => value + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  return <NoteEditorBody noteId={noteId} initialContent={load.content} />;
}

type NoteEditorBodyProps = {
  noteId: string;

  /** Only read on mount: the editor owns the live document afterwards. */
  initialContent: string;
};

const NoteEditorBody = memo(
  function NoteEditorBody({
    noteId,
    initialContent: initialContentProp,
  }: NoteEditorBodyProps) {
    const setNoteContent = useSetNoteContent();

    const note = useNoteSummary(noteId);
    const tab = useNoteTab(noteId);
    const toggleReadOnly = useToggleNoteTabReadOnly();

    const tabReadOnly = tab?.readOnly ?? false;

    // Phones: a folders button opens the tree drawer.
    const mobile = useMobileNotes();

    const editorRef = useRef<MDXEditorMethods>(null);

    const [initialContent] = useState(initialContentProp);

    const autosave = useNoteAutosave({
      noteId,
      initialContent,
      setStoreContent: setNoteContent,
    });

    const plugins = useMemo(() => createWritingPlugins(), []);

    // Phones show the toolbar above the keyboard only while writing.
    const paneRef = useRef<HTMLElement>(null);
    const writing = useWritingFocus(paneRef);

    /*
     * If MDXEditor cannot read part of the document it renders what it can
     * and reports it here. Editing would then autosave the incomplete text
     * over the full one, so the document is locked to reading instead.
     */
    const [unreadable, setUnreadable] = useState(false);

    const readOnly = tabReadOnly || unreadable;

    return (
      <section
        ref={paneRef}
        className={cn(
          'note-editor-pane',
          readOnly && 'is-read-only',
          writing && 'is-writing',
        )}
      >
        {/* Path on the left; save state + reading-mode toggle on the right. */}
        <header className="note-editor-header">
          <div className="flex min-w-0 items-center gap-1.5">
            {mobile ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Show folders"
                onClick={mobile.openTree}
                className="text-muted-foreground hover:bg-fill-hover dark:hover:bg-fill-hover hover:text-foreground -ml-2 size-9 shrink-0 rounded-full"
              >
                <PanelLeft className="size-[18px]" />
              </Button>
            ) : null}

            <NoteBreadcrumb noteId={noteId} />
          </div>

          <div className="note-editor-actions">
          <NoteSaveIndicator status={autosave.status} error={autosave.error} />

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:bg-fill-hover dark:hover:bg-fill-hover hover:text-foreground aria-pressed:bg-fill-selected aria-pressed:text-foreground size-7 rounded-md"
                  aria-pressed={readOnly}
                  disabled={unreadable}
                  aria-label={readOnly ? 'Switch to editing' : 'Switch to reading'}
                  onClick={() => toggleReadOnly(noteId)}
                />
              }
            >
              {readOnly ? <PencilLine /> : <BookOpen />}
            </TooltipTrigger>

            <TooltipContent side="bottom">
              {readOnly ? 'Edit' : 'Reading view'}
            </TooltipContent>
          </Tooltip>
          </div>
        </header>

        {unreadable ? (
          <p role="alert" className="note-unreadable">
            Part of this note couldn’t be displayed, so it is open for reading
            only. The saved text is unchanged.
          </p>
        ) : null}

        <ScrollArea className="daily-note-scroll">
          <div className="note-title-block">
            <NoteTitle
              noteId={noteId}
              title={note?.title ?? ''}
              readOnly={readOnly}
              onEnter={() =>
                editorRef.current?.focus(undefined, {
                  defaultSelection: 'rootStart',
                })
              }
            />
          </div>

          <MDXEditor
            ref={editorRef}
            markdown={initialContent}
            onChange={autosave.onChange}
            plugins={plugins}
            readOnly={readOnly}
            onError={({ error }) => {
              console.error('[NoteEditor] markdown could not be fully read:', error);
              setUnreadable(true);
            }}
            className="daily-note-editor note-editor"
            contentEditableClassName="daily-note-content"
          />
        </ScrollArea>
      </section>
    );
  },
  (prev, next) => prev.noteId === next.noteId,
);

/**
 * "Folder / Sub-folder / Note" for the note's location. The root folder is
 * not named, matching the tree.
 */
function NoteBreadcrumb({ noteId }: { noteId: string }) {
  const note = useNoteSummary(noteId);
  const folders = useFolders();

  const path = useMemo(() => {
    const byId = new Map(folders.map((folder) => [folder.id, folder]));
    const names: string[] = [];

    for (
      let folder = note ? byId.get(note.folderId) : undefined;
      folder && !folder.isRoot;
      folder = folder.parentId ? byId.get(folder.parentId) : undefined
    ) {
      names.unshift(folder.name);
    }

    return names;
  }, [folders, note]);

  return (
    <nav aria-label="Note location" className="note-breadcrumb">
      {path.map((name, index) => (
        <span key={index} className="note-breadcrumb-folder">
          <span className="note-breadcrumb-name">{name}</span>
          <span aria-hidden="true">/</span>
        </span>
      ))}

      <span className="note-breadcrumb-current">{note?.title}</span>
    </nav>
  );
}
