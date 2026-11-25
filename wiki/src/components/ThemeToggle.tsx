import { THEME_STORAGE_KEY, applyTheme, type Theme } from '../lib/theme';

function opposite(theme: Theme): Theme {
  return theme === 'light' ? 'dark' : 'light';
}

export default function ThemeToggle() {
  function onClick() {
    const current: Theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    const next = opposite(current);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode can reject the write. The choice still applies for this view.
    }
  }

  return (
    <button type="button" className="theme-toggle" data-testid="theme.toggle" onClick={onClick}>
      <span className="when-dark">
        <span aria-hidden="true">Light</span>
        <span className="visually-hidden">Switch to light theme</span>
      </span>
      <span className="when-light">
        <span aria-hidden="true">Dark</span>
        <span className="visually-hidden">Switch to dark theme</span>
      </span>
    </button>
  );
}
