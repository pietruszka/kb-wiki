import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import {
  activityWindow,
  countActions,
  entryInLastDays,
  formatAge,
  newestFirst,
  parseLog,
  weeklyCounts,
} from './log';

const sample = `# Log

Intro without a heading.

## [2026-11-20] ingest | Retrieval versus a compiled wiki

Filed the comparison as a draft.

+ retrieval-vs-compiled-wiki

## [2026-11-25] lint | Sample pages pass

The build accepts the sample set.

0 warnings

## [2026-10-02] update | Obsidian

Marked the entity page stale.

~ obsidian
`;

test('log parsing keeps the date, action, subject, and detail lines', () => {
  const entries = parseLog(sample);
  expect(entries).toHaveLength(3);
  expect(entries[1]).toMatchObject({
    date: '2026-11-25',
    action: 'lint',
    subject: 'Sample pages pass',
    line: 11,
  });
  expect(entries[0]?.blocks).toEqual([
    { kind: 'note', text: 'Filed the comparison as a draft.' },
    { kind: 'add', text: 'retrieval-vs-compiled-wiki' },
  ]);
  expect(entries[2]?.blocks[1]).toEqual({ kind: 'change', text: 'obsidian' });
  expect(newestFirst(entries).map((entry) => entry.date)).toEqual([
    '2026-11-25',
    '2026-11-20',
    '2026-10-02',
  ]);
});

test('malformed log entry fails', () => {
  const cases: Array<[string, string]> = [
    ['## 2026-11-25 ingest | Missing brackets\n\nBody.\n', 'must look like'],
    ['## [2026-13-40] ingest | Bad day\n\nBody.\n', 'not a real date'],
    ['## [2026-11-31] ingest | Bad day\n\nBody.\n', 'not a real date'],
    ['## [2026-11-25] nope | Unknown\n\nBody.\n', 'unknown action "nope"'],
    ['## [2026-11-25] ingest | \n\nBody.\n', 'subject is empty'],
    ['## [2026-11-25] ingest | Empty body\n\n', 'empty body'],
    ['##\t[2026-11-25] nope | Broken\n\nBody.\n', 'must look like'],
    [
      '## [2026-11-25] ingest | Real\n\nBody.\n\n##\t[2026-11-25] nope | Broken\n\nMore.\n',
      'must look like',
    ],
  ];
  for (const [text, message] of cases) {
    expect(() => parseLog(text, 'log.md'), text).toThrow(new RegExp(`log\\.md:\\d+: .*${message}`));
  }
});

test('the repository log parses', () => {
  const text = readFileSync(fileURLToPath(new URL('../../../log.md', import.meta.url)), 'utf8');
  const entries = newestFirst(parseLog(text, 'log.md'));
  expect(entries.length).toBeGreaterThan(0);
  expect(entries.every((entry) => entry.subject.length > 0)).toBe(true);
  const counts = countActions(entries);
  expect(counts.ingest + counts.update + counts.lint + counts.query).toBe(entries.length);
});

test('activity windows and ages use the given day', () => {
  const entries = parseLog(sample);
  const today = '2026-11-25';
  const activity = activityWindow(entries, today, 30);
  expect(activity).toHaveLength(30);
  expect(activity.at(-1)?.date).toBe(today);
  expect(activity.find((day) => day.date === '2026-11-25')?.count).toBe(1);
  expect(activity.some((day) => day.date === '2026-10-02')).toBe(false);
  expect(entryInLastDays('2026-11-20', today, 30)).toBe(true);
  expect(entryInLastDays('2026-10-02', today, 30)).toBe(false);
  expect(weeklyCounts(entries, today, 8).reduce((sum, count) => sum + count, 0)).toBe(3);
  expect(formatAge(0)).toBe('today');
  expect(formatAge(1)).toBe('1 day ago');
  expect(formatAge(20)).toBe('20 days ago');
});
