import type { HabitCompletion } from '@cadence/types';

import { createSupabaseClient } from '../supabase/supabase';
import type { apiResponse } from '@cadence/types';

type DbHabitCompletion = {
  id: string;
  user_id: string;
  item_id: string;
  occurrence_date: string;
  completed_at: string;
};

const HABIT_COMPLETION_SELECT = `
  id,
  user_id,
  item_id,
  occurrence_date,
  completed_at
`;

function mapDbHabitCompletion(completion: DbHabitCompletion): HabitCompletion {
  return {
    id: completion.id,
    userId: completion.user_id,
    itemId: completion.item_id,
    occurrenceDate: completion.occurrence_date,
    completedAt: completion.completed_at,
  };
}

export async function getHabitCompletionsByUserId(
  userId: string,
  accessToken: string,
): Promise<apiResponse<HabitCompletion[]>> {
  const supabase = createSupabaseClient(accessToken);

  const { data, error } = await supabase
    .from('habit_completions')
    .select(HABIT_COMPLETION_SELECT)
    .eq('user_id', userId)
    .order('occurrence_date', { ascending: false })
    .order('completed_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch habit completions:', error);

    throw new Error('HABIT_COMPLETIONS_FETCH_FAILED');
  }

  const completions = (data ?? []) as DbHabitCompletion[];

  return {
    success: true,
    data: completions.map(mapDbHabitCompletion),
  };
}
