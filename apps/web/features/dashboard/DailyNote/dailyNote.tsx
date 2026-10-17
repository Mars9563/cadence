'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { MDXEditor } from '@mdxeditor/editor';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import { BookOpen, PencilLine } from 'lucide-react';

import '@mdxeditor/editor/style.css';
import './dailyNote.css';
// The notes editor's writing surface (header row, title, typography, toolbar).
import '@/features/notes/Editor/noteEditor.css';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cadenceDateToLocalDate } from '@/lib/history';
import { cn } from '@/lib/utils';
import { useCadenceToday } from '@/hooks/useCadenceToday';
import { draftKey } from '@/lib/sync/types';
import { useCadenceStore } from '@/store/store';
import {
  useDailyNotes,
  useDailyNotesStatus,
  useSetDailyNoteContent,
} from '@/store/selectors';

import { createWritingPlugins } from '@/features/notes/Editor/writingPlugins';

import { DailyNoteSaveIndicator } from './DailyNoteSaveIndicator';
import { useDailyNoteAutosave } from '@/hooks/useDailyNoteAutosave';
import { useWritingFocus } from '@/hooks/useWritingFocus';

type DailyNoteEditorProps = {
  noteId: string;
  noteDate: string;

  /**
   * Only read on mount. The editor owns the live document from then on, so
   * later changes to this prop (which happen on every keystroke, because
   * edits are mirrored into the store) are intentionally ignored.
   */
  initialContent: string;
};

/** '2026-10-17' -> 'Saturday, 17 October' */
function formatNoteDate(noteDate: string): string {
  return cadenceDateToLocalDate(noteDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * After focusing at the very end of the document, bring that end into view.
 * Lexical focuses with `preventScroll`, so for a long note the caret would
 * otherwise sit below the fold.
 */
function scrollCaretIntoView() {
  const viewport = document.activeElement?.closest<HTMLElement>(
    '[data-slot="scroll-area-viewport"]',
  );

  if (viewport) {
    viewport.scrollTop = viewport.scrollHeight;
  }
}

/**
 * One mounted editor == one Daily Note. The parent keys this component by
 * note id, so switching notes (or returning to the tab) starts a fresh
 * editor from that note's Markdown instead of poking `setMarkdown` into a
 * live one, which would reset the selection and re-fire `onChange`.
 */
const DailyNoteEditor = memo(
  function DailyNoteEditor({
    noteId,
    noteDate,
    initialContent: initialContentProp,
  }: DailyNoteEditorProps) {
    const setDailyNoteContent = useSetDailyNoteContent();

    const editorRef = useRef<MDXEditorMethods>(null);

    const [initialContent] = useState(initialContentProp);

    // Reading mode guards against accidental edits. Not persisted.
    const [readingMode, setReadOnly] = useState(false);

    const autosave = useDailyNoteAutosave({
      noteId,
      initialContent,
      setStoreContent: setDailyNoteContent,
    });

    /*
     * Focus once, after the editor has mounted, with the caret at the end of
     * the document (or in the empty paragraph of an empty one).
     *
     * This runs exactly once per mount and never again, so it cannot steal
     * focus back from another control after the user deliberately leaves the
     * editor. It only moves the selection; it does not edit the document, so
     * it triggers no `onChange` and no autosave.
     *
     * The timer matches how MDXEditor schedules its own `autoFocus`, and is
     * cleared on unmount (including React StrictMode's simulated unmount).
     */
    useEffect(() => {
      const timer = window.setTimeout(() => {
        editorRef.current?.focus(scrollCaretIntoView, {
          defaultSelection: 'rootEnd',
        });
      }, 0);

      return () => window.clearTimeout(timer);
    }, []);

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

    const readOnly = readingMode || unreadable;

    return (
      <section
        ref={paneRef}
        className={cn(
          'daily-note-shell note-editor-pane',
          readOnly && 'is-read-only',
          writing && 'is-writing',
        )}
      >
        {/* Same header row as a note: location, then save state + reading toggle. */}
        <header className="note-editor-header">
          <p className="note-breadcrumb">
            <span className="note-breadcrumb-current">Daily note</span>
          </p>

          <div className="note-editor-actions">
            <DailyNoteSaveIndicator
              status={autosave.status}
              error={autosave.error}
            />

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:bg-fill-hover dark:hover:bg-fill-hover hover:text-foreground aria-pressed:bg-fill-selected aria-pressed:text-foreground size-7 rounded-md"
                    aria-pressed={readOnly}
                    disabled={unreadable}
                    aria-label={
                      readOnly ? 'Switch to editing' : 'Switch to reading'
                    }
                    onClick={() => setReadOnly((value) => !value)}
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

        {/*
         * The ScrollArea viewport is the ONLY scroll container. The editor
         * (toolbar + editable surface) is its content: the toolbar is
         * `position: sticky` so it stays visible, and the editable element
         * itself grows to fill the viewport, so the whole canvas is the
         * document.
         */}
        {unreadable ? (
          <p role="alert" className="note-unreadable">
            Part of this daily note couldn’t be displayed, so it is open for reading
            only. The saved text is unchanged.
          </p>
        ) : null}

        <ScrollArea className="daily-note-scroll">
          <div className="note-title-block">
            <h1 className="note-inline-title">{formatNoteDate(noteDate)}</h1>
          </div>

          <MDXEditor
            ref={editorRef}
            markdown={initialContent}
            onChange={autosave.onChange}
            plugins={plugins}
            readOnly={readOnly}
            onError={({ error }) => {
              console.error('[DailyNote] markdown could not be fully read:', error);
              setUnreadable(true);
            }}
            className="daily-note-editor"
            contentEditableClassName="daily-note-content"
          />
        </ScrollArea>
      </section>
    );
  },
  // Re-render only when the note itself changes, not on every keystroke.
  (prev, next) =>
    prev.noteId === next.noteId && prev.noteDate === next.noteDate,
);

export function DailyNote() {
  const dailyNotes = useDailyNotes();
  const status = useDailyNotesStatus();
  const today = useCadenceToday();

  /*
   * Today's note. The list is sorted newest first, so if today's has not
   * been created yet (it is about to be: ensureTodayDailyNote runs at load
   * and at every day rollover) the most recent one is shown meanwhile.
   */
  const activeNote =
    dailyNotes.find((note) => note.noteDate === today) ??
    dailyNotes[0] ??
    null;

  // Unsaved text from an earlier visit wins over the server copy.
  const draft = useCadenceStore((s) =>
    activeNote ? s.drafts[draftKey('daily', activeNote.id)] : undefined,
  );

  if (!activeNote) {
    return (
      <section className="daily-note-shell note-editor-pane">
        <div className="daily-note-loading" role="status">
          <p>
            {status === 'error'
              ? 'Your daily notes didn’t load. They will appear when Cadence reconnects.'
              : 'Opening today’s note…'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <DailyNoteEditor
      key={activeNote.id}
      noteId={activeNote.id}
      noteDate={activeNote.noteDate}
      initialContent={draft?.content ?? activeNote.content}
    />
  );
}
