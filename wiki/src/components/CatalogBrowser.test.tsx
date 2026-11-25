// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import CatalogBrowser from './CatalogBrowser';
import { FILTER_EVENT } from '../lib/filter-events';
import type { CatalogCard } from '../lib/catalog-view';

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

function card(partial: Partial<CatalogCard> & Pick<CatalogCard, 'slug' | 'type'>): CatalogCard {
  return {
    href: `/kb-wiki/${partial.slug}/`,
    title: partial.slug,
    summary: `${partial.slug} summary`,
    status: 'stable',
    tags: [],
    updated: '2026-11-25',
    age: 'today',
    sourceCount: 1,
    backlinks: 0,
    ...partial,
  };
}

const pages = [
  card({ slug: 'llm-wiki', title: 'LLM wiki', type: 'concept', tags: ['llm'], status: 'stable' }),
  card({ slug: 'obsidian', title: 'Obsidian', type: 'entity', tags: ['tools'], status: 'stale' }),
];

function renderCatalog() {
  render(
    <CatalogBrowser
      pages={pages}
      tags={['llm', 'tools']}
      counts={{ concept: 1, comparison: 0, entity: 1, source: 0 }}
    />,
  );
}

test('catalog filter keeps pages of the chosen type, status, and tag', () => {
  renderCatalog();
  expect(screen.getByText('LLM wiki')).toBeTruthy();
  expect(screen.getByText('Obsidian')).toBeTruthy();

  fireEvent.click(screen.getByTestId('home.catalog.filter.type.concept'));
  expect(screen.getByText('LLM wiki')).toBeTruthy();
  expect(screen.queryByText('Obsidian')).toBeNull();

  fireEvent.click(screen.getByTestId('home.catalog.filter.type'));
  fireEvent.click(screen.getByTestId('home.catalog.filter.status.stale'));
  expect(screen.queryByText('LLM wiki')).toBeNull();
  expect(screen.getByText('Obsidian')).toBeTruthy();

  fireEvent.click(screen.getByTestId('home.catalog.filter.status'));
  fireEvent.change(screen.getByTestId('home.catalog.filter.tag'), { target: { value: 'llm' } });
  expect(screen.getByText('LLM wiki')).toBeTruthy();
  expect(screen.queryByText('Obsidian')).toBeNull();
});

test('catalog filter matches the search text', () => {
  renderCatalog();
  fireEvent(document, new CustomEvent(FILTER_EVENT, { detail: { text: 'obsidian' } }));
  expect(screen.queryByText('LLM wiki')).toBeNull();
  expect(screen.getByText('Obsidian')).toBeTruthy();

  fireEvent.click(screen.getByTestId('home.catalog.filter.clear'));
  expect(screen.getByText('LLM wiki')).toBeTruthy();
  expect(screen.getByText('Obsidian')).toBeTruthy();
});
