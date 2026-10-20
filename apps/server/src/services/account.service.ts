import type { HabitCompletion } from '@cadence/types';

import { createSupabaseClient } from '../supabase/supabase.js';
import { destroyAvatarFolder } from './avatar.service.js';
import type { ExportData } from './export/files.js';
import { getHabitCompletionsByUserId } from './habit-completions.service.js';
import { getItemsByUserId } from './items.service.js';
import { getProfileByUserId } from './profile.service.js';

/** Everything the user owns, read with their own token (RLS: only their rows). */
export async function loadExportData(userId: string, token: string): Promise<ExportData> {
  const supabase = createSupabaseClient(token);

  const [profile, items, completions, folders, notes, dailyNotes] = await Promise.all([
    getProfileByUserId(userId, token),
    getItemsByUserId(userId, token),
    getHabitCompletionsByUserId(userId, token),
    supabase.from('folders').select('id, parent_id, name, is_root').eq('user_id', userId),
    supabase.from('notes').select('id, folder_id, title, content').eq('user_id', userId),
    supabase
      .from('daily_notes')
      .select('note_date, content')
      .eq('user_id', userId)
      .order('note_date'),
  ]);

  if (!profile) throw new Error('PROFILE_NOT_FOUND');

  for (const result of [folders, notes, dailyNotes]) {
    if (result.error) {
      console.error('Export read failed:', result.error);
      throw new Error('EXPORT_FAILED');
    }
  }

  return {
    profile,
    items: items.data!,
    habitCompletions: (completions.data ?? []) as HabitCompletion[],
    folders: (folders.data ?? []).map((f) => ({
      id: f.id as string,
      parentId: f.parent_id as string | null,
      name: f.name as string,
      isRoot: f.is_root as boolean,
    })),
    notes: (notes.data ?? []).map((n) => ({
      id: n.id as string,
      folderId: n.folder_id as string,
      title: n.title as string,
      content: (n.content as string | null) ?? '',
    })),
    dailyNotes: (dailyNotes.data ?? []).map((d) => ({
      noteDate: d.note_date as string,
      content: (d.content as string | null) ?? '',
    })),
  };
}

/**
 * Delete the account: the database first (the user's intent; one statement,
 * everything cascades), then their Cloudinary photos, then their live
 * sockets. A failed photo cleanup is logged for manual follow-up and does
 * not fail the request: the images are private and the account is gone.
 */
export async function deleteAccount(userId: string, token: string): Promise<void> {
  const supabase = createSupabaseClient(token);
  const { error } = await supabase.rpc('delete_my_account');

  if (error) {
    console.error('Account deletion failed:', error);
    throw new Error('ACCOUNT_DELETE_FAILED');
  }

  try {
    await destroyAvatarFolder(userId);
  } catch (cleanupError) {
    console.error(`Cloudinary cleanup failed for ${userId}:`, cleanupError);
  }

  // Loaded here, not at the top: realtime/index imports the Express app,
  // which imports this module's route; a top-level import would be circular
  // and leave Socket.IO without its HTTP server at start-up.
  const { io } = await import('../realtime/index.js');
  const sockets = await io.fetchSockets();
  for (const socket of sockets) {
    if (socket.data.userId === userId) socket.disconnect(true);
  }
}
