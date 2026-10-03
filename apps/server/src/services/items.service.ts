import { HabitItem, NormalItem, TaskItem, Weekday } from '@cadence/types';
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
