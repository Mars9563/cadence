import {
  HabitItem,
  NormalItem,
  TaskItem,
  Weekday,
  HabitCompletion,
} from '@cadence/types';
import { z } from 'zod';

import {
  createHabitItemSchema,
  createNormalItemSchema,
  createTaskItemSchema,
} from '@cadence/validation';

import {
  isoWeekday,
  PG_RLS_VIOLATION,
  PG_UNIQUE_VIOLATION,
} from '../lib/postgres';
import { createSupabaseClient } from '../supabase/supabase';
import type { apiResponse } from '@cadence/types';

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

type CreateNormalItemInput = z.infer<typeof createNormalItemSchema>;
type CreateTaskItemInput = z.infer<typeof createTaskItemSchema>;
type CreateHabitItemInput = z.infer<typeof createHabitItemSchema>;

type ItemsResponse = {
  normalItems: NormalItem[];
  taskItems: TaskItem[];
  habitItems: HabitItem[];
};

type DbItem = {
  id: string;
  user_id: string;
  kind: 'normal' | 'task' | 'habit';
  title: string;
  description: string | null;

  scheduled_date: string | null;
  scheduled_time: string | null;

  recurrence_kind: 'daily' | 'weekly' | null;
  recurrence_days: Weekday[] | null;
  recurrence_start_date: string | null;
  recurrence_end_date: string | null;

  completed_at: string | null;
  completed_on: string | null;

  created_at: string;
  updated_at: string;
};

const ITEM_SELECT = `
  id,
  user_id,
  kind,
  title,
  description,
  scheduled_date,
  scheduled_time,
  recurrence_kind,
  recurrence_days,
  recurrence_start_date,
  recurrence_end_date,
  completed_at,
  completed_on,
  created_at,
  updated_at
`;

function mapDbItemToFrontend(item: DbItem): NormalItem | TaskItem | HabitItem {
  const base = {
    id: item.id,
    userId: item.user_id,
    title: item.title,
    description: item.description,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };

  switch (item.kind) {
    case 'normal':
      return {
        ...base,
        kind: 'normal',
        scheduledDate: null,
        scheduledTime: null,
        recurrenceKind: null,
        recurrenceDays: null,
        recurrenceStartDate: null,
        recurrenceEndDate: null,
        completedAt: item.completed_at,
        completedOn: item.completed_on,
      };

    case 'task':
      return {
        ...base,
        kind: 'task',
        scheduledDate: item.scheduled_date!,
        scheduledTime: item.scheduled_time,
        recurrenceKind: null,
        recurrenceDays: null,
        recurrenceStartDate: null,
        recurrenceEndDate: null,
        completedAt: item.completed_at,
        completedOn: null,
      };

    case 'habit':
      return {
        ...base,
        kind: 'habit',
        scheduledDate: null,
        scheduledTime: item.scheduled_time,
        recurrenceKind: item.recurrence_kind!,
        recurrenceDays: item.recurrence_days,
        recurrenceStartDate: item.recurrence_start_date!,
        recurrenceEndDate: item.recurrence_end_date,
        completedAt: null,
        completedOn: null,
      };
  }
}

/**
 * Insert one item row, idempotently when the client supplied the id.
 *
 * - Replaying a create with the same id (a retry after a lost response, or
 *   the offline queue flushing) returns the row that already exists.
 * - An RLS rejection means the row is not editable any more (a task dated in
 *   the past, a habit that has already ended): ITEM_LOCKED, not a 500.
 */
async function insertItem(
  supabase: SupabaseClient,
  userId: string,
  row: Record<string, unknown>,
  failureCode: string,
): Promise<DbItem> {
  const { data, error } = await supabase
    .from('items')
    .insert({ user_id: userId, ...row })
    .select(ITEM_SELECT)
    .single();

  if (!error && data) return data as DbItem;

  if (error?.code === PG_UNIQUE_VIOLATION && typeof row.id === 'string') {
    const { data: existing } = await supabase
      .from('items')
      .select(ITEM_SELECT)
      .eq('id', row.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing && (existing as DbItem).kind === row.kind) {
      return existing as DbItem;
    }

    throw new Error('ITEM_ID_CONFLICT');
  }

  if (error?.code === PG_RLS_VIOLATION) {
    throw new Error('ITEM_LOCKED');
  }

  console.error(`Failed to insert item (${failureCode}):`, error);
  throw new Error(failureCode);
}

/** The user's current Cadence date, from the database (app_today). */
async function getCadenceToday(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('app_today', {
    p_user_id: userId,
  });

  if (error || !data) {
    console.error('Failed to resolve current Cadence date:', error);
    throw new Error('CADENCE_DATE_RESOLUTION_FAILED');
  }

  return String(data);
}

/** TypeScript mirror of public.habit_occurs_on(). */
function habitOccursOn(item: DbItem, date: string): boolean {
  if (!item.recurrence_start_date || date < item.recurrence_start_date) {
    return false;
  }

  if (item.recurrence_end_date && date > item.recurrence_end_date) {
    return false;
  }

  if (item.recurrence_kind === 'daily') return true;

  return (item.recurrence_days ?? []).includes(isoWeekday(date) as Weekday);
}

export async function getItemsByUserId(
  userId: string,
  accessToken: string,
): Promise<apiResponse<ItemsResponse>> {
  const supabase = createSupabaseClient(accessToken);

  const { data, error } = await supabase
    .from('items')
    .select(ITEM_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch items:', error);
    throw new Error('ITEMS_FETCH_FAILED');
  }

  const items = (data ?? []) as DbItem[];

  const normalItems: NormalItem[] = [];
  const taskItems: TaskItem[] = [];
  const habitItems: HabitItem[] = [];

  for (const item of items) {
    const mapped = mapDbItemToFrontend(item);

    switch (mapped.kind) {
      case 'normal':
        normalItems.push(mapped);
        break;

      case 'task':
        taskItems.push(mapped);
        break;

      case 'habit':
        habitItems.push(mapped);
        break;
    }
  }

  return {
    success: true,
    data: {
      normalItems,
      taskItems,
      habitItems,
    },
  };
}

export async function addNormalItemByUserId(
  userId: string,
  accessToken: string,
  input: CreateNormalItemInput,
): Promise<apiResponse<NormalItem>> {
  const supabase = createSupabaseClient(accessToken);

  const row = await insertItem(
    supabase,
    userId,
    {
      ...(input.id && { id: input.id }),
      kind: 'normal',
      title: input.title,
      description: input.description ?? null,

      scheduled_date: null,
      scheduled_time: null,

      recurrence_kind: null,
      recurrence_days: null,
      recurrence_start_date: null,
      recurrence_end_date: null,

      completed_at: null,
    },
    'NORMAL_ITEM_CREATE_FAILED',
  );

  return {
    success: true,
    data: mapDbItemToFrontend(row) as NormalItem,
  };
}

export async function addTaskItemByUserId(
  userId: string,
  accessToken: string,
  input: CreateTaskItemInput,
): Promise<apiResponse<TaskItem>> {
  const supabase = createSupabaseClient(accessToken);

  const row = await insertItem(
    supabase,
    userId,
    {
      ...(input.id && { id: input.id }),
      kind: 'task',
      title: input.title,
      description: input.description ?? null,

      scheduled_date: input.scheduledDate,
      scheduled_time: input.scheduledTime ?? null,

      recurrence_kind: null,
      recurrence_days: null,
      recurrence_start_date: null,
      recurrence_end_date: null,

      completed_at: null,
    },
    'TASK_ITEM_CREATE_FAILED',
  );

  return {
    success: true,
    data: mapDbItemToFrontend(row) as TaskItem,
  };
}

export async function addHabitItemByUserId(
  userId: string,
  accessToken: string,
  input: CreateHabitItemInput,
): Promise<apiResponse<HabitItem>> {
  const supabase = createSupabaseClient(accessToken);

  const row = await insertItem(
    supabase,
    userId,
    {
      ...(input.id && { id: input.id }),
      kind: 'habit',
      title: input.title,
      description: input.description ?? null,

      scheduled_date: null,
      scheduled_time: input.scheduledTime ?? null,

      recurrence_kind: input.recurrence.kind,
      recurrence_days: input.recurrence.days,
      recurrence_start_date: input.recurrence.startDate,
      recurrence_end_date: input.recurrence.endDate,

      completed_at: null,
    },
    'HABIT_ITEM_CREATE_FAILED',
  );

  return {
    success: true,
    data: mapDbItemToFrontend(row) as HabitItem,
  };
}

export type CompleteItemResult =
  | {
      kind: 'normal';
      item: NormalItem;
    }
  | {
      kind: 'task';
      item: TaskItem;
    }
  | {
      kind: 'habit';
      completion: HabitCompletion;
    };

/**
 * Complete a normal item, task or habit occurrence.
 *
 * Only the item id comes from the client; the kind and every rule come from
 * the database row and app_today(). `expectedDate` is the Cadence date the
 * user saw when they ticked the box (the offline queue may deliver it later):
 * a task or habit completion that arrives after that day has ended is
 * rejected with DAY_ENDED instead of being recorded against the wrong day.
 *
 * Idempotent: completing something that is already complete returns it.
 *
 * Error codes: ITEM_NOT_FOUND, DAY_ENDED, TASK_NOT_YET_DUE, ITEM_LOCKED,
 * HABIT_NOT_DUE_TODAY, CADENCE_DATE_RESOLUTION_FAILED, *_COMPLETION_FAILED.
 */
export async function completeItemByUserId(
  userId: string,
  token: string,
  itemId: string,
  expectedDate?: string,
): Promise<CompleteItemResult> {
  const supabase = createSupabaseClient(token);

  const { data: itemData, error: itemError } = await supabase
    .from('items')
    .select(ITEM_SELECT)
    .eq('id', itemId)
    .eq('user_id', userId)
    .maybeSingle();

  if (itemError || !itemData) {
    if (itemError) {
      console.error('Failed to fetch item before completion:', itemError);
    }

    throw new Error('ITEM_NOT_FOUND');
  }

  const item = itemData as DbItem;

  switch (item.kind) {
    case 'normal':
    case 'task': {
      // Already complete: idempotent success.
      if (item.completed_at) {
        return {
          kind: item.kind,
          item: mapDbItemToFrontend(item) as NormalItem | TaskItem,
        } as CompleteItemResult;
      }

      if (item.kind === 'task') {
        const today = await getCadenceToday(supabase, userId);

        if (expectedDate && expectedDate !== today) {
          throw new Error('DAY_ENDED');
        }

        // A task can only be completed on its scheduled Cadence date:
        // not before (not yet due) and not after (items_update_own locks it).
        if (item.scheduled_date! > today) {
          throw new Error('TASK_NOT_YET_DUE');
        }

        if (item.scheduled_date! < today) {
          throw new Error('ITEM_LOCKED');
        }
      }

      const { data, error } = await supabase
        .from('items')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', item.id)
        .eq('user_id', userId)
        .select(ITEM_SELECT)
        .maybeSingle();

      if (error || !data) {
        // No row back means RLS no longer considers the item editable.
        if (!error) throw new Error('ITEM_LOCKED');

        console.error(`Failed to complete ${item.kind} item:`, error);

        throw new Error(
          item.kind === 'normal'
            ? 'NORMAL_ITEM_COMPLETION_FAILED'
            : 'TASK_ITEM_COMPLETION_FAILED',
        );
      }

      return {
        kind: item.kind,
        item: mapDbItemToFrontend(data as DbItem) as NormalItem | TaskItem,
      } as CompleteItemResult;
    }

    case 'habit': {
      // Never trust an occurrence date from the client: app_today() applies
      // the user's day boundary in the database.
      const occurrenceDate = await getCadenceToday(supabase, userId);

      if (expectedDate && expectedDate !== occurrenceDate) {
        throw new Error('DAY_ENDED');
      }

      const findCompletion = () =>
        supabase
          .from('habit_completions')
          .select('id, user_id, item_id, occurrence_date, completed_at')
          .eq('item_id', item.id)
          .eq('user_id', userId)
          .eq('occurrence_date', occurrenceDate)
          .maybeSingle();

      // Retries are idempotent.
      const { data: existing, error: existingError } = await findCompletion();

      if (existingError) {
        console.error(
          'Failed to check existing habit completion:',
          existingError,
        );
        throw new Error('HABIT_COMPLETION_CHECK_FAILED');
      }

      if (existing) {
        return { kind: 'habit', completion: mapCompletion(existing) };
      }

      // Mirrors habit_completions_insert_own: the habit must occur today.
      if (!habitOccursOn(item, occurrenceDate)) {
        throw new Error('HABIT_NOT_DUE_TODAY');
      }

      const { data: completion, error: completionError } = await supabase
        .from('habit_completions')
        .insert({
          user_id: userId,
          item_id: item.id,
          item_kind: 'habit',
          occurrence_date: occurrenceDate,
        })
        .select('id, user_id, item_id, occurrence_date, completed_at')
        .single();

      if (completionError || !completion) {
        // habit_completions_item_date_key: another request won the race.
        if (completionError?.code === PG_UNIQUE_VIOLATION) {
          const { data: concurrent } = await findCompletion();

          if (concurrent) {
            return { kind: 'habit', completion: mapCompletion(concurrent) };
          }
        }

        if (completionError?.code === PG_RLS_VIOLATION) {
          throw new Error('HABIT_NOT_DUE_TODAY');
        }

        console.error('Failed to complete habit item:', completionError);
        throw new Error('HABIT_ITEM_COMPLETION_FAILED');
      }

      return { kind: 'habit', completion: mapCompletion(completion) };
    }

    default:
      throw new Error('UNSUPPORTED_ITEM_KIND');
  }
}

function mapCompletion(row: {
  id: string;
  user_id: string;
  item_id: string;
  occurrence_date: string;
  completed_at: string;
}): HabitCompletion {
  return {
    id: row.id,
    userId: row.user_id,
    itemId: row.item_id,
    occurrenceDate: row.occurrence_date,
    completedAt: row.completed_at,
  };
}
