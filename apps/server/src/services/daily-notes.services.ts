import { apiResponse, DailyNote } from '@cadence/types';
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

    throw new Error('Failed to fetch daily notes');
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

export async function addDailyNoteByUserId(
  userId: string,
  token: string,
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

    throw new Error('Failed to determine current Cadence date');
  }

  const { data, error } = await supabase
    .from('daily_notes')
    .insert({
      user_id: userId,
      note_date: noteDate,
      content: '',
    })
    .select('*')
    .single();

  if (error) {
    console.log('Failed to create daily note:', error);

    throw new Error('Failed to create daily note');
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
  dailyNote: DailyNote;
}

export async function updateDailyNoteById(
  noteId: string,
  content: string,
  token: string,
): Promise<apiResponse<DailyNoteUpdateResponse>> {
  const supabase = createSupabaseClient(token);

  const { data, error } = await supabase
    .from('daily_notes')
    .update({
      content,
    })
    .eq('id', noteId)
    .select('*')
    .single();

  if (error) {
    console.log('Failed to update daily note:', error);

    throw new Error('Failed to update daily note');
  }

  const dailyNote = mapDbDailyNoteToFrontend(data as DbDailyNote);

  return {
    success: true,
    data: {
      dailyNote,
    },
  };
}
