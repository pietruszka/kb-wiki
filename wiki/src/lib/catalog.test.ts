import { expect, test } from 'vitest';
import { catalogCards, catalogStats, citedSources, recentCards, tagGroups, type CatalogInput } from './catalog';
import { groupCatalog, matchesCatalog } from './catalog-view';

function page(partial: Partial<CatalogInput> & Pick<CatalogInput, 'slug' | 'type'>): CatalogInput {
  return {
    title: partial.slug,
    summary: `${partial.slug} summary`,
    status: 'stable',
    tags: [],
    sources: [],
    updated: new Date('2026-11-01T00:00:00.000Z'),
    body: '',
    file: `src/content/wiki/${partial.slug}.md`,
    ...partial,
  };
}

const now = new Date('2026-11-25T12:00:00.000Z');

test('home stats come from frontmatter', () => {
  const pages = [
    page({
      slug: 'idea',
      type: 'concept',
      title: 'Idea',
      tags: ['llm', 'notes'],
      sources: [{ title: 'Overview', url: 'https://example.com/a' }],
      updated: new Date('2026-11-25T00:00:00.000Z'),
      status: 'stable',
      body: 'See [[tool]].',
    }),
    page({
      slug: 'tool',
      type: 'entity',
      title: 'Tool',
      tags: ['notes'],
      sources: [
        { title: 'Overview', url: 'https://example.com/a' },
        { title: 'Manual', url: 'https://example.com/b' },
      ],
      updated: new Date('2026-11-20T00:00:00.000Z'),
      status: 'draft',
      body: 'No outgoing link.',
    }),
    page({
      slug: 'alone',
      type: 'source',
      title: 'Alone',
      tags: [],
      sources: [{ title: 'Overview', url: 'https://example.com/a' }],
      updated: new Date('2026-10-02T00:00:00.000Z'),
      status: 'stale',
      body: 'See [[idea]].',
    }),
  ];

  const stats = catalogStats(pages);
  expect(stats.pages).toBe(3);
  expect(stats.byType).toEqual({ concept: 1, comparison: 0, entity: 1, source: 1 });
  expect(stats.sources).toBe(2);
  expect(stats.tags).toEqual(['llm', 'notes']);
  expect(stats.backlinks).toBe(2);
  expect(stats.orphans).toBe(1);
  expect(stats.drafts).toBe(1);
  expect(stats.stable).toBe(1);
  expect(stats.stale).toBe(1);

  const cards = catalogCards(pages, now, '/kb-wiki');
  expect(recentCards(cards, 2).map((card) => card.slug)).toEqual(['idea', 'tool']);
  expect(cards.find((card) => card.slug === 'idea')).toMatchObject({
    age: 'today',
    sourceCount: 1,
    backlinks: 1,
    href: '/kb-wiki/idea/',
  });
  expect(cards.find((card) => card.slug === 'tool')?.age).toBe('5 days ago');
  expect(cards.find((card) => card.slug === 'alone')?.backlinks).toBe(0);

  const idea = cards[0];
  if (!idea) throw new Error('missing card');
  expect(matchesCatalog(idea, { type: 'concept', status: 'all', tag: '', text: '' })).toBe(true);
  expect(matchesCatalog(idea, { type: 'entity', status: 'all', tag: '', text: '' })).toBe(false);
  expect(matchesCatalog(idea, { type: 'all', status: 'draft', tag: '', text: '' })).toBe(false);
  expect(matchesCatalog(idea, { type: 'all', status: 'all', tag: 'llm', text: '' })).toBe(true);
  expect(matchesCatalog(idea, { type: 'all', status: 'all', tag: 'missing', text: '' })).toBe(false);
  expect(matchesCatalog(idea, { type: 'all', status: 'all', tag: '', text: 'IDEA' })).toBe(true);
  expect(groupCatalog(cards).map((group) => group.type)).toEqual(['concept', 'entity', 'source']);

  expect(tagGroups(cards).map((group) => [group.tag, group.pages.length])).toEqual([
    ['notes', 2],
    ['llm', 1],
  ]);
  expect(citedSources(pages, cards).map((source) => [source.title, source.pages.length])).toEqual([
    ['Manual', 1],
    ['Overview', 3],
  ]);
});

test('a repeated tag on one page counts that page once', () => {
  const cards = catalogCards(
    [
      page({ slug: 'idea', type: 'concept', title: 'Idea', tags: ['notes', 'notes'] }),
      page({ slug: 'tool', type: 'entity', title: 'Tool', tags: ['notes'] }),
    ],
    now,
  );
  const notes = tagGroups(cards).find((group) => group.tag === 'notes');
  expect(notes?.pages.map((item) => item.slug)).toEqual(['idea', 'tool']);
});
