/*
 * What to tell the user when the server permanently refuses a change that
 * was already shown as done. Keyed by backend error code. Each message says
 * what happened to the change, not just that something failed.
 */

const COMPLETION_MESSAGES: Record<string, string> = {
  DAY_ENDED:
    'wasn’t marked done: that day ended before Cadence could reach the server.',
  HABIT_NOT_DUE_TODAY: 'isn’t scheduled for today, so it can’t be marked done.',
  TASK_NOT_YET_DUE: 'is scheduled for a later day, so it can’t be done yet.',
  ITEM_LOCKED: 'belongs to a day that has passed, so it can no longer change.',
  ITEM_NOT_FOUND: 'no longer exists, so it couldn’t be marked done.',
};

const CREATE_MESSAGES: Record<string, string> = {
  ITEM_LOCKED: 'wasn’t added: its day had already passed by the time it synced.',
  VALIDATION_ERROR: 'wasn’t added: the server rejected its details.',
};

const TREE_MESSAGES: Record<string, string> = {
  FOLDER_NOT_FOUND: 'Its folder no longer exists.',
  PARENT_FOLDER_NOT_FOUND: 'Its folder no longer exists.',
  NOTE_NOT_FOUND: 'The note no longer exists.',
  FOLDER_MOVE_CREATES_CYCLE: 'A folder can’t move into its own subfolder.',
};

export function completionFailureMessage(title: string, code?: string) {
  const reason =
    (code && COMPLETION_MESSAGES[code]) ?? 'couldn’t be marked done.';

  return `“${title}” ${reason}`;
}

export function createFailureMessage(title: string, code?: string) {
  const reason = (code && CREATE_MESSAGES[code]) ?? 'couldn’t be added.';

  return `“${title}” ${reason}`;
}

export function treeFailureMessage(action: string, code?: string) {
  const reason = code ? TREE_MESSAGES[code] : undefined;

  return reason
    ? `${action} didn’t sync. ${reason} The notes list now shows what the server has.`
    : `${action} didn’t sync. The notes list now shows what the server has.`;
}
