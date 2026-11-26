// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import SearchPalette from './SearchPalette';
import { SEARCH_OPEN_EVENT, type SearchOutcome, type SearchRow } from '../lib/search';
import { sitePath } from '../lib/paths';

const rows: SearchRow[] = [
  {
    key: 'page',
    kind: 'page',
    type: 'concept',
    titleHtml: 'LLM <mark>wiki</mark>',
    excerptHtml: 'A compiled <mark>wiki</mark>.',
    href: '/kb-wiki/llm-wiki/',
    locator: 'llm-wiki/',
    slug: 'llm-wiki',
  },
  {
    key: 'section',
    kind: 'section',
    type: 'concept',
    titleHtml: 'LLM wiki <span class="search-sep">›</span> Build',
    excerptHtml: 'The build checks the <mark>wiki</mark>.',
    href: '/kb-wiki/llm-wiki/#what-the-build-checks',
    locator: '#what-the-build-checks',
    slug: 'llm-wiki',
  },
  {
    key: 'source',
    kind: 'source',
    type: 'source',
    titleHtml: 'Slip box',
    excerptHtml: 'One idea to a note.',
    href: '/kb-wiki/slip-box/',
    locator: 'slip-box/',
    slug: 'slip-box',
  },
];

afterEach(cleanup);

function renderPalette(outcome: SearchOutcome = { status: 'ready', rows, ms: 18 }) {
  const navigated: string[] = [];
  render(
    <SearchPalette
      search={async () => outcome}
      onNavigate={(href) => {
        navigated.push(href);
      }}
    />,
  );
  return navigated;
}

async function typeQuery(value: string) {
  fireEvent.change(screen.getByTestId('search.input'), { target: { value } });
  expect(await screen.findAllByTestId('search.result')).not.toHaveLength(0);
}

test('the shortcut opens the palette and keys move, open, and close it', async () => {
  const navigated = renderPalette();

  fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
  expect(screen.getByTestId('search.dialog')).toBeTruthy();
  expect(screen.getByTestId('search.input')).toBe(document.activeElement);

  await typeQuery('wiki');
  const results = screen.getAllByTestId('search.result');
  expect(results).toHaveLength(3);
  expect(results[0]?.getAttribute('aria-selected')).toBe('true');
  expect(results[0]?.textContent).toContain('LLM');
  expect(results[0]?.querySelector('mark')?.textContent).toBe('wiki');
  expect(screen.getByTestId('search.meta').textContent).toContain('3 results');

  fireEvent.keyDown(screen.getByTestId('search.input'), { key: 'ArrowDown' });
  expect(screen.getAllByTestId('search.result')[1]?.getAttribute('aria-selected')).toBe('true');
  fireEvent.keyDown(screen.getByTestId('search.input'), { key: 'Enter' });
  expect(navigated).toEqual(['/kb-wiki/llm-wiki/#what-the-build-checks']);

  fireEvent.keyDown(screen.getByTestId('search.input'), { key: 'Escape' });
  expect(screen.queryByTestId('search.dialog')).toBeNull();

  fireEvent.keyDown(document, { key: 'k', metaKey: true });
  expect(screen.getByTestId('search.dialog')).toBeTruthy();
  fireEvent.keyDown(document, { key: 'k', metaKey: true });
  expect(screen.queryByTestId('search.dialog')).toBeNull();
});

test('tab changes scope and command enter opens the graph', async () => {
  const navigated = renderPalette();
  fireEvent.click(screen.getByTestId('search.trigger'));
  await typeQuery('wiki');

  fireEvent.keyDown(screen.getByTestId('search.input'), { key: 'Tab' });
  expect(screen.getByTestId('search.scope.pages').getAttribute('aria-selected')).toBe('true');
  expect(screen.getAllByTestId('search.result')).toHaveLength(1);
  expect(screen.getByTestId('search.result').getAttribute('data-kind')).toBe('page');

  fireEvent.keyDown(screen.getByTestId('search.input'), { key: 'Enter', ctrlKey: true });
  expect(navigated).toEqual([`${sitePath('/graph')}?focus=llm-wiki`]);
});

test('opening search without a built index explains how to get one', async () => {
  render(<SearchPalette onNavigate={() => {}} />);
  fireEvent.click(screen.getByTestId('search.trigger'));
  expect((await screen.findByTestId('search.unavailable')).textContent).toContain('not available from the dev server');
  expect(screen.queryByTestId('search.result')).toBeNull();
});

test('the catalog shortcut and a missing index stay quiet', async () => {
  const navigated = renderPalette({ status: 'unavailable' });
  await act(async () => {
    document.dispatchEvent(new Event(SEARCH_OPEN_EVENT));
  });
  expect(screen.getByTestId('search.dialog')).toBeTruthy();
  fireEvent.change(screen.getByTestId('search.input'), { target: { value: 'wiki' } });
  expect((await screen.findByTestId('search.unavailable')).textContent).toContain('not available from the dev server');
  expect(navigated).toEqual([]);
  expect(screen.queryByTestId('search.result')).toBeNull();
});
