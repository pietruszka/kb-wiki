// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import ThemeToggle from './ThemeToggle';
import { THEME_COLORS, THEME_STORAGE_KEY } from '../lib/theme';

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.colorScheme = '';
  document.head.querySelector('meta[name="theme-color"]')?.remove();
});

function renderToggle(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme;
  document.head.insertAdjacentHTML('beforeend', '<meta name="theme-color" content="">');
  render(<ThemeToggle />);
}

test('switch stores the opposite theme and updates the document', () => {
  renderToggle('dark');
  fireEvent.click(screen.getByTestId('theme.toggle'));
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(document.documentElement.style.colorScheme).toBe('light');
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
    THEME_COLORS.light,
  );

  fireEvent.click(screen.getByTestId('theme.toggle'));
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
});

test('switch still applies when storage rejects the write', () => {
  const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('denied');
  });
  renderToggle('light');
  fireEvent.click(screen.getByTestId('theme.toggle'));
  expect(document.documentElement.dataset.theme).toBe('dark');
  setItem.mockRestore();
});

test('names the theme it will switch to', () => {
  renderToggle('dark');
  expect(screen.getByTestId('theme.toggle').textContent).toContain('Switch to light theme');
  expect(screen.getByTestId('theme.toggle').textContent).toContain('Switch to dark theme');
});
