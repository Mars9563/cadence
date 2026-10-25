import { strToU8 } from 'fflate';
import type { GetItemsResponse, HabitCompletion, Profile } from '@cadence/types';

/*
 * The layout of a data export (pure; the route zips what this returns):
 *
 *   cadence-export-YYYY-MM-DD/
 *     README.txt, profile.json, items.json, habit-completions.json
 *     notes/<folder path>/<title>.md
 *     daily-notes/YYYY-MM-DD.md
 */

export type ExportFolder = { id: string; parentId: string | null; name: string; isRoot: boolean };

export type ExportData = {
  profile: Profile;
  items: GetItemsResponse;
  habitCompletions: HabitCompletion[];
  folders: ExportFolder[];
  notes: { id: string; folderId: string; title: string; content: string }[];
  dailyNotes: { noteDate: string; content: string }[];
};

const MAX_NAME_LENGTH = 120;
// Control characters are matched on purpose: they're invalid in file names.
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARACTERS = /[/\\:*?"<>|\u0000-\u001f\u007f]/g;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/** A name that works as a file or folder on Windows, macOS and Linux. */
export function safeFileName(name: string, fallback = 'Untitled'): string {
  let safe = name.replace(UNSAFE_CHARACTERS, '-').trim().replace(/^[.\s]+|[.\s]+$/g, '');

  if (!safe) return fallback;
  if (WINDOWS_RESERVED.test(safe)) safe = `_${safe}`;

  return safe.slice(0, MAX_NAME_LENGTH);
}

/** `name`, or `name (2)`, `name (3)`… if already taken (case-insensitive). */
export function uniqueName(name: string, taken: Set<string>): string {
  let candidate = name;

  for (let n = 2; taken.has(candidate.toLowerCase()); n++) {
    candidate = `${name} (${n})`;
  }

  taken.add(candidate.toLowerCase());
  return candidate;
}

/** Folder id -> path relative to notes/ ('' for the root folder). */
export function folderPaths(folders: ExportFolder[]): Map<string, string> {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const paths = new Map<string, string>();
  const takenPerParent = new Map<string, Set<string>>();

  const pathOf = (folder: ExportFolder, seen: Set<string>): string => {
    const known = paths.get(folder.id);
    if (known !== undefined) return known;

    if (folder.isRoot) {
      paths.set(folder.id, '');
      return '';
    }

    const parent = folder.parentId ? byId.get(folder.parentId) : undefined;

    // A missing parent (or a loop) puts the folder at the top level.
    const parentPath = parent && !seen.has(parent.id) ? pathOf(parent, new Set(seen).add(folder.id)) : '';
    const parentKey = parent && !seen.has(parent.id) ? parent.id : '';

    const taken = takenPerParent.get(parentKey) ?? new Set<string>();
    takenPerParent.set(parentKey, taken);

    const name = uniqueName(safeFileName(folder.name), taken);
    const path = parentPath ? `${parentPath}/${name}` : name;

    paths.set(folder.id, path);
    return path;
  };

  for (const folder of folders) pathOf(folder, new Set());

  return paths;
}

const json = (value: unknown) => strToU8(`${JSON.stringify(value, null, 2)}\n`);

function readme(data: ExportData, exportedAt: Date): string {
  return [
    'Cadence data export',
    '',
    `Exported:  ${exportedAt.toISOString()}`,
    `Account:   ${data.profile.email ?? ''}`,
    `Time zone: ${data.profile.timeZone} (day ends at ${data.profile.dayEndTime.slice(0, 5)})`,
    '',
    'notes/                  your notes as Markdown, in their folders',
    'daily-notes/            one Markdown file per day',
    'items.json              habits, tasks and to-dos',
    'habit-completions.json  which habit was done on which Cadence date',
    'profile.json            your account settings',
    '',
    'Dates in Cadence are "Cadence dates": they follow your time zone and day end.',
    '',
  ].join('\n');
}

export function buildExportEntries(data: ExportData, exportedAt: Date): Record<string, Uint8Array> {
  const root = `cadence-export-${exportedAt.toISOString().slice(0, 10)}/`;
  const entries: Record<string, Uint8Array> = {};
  const { profile } = data;

  entries[`${root}README.txt`] = strToU8(readme(data, exportedAt));
  entries[`${root}profile.json`] = json({
    email: profile.email,
    displayName: profile.displayName,
    timeZone: profile.timeZone,
    dayEndTime: profile.dayEndTime,
    theme: profile.theme,
    hasUploadedPhoto: profile.avatarPublicId !== null,
    onboardedAt: profile.onboardedAt,
    createdAt: profile.createdAt,
  });
  entries[`${root}items.json`] = json(data.items);
  entries[`${root}habit-completions.json`] = json(data.habitCompletions);

  const paths = folderPaths(data.folders);
  const takenPerFolder = new Map<string, Set<string>>();

  for (const note of data.notes) {
    const folderPath = paths.get(note.folderId) ?? '';
    const taken = takenPerFolder.get(folderPath) ?? new Set<string>();
    takenPerFolder.set(folderPath, taken);

    const fileName = `${uniqueName(safeFileName(note.title), taken)}.md`;
    const path = folderPath ? `notes/${folderPath}/${fileName}` : `notes/${fileName}`;

    entries[root + path] = strToU8(note.content);
  }

  for (const note of data.dailyNotes) {
    entries[`${root}daily-notes/${note.noteDate}.md`] = strToU8(note.content);
  }

  return entries;
}
