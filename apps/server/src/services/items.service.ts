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

import { createSupabaseClient } from '../supabase/supabase';
import { apiResponse } from '../types/types';

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
      };
  }
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

  const { data, error } = await supabase
    .from('items')
    .insert({
      user_id: userId,
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
    })
    .select(ITEM_SELECT)
    .single();

  if (error) {
    console.error('Failed to add normal item:', error);
    throw new Error('NORMAL_ITEM_CREATE_FAILED');
  }

  return {
    success: true,
    data: mapDbItemToFrontend(data as DbItem) as NormalItem,
  };
}

export async function addTaskItemByUserId(
  userId: string,
  accessToken: string,
  input: CreateTaskItemInput,
): Promise<apiResponse<TaskItem>> {
  const supabase = createSupabaseClient(accessToken);

  const { data, error } = await supabase
    .from('items')
    .insert({
      user_id: userId,
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
    })
    .select(ITEM_SELECT)
    .single();

  if (error) {
    console.error('Failed to add task item:', error);
    throw new Error('TASK_ITEM_CREATE_FAILED');
  }

  return {
    success: true,
    data: mapDbItemToFrontend(data as DbItem) as TaskItem,
  };
}

export async function addHabitItemByUserId(
  userId: string,
  accessToken: string,
  input: CreateHabitItemInput,
): Promise<apiResponse<HabitItem>> {
  const supabase = createSupabaseClient(accessToken);

  const { data, error } = await supabase
    .from('items')
    .insert({
      user_id: userId,
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
    })
    .select(ITEM_SELECT)
    .single();

  if (error) {
    console.error('Failed to add habit item:', error);
    throw new Error('HABIT_ITEM_CREATE_FAILED');
  }

  return {
    success: true,
    data: mapDbItemToFrontend(data as DbItem) as HabitItem,
  };
}

// Replace the existing completion section in items.service.ts with this code.
// The existing file already imports HabitItem, NormalItem, TaskItem and defines
// DbItem, ITEM_SELECT, createSupabaseClient, and mapDbItemToFrontend.
// Add HabitCompletion to the @cadence/types import.
//
// @cadence/types import should become:
// import { HabitCompletion, HabitItem, NormalItem, TaskItem, Weekday } from '@cadence/types';

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

export async function completeItemByUserId(
  userId: string,
  token: string,
  itemId: string,
): Promise<CompleteItemResult> {
  const supabase = createSupabaseClient(token);

  // Only itemId is accepted from the client. The DB row determines the kind.
  const { data: itemData, error: itemError } = await supabase
    .from('items')
    .select(ITEM_SELECT)
    .eq('id', itemId)
    .eq('user_id', userId)
    .single();

  if (itemError || !itemData) {
    console.error('Failed to fetch item before completion:', itemError);
    throw new Error('ITEM_NOT_FOUND');
  }

  const item = itemData as DbItem;

  switch (item.kind) {
    case 'normal':
    case 'task': {
      // A task can only be completed on its scheduled Cadence date.
      // Future tasks must remain incomplete until their scheduled date arrives.
      if (item.kind === 'task') {
        const { data: cadenceDate, error: cadenceDateError } =
          await supabase.rpc('app_today', { p_user_id: userId });

        if (cadenceDateError || !cadenceDate) {
          console.error(
            'Failed to resolve current Cadence date:',
            cadenceDateError,
          );

          throw new Error('CADENCE_DATE_RESOLUTION_FAILED');
        }

        if (item.scheduled_date! > String(cadenceDate)) {
          throw new Error('TASK_NOT_YET_DUE');
        }
      }

      // Normal/task completion is stored directly on items.completed_at.
      if (item.completed_at) {
        return {
          kind: item.kind,
          item: mapDbItemToFrontend(item) as NormalItem | TaskItem,
        } as CompleteItemResult;
      }

      const { data, error } = await supabase
        .from('items')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', item.id)
        .eq('user_id', userId)
        .select(ITEM_SELECT)
        .single();

      if (error || !data) {
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
      // Never trust an occurrence date from the client.
      // app_today() uses the user's Cadence day boundary in the database.
      const { data: cadenceDate, error: cadenceDateError } = await supabase.rpc(
        'app_today',
        { p_user_id: userId },
      );

      if (cadenceDateError || !cadenceDate) {
        console.error(
          'Failed to resolve current Cadence date:',
          cadenceDateError,
        );
        throw new Error('CADENCE_DATE_RESOLUTION_FAILED');
      }

      const occurrenceDate = String(cadenceDate);

      // First make retries idempotent.
      const { data: existingCompletion, error: existingCompletionError } =
        await supabase
          .from('habit_completions')
          .select('id, user_id, item_id, occurrence_date, completed_at')
          .eq('item_id', item.id)
          .eq('user_id', userId)
          .eq('occurrence_date', occurrenceDate)
          .maybeSingle();

      if (existingCompletionError) {
        console.error(
          'Failed to check existing habit completion:',
          existingCompletionError,
        );
        throw new Error('HABIT_COMPLETION_CHECK_FAILED');
      }

      if (existingCompletion) {
        return {
          kind: 'habit',
          completion: {
            id: existingCompletion.id,
            userId: existingCompletion.user_id,
            itemId: existingCompletion.item_id,
            occurrenceDate: existingCompletion.occurrence_date,
            completedAt: existingCompletion.completed_at,
          },
        };
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
        // The DB unique constraint prevents two completions for the same
        // habit occurrence. If another request won the race, return that row.
        if (completionError?.code === '23505') {
          const { data: concurrentCompletion } = await supabase
            .from('habit_completions')
            .select('id, user_id, item_id, occurrence_date, completed_at')
            .eq('item_id', item.id)
            .eq('user_id', userId)
            .eq('occurrence_date', occurrenceDate)
            .single();

          if (concurrentCompletion) {
            return {
              kind: 'habit',
              completion: {
                id: concurrentCompletion.id,
                userId: concurrentCompletion.user_id,
                itemId: concurrentCompletion.item_id,
                occurrenceDate: concurrentCompletion.occurrence_date,
                completedAt: concurrentCompletion.completed_at,
              },
            };
          }
        }

        console.error('Failed to complete habit item:', completionError);
        throw new Error('HABIT_ITEM_COMPLETION_FAILED');
      }

      return {
        kind: 'habit',
        completion: {
          id: completion.id,
          userId: completion.user_id,
          itemId: completion.item_id,
          occurrenceDate: completion.occurrence_date,
          completedAt: completion.completed_at,
        },
      };
    }

    default:
      throw new Error('UNSUPPORTED_ITEM_KIND');
  }
}
