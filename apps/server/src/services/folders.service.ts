import type { apiResponse, Folder } from '@cadence/types';
import type { CreateFolderInput, UpdateFolderInput } from '@cadence/validation';

import {
  PG_FOREIGN_KEY_VIOLATION,
  PG_RAISE_EXCEPTION,
  PG_UNIQUE_VIOLATION,
} from '../lib/postgres';
import { createSupabaseClient } from '../supabase/supabase';

type DbFolder = {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  is_root: boolean;
  created_at: string;
  updated_at: string;
};

const FOLDER_SELECT = `
  id,
  user_id,
  parent_id,
  name,
  is_root,
  created_at,
  updated_at
`;

/*
 * PostgreSQL error codes surfaced through PostgREST.
 *
 *   23503 — foreign key violation. folders_parent_fk is (parent_id, user_id),
 *           so a parent that does not exist OR belongs to another user lands
 *           here.
 *   P0001 — raise exception. folders_prevent_cycle_trg uses this when a folder
 *           is moved into itself or one of its descendants.
 */

function mapDbFolderToFrontend(folder: DbFolder): Folder {
  return {
    id: folder.id,
    userId: folder.user_id,
    parentId: folder.parent_id,
    name: folder.name,
    isRoot: folder.is_root,
    createdAt: folder.created_at,
    updatedAt: folder.updated_at,
  };
}

export async function getFoldersByUserId(
  userId: string,
  accessToken: string,
): Promise<apiResponse<Folder[]>> {
  const supabase = createSupabaseClient(accessToken);

  const { data, error } = await supabase
    .from('folders')
    .select(FOLDER_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch folders:', error);
    throw new Error('FOLDERS_FETCH_FAILED');
  }

  const folders = (data ?? []) as DbFolder[];

  return {
    success: true,
    data: folders.map(mapDbFolderToFrontend),
  };
}

export async function addFolderByUserId(
  userId: string,
  accessToken: string,
  input: CreateFolderInput,
): Promise<apiResponse<Folder>> {
  const supabase = createSupabaseClient(accessToken);

  /*
   * is_root is always false: the root folder is created by the signup
   * trigger, and RLS (folders_insert_own_non_root) rejects any other root.
   */
  const { data, error } = await supabase
    .from('folders')
    .insert({
      ...(input.id && { id: input.id }),
      user_id: userId,
      parent_id: input.parentId,
      name: input.name,
      is_root: false,
    })
    .select(FOLDER_SELECT)
    .single();

  // A replayed create (same client id): return the folder that exists.
  if (error?.code === PG_UNIQUE_VIOLATION && input.id) {
    const { data: existing } = await supabase
      .from('folders')
      .select(FOLDER_SELECT)
      .eq('id', input.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return { success: true, data: mapDbFolderToFrontend(existing as DbFolder) };
    }

    throw new Error('FOLDER_ID_CONFLICT');
  }

  if (error) {
    if (error.code === PG_FOREIGN_KEY_VIOLATION) {
      throw new Error('PARENT_FOLDER_NOT_FOUND');
    }

    console.error('Failed to add folder:', error);
    throw new Error('FOLDER_CREATE_FAILED');
  }

  return {
    success: true,
    data: mapDbFolderToFrontend(data as DbFolder),
  };
}

export async function updateFolderById(
  folderId: string,
  accessToken: string,
  input: UpdateFolderInput,
): Promise<apiResponse<Folder>> {
  const supabase = createSupabaseClient(accessToken);

  const changes: { name?: string; parent_id?: string } = {};

  if (input.name !== undefined) changes.name = input.name;
  if (input.parentId !== undefined) changes.parent_id = input.parentId;

  /*
   * maybeSingle(): RLS hides the root folder and other users' folders from
   * UPDATE, so those yield no row rather than an error.
   */
  const { data, error } = await supabase
    .from('folders')
    .update(changes)
    .eq('id', folderId)
    .select(FOLDER_SELECT)
    .maybeSingle();

  if (error) {
    if (error.code === PG_FOREIGN_KEY_VIOLATION) {
      throw new Error('PARENT_FOLDER_NOT_FOUND');
    }

    if (error.code === PG_RAISE_EXCEPTION) {
      throw new Error('FOLDER_MOVE_CREATES_CYCLE');
    }

    console.error('Failed to update folder:', error);
    throw new Error('FOLDER_UPDATE_FAILED');
  }

  if (!data) {
    throw new Error('FOLDER_NOT_FOUND');
  }

  return {
    success: true,
    data: mapDbFolderToFrontend(data as DbFolder),
  };
}

interface FolderDeleteResponse {
  folderId: string;
}

export async function deleteFolderById(
  folderId: string,
  accessToken: string,
): Promise<apiResponse<FolderDeleteResponse>> {
  const supabase = createSupabaseClient(accessToken);

  /*
   * Child folders and their notes are removed by ON DELETE CASCADE
   * (folders_parent_fk, notes_folder_fk). The client derives which
   * descendants disappeared from its own tree.
   *
   * The root folder is invisible to DELETE under RLS, so it yields count 0.
   */
  const { error, count } = await supabase
    .from('folders')
    .delete({ count: 'exact' })
    .eq('id', folderId);

  if (error) {
    console.error('Failed to delete folder:', error);
    throw new Error('FOLDER_DELETE_FAILED');
  }

  if (!count) {
    throw new Error('FOLDER_NOT_FOUND');
  }

  return {
    success: true,
    data: {
      folderId,
    },
  };
}
