export const LOG_ACTIONS = ['ingest', 'query', 'lint', 'update'] as const;
export type LogAction = (typeof LOG_ACTIONS)[number];

export type LogDetailKind = 'add' | 'change' | 'warn' | 'filed';

export type LogBlock =
  | { kind: 'note'; text: string }
  | { kind: LogDetailKind; text: string };

export type LogEntry = {
  date: string;
  action: LogAction;
  subject: string;
  line: number;
  blocks: LogBlock[];
};

const HEADING = /^## \[(\d{4}-\d{2}-\d{2})\] ([a-z]+) \| (.*)$/;
const DETAIL: Record<string, LogDetailKind> = {
  '+': 'add',
  '~': 'change',
  '!': 'warn',
  '>': 'filed',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function fail(file: string, line: number, message: string): never {
  throw new Error(`${file}:${line}: ${message}`);
}

export function isLogAction(value: string): value is LogAction {
  return (LOG_ACTIONS as readonly string[]).includes(value);
}

/** True when `YYYY-MM-DD` is a real calendar day. */
export function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function weekdayUtc(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return '';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return WEEKDAYS[date.getUTCDay()] ?? '';
}

export function logEntryId(entry: LogEntry): string {
  return `log-${entry.date}-${entry.action}-${entry.line}`;
}

function blocksFromBody(body: string): LogBlock[] {
  const blocks: LogBlock[] = [];
  let note: string[] = [];
  const flush = () => {
    const text = note.join(' ').replace(/\s+/g, ' ').trim();
    if (text) blocks.push({ kind: 'note', text });
    note = [];
  };
  for (const line of body.split(/\r?\n/)) {
    if (!line.trim()) {
      flush();
      continue;
    }
    const kind = DETAIL[line[0] ?? ''];
    if (kind) {
      flush();
      blocks.push({ kind, text: line.slice(1).trim() });
      continue;
    }
    note.push(line.trim());
  }
  flush();
  return blocks;
}

/**
 * Parse an append-only log. Entries are level-2 headings:
 * `## [YYYY-MM-DD] action | subject`
 * followed by a non-empty body. Prose before the first entry is the introduction.
 */
export function parseLog(text: string, file = 'log.md'): LogEntry[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const headings: { index: number; line: number }[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    // A level-2 heading is `##` plus a space, a tab, or the end of the line.
    // `###` is not one. Anything else that looks like one fails below.
    if (/^##(?:[ \t]|$)/.test(lines[index] ?? '')) headings.push({ index, line: index + 1 });
  }

  const entries: LogEntry[] = [];
  for (let i = 0; i < headings.length; i += 1) {
    const current = headings[i];
    if (!current) continue;
    const raw = lines[current.index] ?? '';
    const match = HEADING.exec(raw);
    if (!match) {
      fail(file, current.line, 'heading must look like "## [YYYY-MM-DD] action | subject"');
    }
    const date = match[1] ?? '';
    const action = match[2] ?? '';
    const subject = (match[3] ?? '').trim();
    if (!isCalendarDate(date)) fail(file, current.line, `${date} is not a real date`);
    if (!isLogAction(action)) {
      fail(file, current.line, `unknown action "${action}". Expected ${LOG_ACTIONS.join(', ')}`);
    }
    if (!subject) fail(file, current.line, 'subject is empty');
    const next = headings[i + 1]?.index ?? lines.length;
    const body = lines.slice(current.index + 1, next).join('\n').trim();
    if (!body) fail(file, current.line, `entry "${subject}" has an empty body`);
    entries.push({ date, action, subject, line: current.line, blocks: blocksFromBody(body) });
  }
  return entries;
}

/** Newest date first. Within one date, earlier in the file stays first. */
export function newestFirst(entries: LogEntry[]): LogEntry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.date.localeCompare(a.entry.date) || a.index - b.index)
    .map(({ entry }) => entry);
}

const DAY_MS = 86_400_000;

function utcDay(isoDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return Number.NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function isoDateUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Whole days from `isoDate` to `now`, in UTC. Negative when the entry is in the future. */
export function ageInDays(isoDate: string, now: Date): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((today - utcDay(isoDate)) / DAY_MS);
}

export function formatAge(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function entryInLastDays(date: string, today: string, days: number): boolean {
  const age = Math.round((utcDay(today) - utcDay(date)) / DAY_MS);
  return age >= 0 && age < days;
}

export type ActivityDay = {
  date: string;
  count: number;
};

export function activityWindow(entries: LogEntry[], today: string, days = 30): ActivityDay[] {
  const end = utcDay(today);
  const window: ActivityDay[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(end - offset * DAY_MS).toISOString().slice(0, 10);
    window.push({ date, count: 0 });
  }
  const byDate = new Map(window.map((day) => [day.date, day]));
  for (const entry of entries) {
    const day = byDate.get(entry.date);
    if (day) day.count += 1;
  }
  return window;
}

/** One count per week, oldest first. `weeks` ending on `today`. */
export function weeklyCounts(entries: LogEntry[], today: string, weeks = 8): number[] {
  const end = utcDay(today);
  const counts = Array.from({ length: weeks }, () => 0);
  for (const entry of entries) {
    const age = Math.round((end - utcDay(entry.date)) / DAY_MS);
    if (age < 0 || age >= weeks * 7) continue;
    const index = weeks - 1 - Math.floor(age / 7);
    const current = counts[index];
    if (current !== undefined) counts[index] = current + 1;
  }
  return counts;
}

export function countActions(entries: LogEntry[]): Record<LogAction, number> {
  const counts = { ingest: 0, query: 0, lint: 0, update: 0 };
  for (const entry of entries) counts[entry.action] += 1;
  return counts;
}
