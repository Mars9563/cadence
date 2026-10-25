import { strFromU8 } from 'fflate';
import { describe, expect, it } from 'vitest';

import { buildExportEntries, folderPaths, safeFileName, uniqueName, type ExportData } from './files.js';

describe('safeFileName', () => {
  it('replaces characters no filesystem allows', () => {
    expect(safeFileName('a/b:c')).toBe('a-b-c');
    expect(safeFileName('what? <now>')).toBe('what- -now-');
  });

  it('falls back for empty or dot-only names', () => {
    expect(safeFileName('  ')).toBe('Untitled');
    expect(safeFileName('..')).toBe('Untitled');
  });

  it('avoids Windows reserved names', () => {
    expect(safeFileName('CON')).toBe('_CON');
    expect(safeFileName('lpt1')).toBe('_lpt1');
  });

  it('caps very long names', () => {
    expect(safeFileName('x'.repeat(300))).toHaveLength(120);
  });
});

describe('uniqueName', () => {
  it('numbers repeats, ignoring case', () => {
    const taken = new Set<string>();
    expect(uniqueName('Plan', taken)).toBe('Plan');
    expect(uniqueName('Plan', taken)).toBe('Plan (2)');
    expect(uniqueName('plan', taken)).toBe('plan (3)');
  });
});

describe('folderPaths', () => {
  const folders = [
    { id: 'root', parentId: null, name: 'Root', isRoot: true },
    { id: 'work', parentId: 'root', name: 'Work', isRoot: false },
    { id: 'work2', parentId: 'root', name: 'Work', isRoot: false },
    { id: 'ideas', parentId: 'work', name: 'Ideas', isRoot: false },
    { id: 'lost', parentId: 'missing', name: 'Lost', isRoot: false },
  ];

  it('builds nested, unique, safe paths', () => {
    const paths = folderPaths(folders);
    expect(paths.get('root')).toBe('');
    expect(paths.get('work')).toBe('Work');
    expect(paths.get('work2')).toBe('Work (2)');
    expect(paths.get('ideas')).toBe('Work/Ideas');
    expect(paths.get('lost')).toBe('Lost');
  });
});

const empty: ExportData = {
  profile: {
    id: 'u1',
    email: 'me@example.com',
    displayName: 'Me',
    avatarUrl: null,
    avatarPublicId: null,
    dayEndTime: '04:00:00',
    timeZone: 'Asia/Kolkata',
    pendingTimeZone: null,
    pendingDayEndTime: null,
    pendingEffectiveAt: null,
    onboardedAt: null,
    theme: 'sage',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  items: { normalItems: [], taskItems: [], habitItems: [] },
  habitCompletions: [],
  folders: [{ id: 'root', parentId: null, name: 'Root', isRoot: true }],
  notes: [],
  dailyNotes: [],
};

describe('buildExportEntries', () => {
  const at = new Date('2026-10-20T10:00:00Z');
  const root = 'cadence-export-2026-10-20/';

  it('lays out notes, daily notes and JSON under one folder', () => {
    const entries = buildExportEntries(
      {
        ...empty,
        folders: [...empty.folders, { id: 'work', parentId: 'root', name: 'Work', isRoot: false }],
        notes: [
          { id: 'n1', folderId: 'work', title: 'Plan', content: '# Plan\nShip it.' },
          { id: 'n2', folderId: 'work', title: 'Plan', content: 'second' },
          { id: 'n3', folderId: 'root', title: '', content: 'untitled' },
        ],
        dailyNotes: [{ noteDate: '2026-10-19', content: 'A good day.' }],
      },
      at,
    );

    expect(Object.keys(entries).sort()).toEqual(
      [
        'README.txt',
        'daily-notes/2026-10-19.md',
        'habit-completions.json',
        'items.json',
        'notes/Untitled.md',
        'notes/Work/Plan (2).md',
        'notes/Work/Plan.md',
        'profile.json',
      ]
        .map((name) => root + name)
        .sort(),
    );
    expect(strFromU8(entries[`${root}notes/Work/Plan.md`]!)).toBe('# Plan\nShip it.');
    expect(strFromU8(entries[`${root}daily-notes/2026-10-19.md`]!)).toBe('A good day.');
  });

  it('still produces the basics for an empty account', () => {
    const entries = buildExportEntries(empty, at);

    expect(entries[`${root}README.txt`]).toBeDefined();
    expect(JSON.parse(strFromU8(entries[`${root}profile.json`]!)).email).toBe('me@example.com');
    expect(JSON.parse(strFromU8(entries[`${root}items.json`]!))).toEqual({
      normalItems: [],
      taskItems: [],
      habitItems: [],
    });
  });
});
