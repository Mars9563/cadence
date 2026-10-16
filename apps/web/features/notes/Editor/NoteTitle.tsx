'use client';

import { useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { toast } from 'sonner';

import { toUserMessage } from '@/lib/errors';
import {
  useClearTitleFocusRequest,
  useTitleFocusNoteId,
  useUpdateNote,
} from '@/store/selectors';

// Matches titleSchema in @cadence/validation.
const TITLE_MAX_LENGTH = 200;

type NoteTitleProps = {
  noteId: string;
  title: string;
  readOnly: boolean;

  /** Enter: leave the title and continue in the note body. */
  onEnter: () => void;
};

/**
 * Obsidian-style inline title: the note's name, editable in place above the
 * document. A textarea (auto-growing) so long titles wrap instead of
 * scrolling sideways; newlines are not allowed in a title.
 *
 * Saved on Enter or blur, through the same optimistic `updateNote` the tree
 * uses, so the tree and the tab label update together. Esc reverts.
 */
export function NoteTitle({ noteId, title, readOnly, onEnter }: NoteTitleProps) {
  const updateNote = useUpdateNote();

  const titleFocusNoteId = useTitleFocusNoteId();
  const clearTitleFocusRequest = useClearTitleFocusRequest();

  const inputRef = useRef<HTMLTextAreaElement>(null);

  /*
   * While focused, the field shows the local draft. Otherwise it mirrors the
   * store, so a rename from the tree shows up here too.
   */
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  // Set by Esc so the blur that follows does not save.
  const discardOnBlurRef = useRef(false);

  // "Create note -> type its name": focus and select once, then clear.
  useEffect(() => {
    if (titleFocusNoteId !== noteId || readOnly) return;

    const input = inputRef.current;

    if (input) {
      input.focus();
      input.select();
    }

    clearTitleFocusRequest();
  }, [titleFocusNoteId, noteId, readOnly, clearTitleFocusRequest]);

  const commit = async () => {
    const next = draft.trim();

    // Empty or unchanged: keep the current title.
    if (!next || next === title) {
      setDraft(title);
      return;
    }

    try {
      await updateNote(noteId, { title: next });
    } catch (error) {
      toast.error(
        toUserMessage(error, 'Could not rename. The previous title was restored.'),
      );
    }
  };

  return (
    <TextareaAutosize
      ref={inputRef}
      value={isEditing ? draft : title}
      readOnly={readOnly}
      maxLength={TITLE_MAX_LENGTH}
      rows={1}
      spellCheck={false}
      aria-label="Note title"
      placeholder="Untitled"
      className="note-inline-title"
      onFocus={() => {
        if (readOnly) return;

        setDraft(title);
        setIsEditing(true);
      }}
      onChange={(event) => {
        // A title is one line: pasted newlines become spaces.
        setDraft(event.target.value.replace(/[\r\n]+/g, ' '));
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          // Moving focus into the body blurs this field, which saves it.
          onEnter();
        }

        if (event.key === 'Escape') {
          event.preventDefault();
          discardOnBlurRef.current = true;
          event.currentTarget.blur();
        }
      }}
      onBlur={() => {
        if (readOnly) return;

        setIsEditing(false);

        if (discardOnBlurRef.current) {
          discardOnBlurRef.current = false;
          setDraft(title);
          return;
        }

        void commit();
      }}
    />
  );
}
