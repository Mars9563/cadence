import { apiResponse, DailyNote } from '@cadence/types';
import { PG_UNIQUE_VIOLATION } from '../lib/postgres';
import { createSupabaseClient } from '../supabase/supabase';

interface DbDailyNote {
  id: string;
  user_id: string;
  note_date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

function mapDbDailyNoteToFrontend(note: DbDailyNote): DailyNote {
  return {
    id: note.id,
    userId: note.user_id,
    noteDate: note.note_date,
    content: note.content,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
  };
}

interface DailyNoteResponse {
  dailyNotes: DailyNote[];
}

export async function getDailyNotesByUserId(
  userId: string,
  token: string,
): Promise<apiResponse<DailyNoteResponse>> {
  const supabase = createSupabaseClient(token);

  const { data, error } = await supabase
    .from('daily_notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');

  if (error) {
    console.log('Failed to query database for dailyNotes:', error);

    throw new Error('DAILY_NOTES_FETCH_FAILED');
  }

  const notes = (data ?? []) as DbDailyNote[];

  const dailyNotes: DailyNote[] = [];

  for (const note of notes) {
    const mapped = mapDbDailyNoteToFrontend(note);
    dailyNotes.push(mapped);
  }

  return {
    success: true,
    data: {
      dailyNotes,
    },
  };
}

interface DailyNoteCreationResponse {
  dailyNote: DailyNote;
}

/**
 * Make sure today's Daily Note exists and return it.
 *
 * Idempotent: daily_notes_user_date_key allows one note per user per Cadence
 * date, so when today's note already exists (another tab or device created
 * it, or this is a retry) that note is returned instead of failing. The
 * client then adopts the returned id, which may differ from the one it
 * suggested.
 */
export async function addDailyNoteByUserId(
  userId: string,
  token: string,
  clientId?: string,
): Promise<apiResponse<DailyNoteCreationResponse>> {
  const supabase = createSupabaseClient(token);

  /*
   * The client does not provide a date.
   *
   * Cadence date is determined by the database because it depends on
   * the user's configured day_end_time.
   */
  const { data: noteDate, error: dateError } = await supabase.rpc('app_today', {
    p_user_id: userId,
  });

  if (dateError || !noteDate) {
    console.log('Failed to determine Cadence date for daily note:', dateError);

    throw new Error('CADENCE_DATE_RESOLUTION_FAILED');
  }

  const { data, error } = await supabase
    .from('daily_notes')
    .insert({
      ...(clientId && { id: clientId }),
      user_id: userId,
      note_date: noteDate,
      content: '',
    })
    .select('*')
    .single();

  if (error?.code === PG_UNIQUE_VIOLATION) {
    const { data: existing, error: existingError } = await supabase
      .from('daily_notes')
      .select('*')
      .eq('user_id', userId)
      .eq('note_date', noteDate)
      .maybeSingle();

    if (existing && !existingError) {
      return {
        success: true,
        data: { dailyNote: mapDbDailyNoteToFrontend(existing as DbDailyNote) },
      };
    }
  }

  if (error || !data) {
    console.log('Failed to create daily note:', error);

    throw new Error('DAILY_NOTE_CREATE_FAILED');
  }

  const dailyNote = mapDbDailyNoteToFrontend(data as DbDailyNote);

  return {
    success: true,
    data: {
      dailyNote,
    },
  };
}

interface DailyNoteUpdateResponse {
  noteId: string;
}

export async function updateDailyNoteById(
  noteId: string,
  content: string,
  token: string,
): Promise<apiResponse<DailyNoteUpdateResponse>> {
  const supabase = createSupabaseClient(token);

  /*
   * No `.select()`: PostgREST performs the write and returns only the row
   * count, instead of reading the updated row back.
   *
   * RLS hides rows the caller does not own, so a note that does not exist
   * or belongs to someone else yields count === 0. That must not be
   * reported as a successful save.
   */
  const { error, count } = await supabase
    .from('daily_notes')
    .update({ content }, { count: 'exact' })
    .eq('id', noteId);

  if (error) {
    console.log('Failed to update daily note:', error);

    throw new Error('DAILY_NOTE_UPDATE_FAILED');
  }

  if (!count) {
    console.log('Daily note update affected no rows:', noteId);

    throw new Error('DAILY_NOTE_NOT_FOUND');
  }

  return {
    success: true,
    data: {
      noteId,
    },
  };
}
