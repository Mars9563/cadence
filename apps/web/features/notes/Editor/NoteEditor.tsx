'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  linkPlugin,
  linkDialogPlugin,
  quotePlugin,
  thematicBreakPlugin,
  codeBlockPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  CreateLink,
  BlockTypeSelect,
  ListsToggle,
  Separator,
} from '@mdxeditor/editor';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import { Orb } from '@yogesharc/thinking-orbs';
import { BookOpen, PencilLine } from 'lucide-react';

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
import { toUserMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { useCadenceStore } from '@/store/store';
import {
  useIsSocketConnected,
  useFolders,
  useNoteSummary,
  useNoteTab,
  useSetNoteContent,
  useSocket,
  useToggleNoteTabReadOnly,
} from '@/store/selectors';

import { NoteSaveIndicator } from './NoteSaveIndicator';
import { NoteTitle } from './NoteTitle';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
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

  const [load, setLoad] = useState<LoadState>(() => {
    const cached = useCadenceStore.getState().noteContents[noteId];

    return cached === undefined
      ? { status: 'loading' }
      : { status: 'ready', content: cached };
  });

  const [attempt, setAttempt] = useState(0);

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
          message: toUserMessage(error, 'Could not open this note.'),
        });
      });

    return () => {
      cancelled = true;
    };
    // `attempt` re-runs the fetch for "Try again".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, attempt]);

  if (load.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <Orb state="searching" size={28} label="Opening note" className="text-muted-foreground" />
      </div>
    );
  }

  if (load.status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm">
        <p className="text-muted-foreground">{load.message}</p>
        <Button
          variant="outline"
          size="sm"
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
    const socket = useSocket();
    const isSocketConnected = useIsSocketConnected();
    const setNoteContent = useSetNoteContent();

    const note = useNoteSummary(noteId);
    const tab = useNoteTab(noteId);
    const toggleReadOnly = useToggleNoteTabReadOnly();

    const readOnly = tab?.readOnly ?? false;

    const editorRef = useRef<MDXEditorMethods>(null);

    const [initialContent] = useState(initialContentProp);

    const autosave = useNoteAutosave({
      noteId,
      initialContent,
      socket,
      isSocketConnected,
      setStoreContent: setNoteContent,
    });

    const plugins = useMemo(
      () => [
        headingsPlugin(),
        listsPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        codeBlockPlugin(),
        markdownShortcutPlugin(),
        toolbarPlugin({
          toolbarClassName: 'daily-note-toolbar',
          toolbarContents: () => (
            <>
              <BlockTypeSelect />
              <Separator />
              <BoldItalicUnderlineToggles />
              <Separator />
              <ListsToggle />
              <CreateLink />
              <Separator />
              <UndoRedo />
            </>
          ),
        }),
      ],
      [],
    );

    return (
      <section className={cn('note-editor-pane', readOnly && 'is-read-only')}>
        {/* Path on the left; save state + reading-mode toggle on the right. */}
        <header className="note-editor-header">
          <NoteBreadcrumb noteId={noteId} />

          <div className="note-editor-actions">
          <NoteSaveIndicator status={autosave.status} error={autosave.error} />

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-pressed={readOnly}
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
          {name}
          <span aria-hidden="true">/</span>
        </span>
      ))}

      <span className="note-breadcrumb-current">{note?.title}</span>
    </nav>
  );
}
