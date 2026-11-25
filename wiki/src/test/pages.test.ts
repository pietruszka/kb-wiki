import { expect, test } from 'vitest';
import config from '../../astro.config';
import Index from '../pages/index.astro';
import NotFound from '../pages/404.astro';
import { THEME_STORAGE_KEY } from '../lib/theme';
import { sitePath } from '../lib/paths';
import { renderPage } from './render';

test('home uses the shell, the headline, and every page type', async () => {
  const html = await renderPage(Index, '/kb-wiki/');
  expect(html).toContain('data-testid="home.page"');
  expect(html).toContain('data-testid="home.title"');
  expect(html).toContain('Notes compiled,');
  expect(html).toContain('not retrieved.');
  expect(html).toContain('data-testid="layout.topbar"');
  expect(html).toContain('data-testid="layout.backdrop"');
  expect(html).toContain('aria-current="page"');
  expect(config.site).toBe('https://pietruszka.github.io');
  expect(config.base).toBe('/kb-wiki');
  expect(html).toContain(`href="${sitePath('/')}"`);
  expect(html).toContain(`href="${sitePath('/graph')}"`);
  expect(html).toContain(`href="${sitePath('favicon.svg')}"`);
  expect(html).toContain('data-testid="theme.toggle"');
  for (const label of ['Concept', 'Comparison', 'Entity', 'Source']) {
    expect(html).toContain(label);
  }
  expect(html).toContain('https://pietruszka.github.io/kb-wiki/');
  expect(html).toContain('data-testid="home.pages"');
  expect(html).toContain(`href="${sitePath('llm-wiki/')}"`);
  expect(html).toContain('LLM wiki');
  const boot = html.match(/<script(?![^>]*type=)[^>]*>[\s\S]*?kb-wiki-theme[\s\S]*?<\/script>/);
  expect(boot?.[0]).toContain(THEME_STORAGE_KEY);
});

test('missing pages name the problem and link back to the index', async () => {
  const html = await renderPage(NotFound, '/kb-wiki/missing');
  expect(html).toContain('data-testid="not-found.page"');
  expect(html).toContain('This page is not in the wiki.');
  expect(html).toContain(`href="${sitePath('/')}"`);
  expect(html).toContain('Back to the index');
  expect(html).toContain('name="robots" content="noindex"');
  expect(html).not.toContain('rel="canonical"');
});
