// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import HomeSearch from './HomeSearch';
import { SEARCH_OPEN_EVENT } from '../lib/search';

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

test('search text is kept in the page address', () => {
  window.history.replaceState(null, '', '/kb-wiki/?type=concept');
  render(<HomeSearch placeholder="Filter" />);
  fireEvent.change(screen.getByTestId('home.filter.query'), { target: { value: 'slip' } });
  const params = new URLSearchParams(window.location.search);
  expect(params.get('q')).toBe('slip');
  expect(params.get('type')).toBe('concept');

  fireEvent.change(screen.getByTestId('home.filter.query'), { target: { value: ' ' } });
  const cleared = new URLSearchParams(window.location.search);
  expect(cleared.get('q')).toBeNull();
  expect(cleared.get('type')).toBe('concept');
});

test('the shortcut chip asks the palette to open', () => {
  let opened = 0;
  const onOpen = () => {
    opened += 1;
  };
  document.addEventListener(SEARCH_OPEN_EVENT, onOpen);
  render(<HomeSearch placeholder="Filter" />);
  fireEvent.click(screen.getByTestId('home.filter.search'));
  expect(opened).toBe(1);
  document.removeEventListener(SEARCH_OPEN_EVENT, onOpen);
});
