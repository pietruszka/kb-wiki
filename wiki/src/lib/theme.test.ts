import { runInNewContext } from 'node:vm';
import { expect, test } from 'vitest';
import { THEME_COLORS, THEME_STORAGE_KEY, resolveTheme, themeBootScript } from './theme';

interface BootResult {
  root: { dataset: Record<string, string> };
  color: string;
  listeners: Array<(event: { matches: boolean }) => void>;
}

function boot(options: { stored?: string | null; prefersDark: boolean; throwOnRead?: boolean }): BootResult {
  const store = new Map<string, string>();
  if (options.stored != null) store.set(THEME_STORAGE_KEY, options.stored);
  const listeners: Array<(event: { matches: boolean }) => void> = [];
  const root = { dataset: {} as Record<string, string>, style: { colorScheme: '' } };
  const meta = {
    content: '',
    setAttribute(_name: string, value: string) {
      meta.content = value;
    },
  };
  runInNewContext(themeBootScript(), {
    document: {
      documentElement: root,
      querySelector: (selector: string) => (selector === 'meta[name="theme-color"]' ? meta : null),
    },
    localStorage: {
      getItem: (key: string) => {
        if (options.throwOnRead) throw new Error('denied');
        return store.get(key) ?? null;
      },
    },
    window: {
      matchMedia: () => ({
        matches: options.prefersDark,
        addEventListener: (_type: string, fn: (event: { matches: boolean }) => void) => {
          listeners.push(fn);
        },
      }),
    },
  });
  return { root, color: meta.content, listeners };
}

test('resolveTheme lets a stored choice win over the system', () => {
  expect(resolveTheme('light', true)).toBe('light');
  expect(resolveTheme('dark', false)).toBe('dark');
});

test('resolveTheme follows the system when nothing valid is stored', () => {
  for (const stored of [null, '', 'system']) {
    expect(resolveTheme(stored, true)).toBe('dark');
    expect(resolveTheme(stored, false)).toBe('light');
  }
});

test('boot script matches resolveTheme and sets the theme color', () => {
  for (const stored of [null, '', 'light', 'dark', 'nope'] as const) {
    for (const prefersDark of [true, false]) {
      const started = boot({ stored, prefersDark });
      const theme = resolveTheme(stored, prefersDark);
      expect(started.root.dataset.theme).toBe(theme);
      expect(started.color).toBe(THEME_COLORS[theme]);
    }
  }
});

test('boot script follows a system change only when the visitor has not chosen', () => {
  const following = boot({ prefersDark: true });
  following.listeners[0]?.({ matches: false });
  expect(following.root.dataset.theme).toBe('light');

  const chosen = boot({ stored: 'dark', prefersDark: false });
  chosen.listeners[0]?.({ matches: true });
  expect(chosen.root.dataset.theme).toBe('dark');
});

test('boot script follows the system when storage throws', () => {
  expect(boot({ prefersDark: true, throwOnRead: true }).root.dataset.theme).toBe('dark');
  expect(boot({ prefersDark: false, throwOnRead: true }).root.dataset.theme).toBe('light');
});

test('boot script can be inlined without closing the script element', () => {
  expect(themeBootScript()).not.toContain('</');
  expect(themeBootScript()).toContain(THEME_STORAGE_KEY);
});
