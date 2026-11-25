import { useMemo, useState } from 'react';
import {
  countActions,
  entryInLastDays,
  logEntryId,
  weekdayUtc,
  LOG_ACTIONS,
  type LogAction,
  type LogEntry,
} from '../lib/log';

type Props = {
  entries: LogEntry[];
  today: string;
  raw: string;
};

const DETAIL_MARK = { add: '+', change: '~', warn: '!', filed: '>' } as const;

function grouped(entries: LogEntry[]): { date: string; entries: LogEntry[] }[] {
  const groups: { date: string; entries: LogEntry[] }[] = [];
  for (const entry of entries) {
    const last = groups.at(-1);
    if (last && last.date === entry.date) last.entries.push(entry);
    else groups.push({ date: entry.date, entries: [entry] });
  }
  return groups;
}

export default function LogBrowser({ entries, today, raw }: Props) {
  const [action, setAction] = useState<LogAction | 'all'>('all');
  const [recentOnly, setRecentOnly] = useState(false);
  const lineCount = raw.split(/\r?\n/).length;

  const windowed = useMemo(
    () => (recentOnly ? entries.filter((entry) => entryInLastDays(entry.date, today, 30)) : entries),
    [entries, recentOnly, today],
  );
  const counts = countActions(windowed);
  const visible = action === 'all' ? windowed : windowed.filter((entry) => entry.action === action);
  const days = grouped(visible);

  return (
    <div className="log-board">
      <div className="log-filters" data-testid="log.filter">
        <div className="filter-row" role="group" aria-label="Filter log by action">
          <button
            type="button"
            className="chip"
            aria-pressed={action === 'all'}
            data-testid="log.filter.all"
            onClick={() => setAction('all')}
          >
            All <span className="chip-count">{windowed.length}</span>
          </button>
          {LOG_ACTIONS.map((name) => (
            <button
              key={name}
              type="button"
              className="chip"
              data-action={name}
              aria-pressed={action === name}
              data-testid={`log.filter.${name}`}
              onClick={() => setAction(name)}
            >
              {name} <span className="chip-count">{counts[name]}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="chip"
          aria-pressed={recentOnly}
          data-testid="log.filter.window"
          onClick={() => setRecentOnly((current) => !current)}
        >
          Last 30 days
        </button>
      </div>
      <div className="log-stream" data-testid="log.timeline">
        {days.length === 0 ? (
          <p className="catalog-empty" data-testid="log.empty">
            No entries in this view.
          </p>
        ) : (
          days.map((day) => (
            <section key={day.date} className="log-day" aria-labelledby={`day-${day.date}`}>
              <h2 id={`day-${day.date}`} className="log-day-title">
                <time dateTime={day.date}>{day.date}</time>
                <span className="log-weekday">{weekdayUtc(day.date)}</span>
                <span className="log-day-count">
                  {day.entries.length === 1 ? '1 entry' : `${day.entries.length} entries`}
                </span>
              </h2>
              <ol className="log-entries">
                {day.entries.map((entry) => (
                  <li key={logEntryId(entry)}>
                    <article
                      id={logEntryId(entry)}
                      className="log-entry"
                      data-action={entry.action}
                      data-testid="log.entry"
                    >
                      <p className="action-pill" data-action={entry.action}>
                        {entry.action}
                      </p>
                      <h3 className="log-subject">{entry.subject}</h3>
                      <div className="log-body">
                        {entry.blocks.map((block, index) =>
                          block.kind === 'note' ? (
                            <p key={index}>{block.text}</p>
                          ) : (
                            <p key={index} className="log-detail" data-kind={block.kind}>
                              <span aria-hidden="true">{DETAIL_MARK[block.kind]}</span>
                              {block.text}
                            </p>
                          ),
                        )}
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            </section>
          ))
        )}
      </div>
      <aside className="log-raw" data-testid="log.raw" aria-label="log.md, read only">
        <header className="log-raw-bar">
          <span className="log-raw-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>log.md</span>
          <span className="log-raw-mode">Read only</span>
        </header>
        <pre>
          <code>{raw}</code>
        </pre>
        <p className="log-raw-count" data-testid="log.raw.count">
          {lineCount} {lineCount === 1 ? 'line' : 'lines'}
        </p>
      </aside>
    </div>
  );
}
