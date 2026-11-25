// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import LogBrowser from './LogBrowser';
import type { LogEntry } from '../lib/log';

afterEach(cleanup);

const entries: LogEntry[] = [
  {
    date: '2026-11-25',
    action: 'lint',
    subject: 'Sample pages pass',
    line: 3,
    blocks: [{ kind: 'note', text: 'The build accepts the sample set.' }],
  },
  {
    date: '2026-11-20',
    action: 'ingest',
    subject: 'Retrieval versus a compiled wiki',
    line: 12,
    blocks: [{ kind: 'add', text: 'retrieval-vs-compiled-wiki' }],
  },
  {
    date: '2026-10-02',
    action: 'update',
    subject: 'Obsidian',
    line: 20,
    blocks: [{ kind: 'change', text: 'obsidian' }],
  },
];

const raw = '## [2026-11-25] lint | Sample pages pass\n';

test('log filter hides entries of other actions and older than 30 days', () => {
  render(<LogBrowser entries={entries} today="2026-11-25" raw={raw} />);
  const timeline = () => screen.getByTestId('log.timeline').textContent ?? '';
  expect(timeline()).toContain('Sample pages pass');
  expect(timeline()).toContain('Retrieval versus a compiled wiki');
  expect(timeline()).toContain('Obsidian');
  expect(screen.getByTestId('log.raw').textContent).toContain('Sample pages pass');

  fireEvent.click(screen.getByTestId('log.filter.ingest'));
  expect(timeline()).not.toContain('Sample pages pass');
  expect(timeline()).toContain('Retrieval versus a compiled wiki');
  expect(timeline()).toContain('retrieval-vs-compiled-wiki');

  fireEvent.click(screen.getByTestId('log.filter.all'));
  fireEvent.click(screen.getByTestId('log.filter.window'));
  expect(timeline()).toContain('Sample pages pass');
  expect(timeline()).toContain('Retrieval versus a compiled wiki');
  expect(timeline()).not.toContain('Obsidian');
});
