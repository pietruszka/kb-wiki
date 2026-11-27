import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { backlinksBySlug, type WikiRecord } from './backlinks';
import { formatWikiDate } from './format';
import { loadWikiPages } from './wiki-catalog';
import { brokenWikilinkMessage } from './wikilinks';

// Frozen corpus. Live notes in src/content/wiki can grow without changing these assertions.
const fixtureDir = fileURLToPath(new URL('../fixtures/wiki', import.meta.url));

function page(partial: Partial<WikiRecord> & Pick<WikiRecord, 'slug' | 'body'>): WikiRecord {
  return {
    title: partial.slug,
    summary: 'Summary',
    type: 'concept',
    file: `src/content/wiki/${partial.slug}.md`,
    ...partial,
  };
}

test('backlinks come from resolved body links, once each, in title order', () => {
  const pages = [
    page({ slug: 'a', title: 'Alpha', body: 'See [[b]] and [[b]] again, and [[a]].' }),
    page({ slug: 'b', title: 'Beta', type: 'comparison', body: 'See [[c]].' }),
    page({ slug: 'c', title: 'Cipher', type: 'entity', body: 'No outgoing link.' }),
  ];
  const graph = backlinksBySlug(pages, '/kb-wiki');
  expect(graph.get('a')).toEqual([]);
  expect(graph.get('b')).toEqual([
    {
      slug: 'a',
      title: 'Alpha',
      summary: 'Summary',
      type: 'concept',
      href: '/kb-wiki/a/',
    },
  ]);
  expect(graph.get('c')?.map((link) => link.title)).toEqual(['Beta']);
});

test('a broken body link fails with the file and the target', () => {
  const pages = [page({ slug: 'a', body: 'See [[missing-page]].' })];
  expect(() => backlinksBySlug(pages, '/kb-wiki')).toThrow(
    brokenWikilinkMessage('src/content/wiki/a.md', 'missing-page'),
  );
});

test('fenced and inline code are not backlinks', () => {
  const pages = [
    page({
      slug: 'a',
      title: 'Alpha',
      body: 'Real [[b]].\n\n`[[missing-page]]`\n\n``[[missing-page]]``\n\n```\n[[missing-page]]\n```\n',
    }),
    page({ slug: 'b', title: 'Beta', body: '' }),
  ];
  expect(backlinksBySlug(pages, '/').get('b')?.map((link) => link.slug)).toEqual(['a']);
});

test('the fixture pages link each other and keep their dates', () => {
  const loaded = loadWikiPages(fixtureDir);
  const graph = backlinksBySlug(
    loaded.map((entry) => ({
      slug: entry.slug,
      title: entry.data.title,
      summary: entry.data.summary,
      type: entry.data.type,
      body: entry.body,
      file: entry.file,
    })),
    '/kb-wiki',
  );
  const titles = (slug: string) => graph.get(slug)?.map((link) => link.title);
  expect(titles('llm-wiki')).toEqual([
    'Backlink',
    'Obsidian',
    'Retrieval versus a compiled wiki',
    'Slip box',
  ]);
  expect(titles('backlink')).toEqual(['LLM wiki', 'Obsidian', 'Retrieval versus a compiled wiki', 'Slip box']);
  expect(titles('retrieval-vs-compiled-wiki')).toEqual(['LLM wiki']);
  expect(titles('obsidian')).toEqual(['Backlink', 'LLM wiki']);
  expect(titles('slip-box')).toEqual(['LLM wiki']);
  const obsidian = loaded.find((entry) => entry.slug === 'obsidian');
  const comparison = loaded.find((entry) => entry.slug === 'retrieval-vs-compiled-wiki');
  expect(obsidian?.data.status).toBe('stale');
  expect(comparison?.data.status).toBe('draft');
  expect(comparison?.data.type).toBe('comparison');
  expect(formatWikiDate(obsidian?.data.updated ?? new Date(0))).toBe('2026-10-02');
  expect(loaded.map((entry) => entry.slug).sort()).toEqual([
    'backlink',
    'llm-wiki',
    'obsidian',
    'retrieval-vs-compiled-wiki',
    'slip-box',
  ]);
});
