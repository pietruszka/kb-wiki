export const THEME_STORAGE_KEY = 'kb-wiki-theme';

export type Theme = 'light' | 'dark';

export const THEME_COLORS: Record<Theme, string> = {
  light: '#F5F7FA',
  dark: '#07080B',
};

/** Stored choice wins. Anything else follows the system preference. */
export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const meta = root.ownerDocument.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[theme]);
}

/**
 * Blocking head script. It repeats `resolveTheme` because the bundle is deferred
 * and would paint the wrong theme first. Keep the two in agreement; the test does.
 */
export function themeBootScript(): string {
  return `(() => {
  const key = ${JSON.stringify(THEME_STORAGE_KEY)};
  const root = document.documentElement;
  const media = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : { matches: false, addEventListener() {} };
  const read = () => {
    try { return localStorage.getItem(key); }
    catch { return null; }
  };
  const resolve = (stored, prefersDark) =>
    stored === 'light' || stored === 'dark' ? stored : prefersDark ? 'dark' : 'light';
  const apply = (theme) => {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#F5F7FA' : '#07080B');
  };
  apply(resolve(read(), media.matches));
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', (event) => {
      const stored = read();
      if (stored === 'light' || stored === 'dark') return;
      apply(resolve(null, event.matches));
    });
  }
})();`;
}
