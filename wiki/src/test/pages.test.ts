import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import config from '../../astro.config';
import Graph from '../pages/graph.astro';
import Index from '../pages/index.astro';
import Log from '../pages/log.astro';
import NotFound from '../pages/404.astro';
import Sources from '../pages/sources.astro';
import Tags from '../pages/tags.astro';
import { catalogCards, catalogStats, recentCards } from '../lib/catalog';
import { toCatalogInput } from '../lib/repo';
import { THEME_STORAGE_KEY } from '../lib/theme';
import { sitePath } from '../lib/paths';
import { loadWikiPages } from '../lib/wiki-catalog';
import { renderPage } from './render';

test('home uses the shell, the headline, and every page type', async () => {
  const html = await renderPage(Index, '/kb-wiki/');
  expect(html).toContain('data-testid="home.page"');
  expect(html).toContain('data-testid="home.title"');
  expect(html).toContain('Notes compiled,');
  expect(html).toContain('not retrieved.');
  expect(html).toContain('data-testid="layout.topbar"');
  expect(html).toContain('data-pagefind-ignore="all"');
  expect(html).toContain('data-testid="search.trigger"');
  expect(html).toContain('Search pages, sources...');
  expect(html).not.toContain('data-pagefind-body');
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
  expect(html).toContain('data-testid="home.catalog"');
  expect(html).toContain('data-testid="home.status"');
  expect(html).toContain('data-testid="home.recent"');
  expect(html).toContain('data-testid="home.ticker"');
  expect(html).toContain(`href="${sitePath('/log')}"`);
  expect(html).toContain(`href="${sitePath('/tags')}"`);
  expect(html).toContain(`href="${sitePath('/sources')}"`);
  expect(html).toContain(`href="${sitePath('llm-wiki/')}"`);
  expect(html).toContain('LLM wiki');
  const pages = loadWikiPages(fileURLToPath(new URL('../content/wiki', import.meta.url))).map(toCatalogInput);
  const stats = catalogStats(pages);
  const cards = catalogCards(pages, new Date('2026-11-25T00:00:00.000Z'));
  expect(html).toContain(`data-testid="home.status.pages" data-count="${stats.pages}"`);
  expect(html).toContain(`data-testid="home.status.sources" data-count="${stats.sources}"`);
  expect(html).toContain(`data-testid="home.status.backlinks" data-count="${stats.backlinks}"`);
  expect(html).toContain(`data-testid="home.status.tags" data-count="${stats.tags.length}"`);
  expect(html).toContain(`data-testid="home.status.orphans" data-count="${stats.orphans}"`);
  expect(html).toContain(`data-testid="home.status.drafts" data-count="${stats.drafts}"`);
  const recentStart = html.indexOf('data-testid="home.recent"');
  const catalogStart = html.indexOf('data-testid="home.catalog"');
  const recentHtml = html.slice(recentStart, catalogStart);
  for (const card of recentCards(cards)) {
    expect(recentHtml).toContain(card.title);
  }
  for (const card of cards) {
    expect(html).toContain(card.title);
    expect(html).toContain(card.summary);
  }
  const boot = html.match(/<script(?![^>]*type=)[^>]*>[\s\S]*?kb-wiki-theme[\s\S]*?<\/script>/);
  expect(boot?.[0]).toContain(THEME_STORAGE_KEY);
});

test('log page renders the timeline and the raw log', async () => {
  const html = await renderPage(Log, '/kb-wiki/log');
  expect(html).toContain('data-testid="log.page"');
  expect(html).toContain('data-testid="log.entry"');
  expect(html).toContain('data-testid="log.raw"');
  expect(html).toContain('Every ingest, query');
  expect(html).toContain('in order.');
  expect(html).toContain('## [2026-11-25] lint | Sample pages pass');
  expect(html).toContain('Sample pages pass');
  expect(html).toContain('aria-current="page"');
  expect(html).toContain(`href="${sitePath('/log')}"`);
});

test('tags and sources list the pages that use them', async () => {
  const tags = await renderPage(Tags, '/kb-wiki/tags');
  expect(tags).toContain('data-testid="tags.page"');
  expect(tags).toContain('data-testid="tags.link"');
  expect(tags).toContain('#knowledge-base');
  expect(tags).toContain(sitePath('/?tag=knowledge-base'));
  expect(tags).toContain('LLM wiki');

  const sources = await renderPage(Sources, '/kb-wiki/sources');
  expect(sources).toContain('data-testid="sources.page"');
  expect(sources).toContain('data-testid="sources.item"');
  expect(sources).toContain('Zettelkasten (Wikipedia)');
  expect(sources).toContain('https://en.wikipedia.org/wiki/Zettelkasten');
  expect(sources).toContain('Backlink');
  expect(sources).toContain('Slip box');
});

test('the graph page lists every page and links each node to its page', async () => {
  const html = await renderPage(Graph, '/kb-wiki/graph');
  expect(html).toContain('data-testid="graph.page"');
  expect(html).toContain('data-testid="graph.map"');
  expect(html).toContain('data-testid="graph.list"');
  expect(html).toContain('aria-current="page"');
  const list = html.slice(html.indexOf('data-testid="graph.list"'));
  const pages = loadWikiPages(fileURLToPath(new URL('../content/wiki', import.meta.url)));
  expect(pages.length).toBeGreaterThan(0);
  for (const page of pages) {
    expect(list).toContain(`data-slug="${page.slug}"`);
    expect(list).toContain(page.data.title);
    expect(html).toContain(`href="${sitePath(`${page.slug}/`)}"`);
  }
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
