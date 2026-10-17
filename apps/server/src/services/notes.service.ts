import type { apiResponse, Note, NoteSummary } from '@cadence/types';
import type { CreateNoteInput, UpdateNoteInput } from '@cadence/validation';

import { PG_FOREIGN_KEY_VIOLATION, PG_UNIQUE_VIOLATION } from '../lib/postgres';
import { createSupabaseClient } from '../supabase/supabase';

type DbNoteSummary = {
  id: string;
  user_id: string;
  folder_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type DbNote = DbNoteSummary & {
  content: string;
};

/*
 * The summary select deliberately omits `content`. A note can hold up to
 * 1MB of Markdown, so the tree is loaded without it and each document is
 * fetched when it is opened.
 */
const NOTE_SUMMARY_SELECT = `
  id,
  user_id,
  folder_id,
  title,
  created_at,
  updated_at
`;

const NOTE_SELECT = `
  id,
  user_id,
  folder_id,
  title,
  content,
  created_at,
  updated_at
`;

/*
 * notes_folder_fk is (folder_id, user_id), so a folder that does not exist
 * OR belongs to another user surfaces as a foreign key violation.
 */

function mapDbNoteSummaryToFrontend(note: DbNoteSummary): NoteSummary {
  return {
    id: note.id,
    userId: note.user_id,
    folderId: note.folder_id,
    title: note.title,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
  };
}

function mapDbNoteToFrontend(note: DbNote): Note {
  return {
    ...mapDbNoteSummaryToFrontend(note),
    content: note.content,
  };
}

export async function getNotesByUserId(
  userId: string,
  accessToken: string,
): Promise<apiResponse<NoteSummary[]>> {
  const supabase = createSupabaseClient(accessToken);

  const { data, error } = await supabase
    .from('notes')
    .select(NOTE_SUMMARY_SELECT)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch notes:', error);
    throw new Error('NOTES_FETCH_FAILED');
  }

  const notes = (data ?? []) as DbNoteSummary[];

  return {
    success: true,
    data: notes.map(mapDbNoteSummaryToFrontend),
  };
}

export async function getNoteById(
  noteId: string,
  accessToken: string,
): Promise<apiResponse<Note>> {
  const supabase = createSupabaseClient(accessToken);

  const { data, error } = await supabase
    .from('notes')
    .select(NOTE_SELECT)
    .eq('id', noteId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch note:', error);
    throw new Error('NOTE_FETCH_FAILED');
  }

  if (!data) {
    throw new Error('NOTE_NOT_FOUND');
  }

  return {
    success: true,
    data: mapDbNoteToFrontend(data as DbNote),
  };
}

export async function addNoteByUserId(
  userId: string,
  accessToken: string,
  input: CreateNoteInput,
): Promise<apiResponse<Note>> {
  const supabase = createSupabaseClient(accessToken);

  const { data, error } = await supabase
    .from('notes')
    .insert({
      ...(input.id && { id: input.id }),
      user_id: userId,
      folder_id: input.folderId,
      title: input.title,
      content: input.content,
    })
    .select(NOTE_SELECT)
    .single();

  // A replayed create (same client id): return the note that exists.
  if (error?.code === PG_UNIQUE_VIOLATION && input.id) {
    const { data: existing } = await supabase
      .from('notes')
      .select(NOTE_SELECT)
      .eq('id', input.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return { success: true, data: mapDbNoteToFrontend(existing as DbNote) };
    }

    throw new Error('NOTE_ID_CONFLICT');
  }

  if (error) {
    if (error.code === PG_FOREIGN_KEY_VIOLATION) {
      throw new Error('FOLDER_NOT_FOUND');
    }

    console.error('Failed to add note:', error);
    throw new Error('NOTE_CREATE_FAILED');
  }

  return {
    success: true,
    data: mapDbNoteToFrontend(data as DbNote),
  };
}

/**
 * Rename and/or move a note.
 *
 * Content is NOT written here: content saves go through the socket
 * (`note:update`) so the editor's autosave stays on one channel.
 */
export async function updateNoteById(
  noteId: string,
  accessToken: string,
  input: Omit<UpdateNoteInput, 'content'>,
): Promise<apiResponse<NoteSummary>> {
  const supabase = createSupabaseClient(accessToken);

  const changes: { title?: string; folder_id?: string } = {};

  if (input.title !== undefined) changes.title = input.title;
  if (input.folderId !== undefined) changes.folder_id = input.folderId;

  const { data, error } = await supabase
    .from('notes')
    .update(changes)
    .eq('id', noteId)
    .select(NOTE_SUMMARY_SELECT)
    .maybeSingle();

  if (error) {
    if (error.code === PG_FOREIGN_KEY_VIOLATION) {
      throw new Error('FOLDER_NOT_FOUND');
    }

    console.error('Failed to update note:', error);
    throw new Error('NOTE_UPDATE_FAILED');
  }

  if (!data) {
    throw new Error('NOTE_NOT_FOUND');
  }

  return {
    success: true,
    data: mapDbNoteSummaryToFrontend(data as DbNoteSummary),
  };
}

interface NoteContentUpdateResponse {
  noteId: string;
}

export async function updateNoteContentById(
  noteId: string,
  content: string,
  accessToken: string,
): Promise<apiResponse<NoteContentUpdateResponse>> {
  const supabase = createSupabaseClient(accessToken);

  /*
   * Same contract as updateDailyNoteById: no `.select()`, only the row count.
   * RLS hides other users' notes, so count === 0 means the save did not
   * happen and must not be acknowledged.
   */
  const { error, count } = await supabase
    .from('notes')
    .update({ content }, { count: 'exact' })
    .eq('id', noteId);

  if (error) {
    console.error('Failed to update note content:', error);
    throw new Error('NOTE_CONTENT_UPDATE_FAILED');
  }

  if (!count) {
    console.error('Note content update affected no rows:', noteId);
    throw new Error('NOTE_NOT_FOUND');
  }

  return {
    success: true,
    data: {
      noteId,
    },
  };
}

interface NoteDeleteResponse {
  noteId: string;
}

export async function deleteNoteById(
  noteId: string,
  accessToken: string,
): Promise<apiResponse<NoteDeleteResponse>> {
  const supabase = createSupabaseClient(accessToken);

  const { error, count } = await supabase
    .from('notes')
    .delete({ count: 'exact' })
    .eq('id', noteId);

  if (error) {
    console.error('Failed to delete note:', error);
    throw new Error('NOTE_DELETE_FAILED');
  }

  if (!count) {
    throw new Error('NOTE_NOT_FOUND');
  }

  return {
    success: true,
    data: {
      noteId,
    },
  };
}
