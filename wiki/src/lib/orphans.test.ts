import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { backlinksBySlug, type WikiRecord } from './backlinks';
import { assertNoOrphanPages, orphanPagesMessage, orphanRecords } from './orphans';
import { loadSiteFiles } from './repo';
import { loadWikiPages } from './wiki-catalog';
import { brokenWikilinkMessage } from './wikilinks';

const contentDir = fileURLToPath(new URL('../content/wiki', import.meta.url));

function page(partial: Partial<WikiRecord> & Pick<WikiRecord, 'slug' | 'body'>): WikiRecord {
  return {
    title: partial.slug,
    summary: 'Summary',
    type: 'concept',
    file: `src/content/wiki/${partial.slug}.md`,
    ...partial,
  };
}

test('an unlinked page fails and names the file and the slug', () => {
  const hub = page({ slug: 'hub', title: 'Hub', body: 'Starts here.' });
  const alone = page({ slug: 'alone', title: 'Alone', type: 'source', body: 'See [[hub]].' });
  expect(() => assertNoOrphanPages([hub, alone])).toThrow(orphanPagesMessage([alone]));
  expect(() => assertNoOrphanPages([hub, alone])).toThrow(/src\/content\/wiki\/alone\.md \(alone\)/);
});

test('every unlinked page is named, in slug order', () => {
  const later = page({ slug: 'later', body: '' });
  const earlier = page({ slug: 'earlier', body: '' });
  expect(() => assertNoOrphanPages([later, earlier])).toThrow(orphanPagesMessage([earlier, later]));
});

test('a link from another page satisfies the check', () => {
  const pages = [
    page({ slug: 'hub', body: 'See [[alone]].' }),
    page({ slug: 'alone', body: 'See [[hub]].' }),
  ];
  expect(() => assertNoOrphanPages(pages)).not.toThrow();
  expect(orphanRecords(pages, backlinksBySlug(pages, '/'))).toEqual([]);
});

test('a self-link, a code span, and a markdown link leave the page an orphan', () => {
  const pages = [
    page({ slug: 'hub', body: 'See [[note]].' }),
    page({
      slug: 'note',
      body: 'See [[note]].\n\n`[[hub]]`\n\n```\n[[hub]]\n```\n\n[hub](hub)\n',
    }),
  ];
  const orphans = orphanRecords(pages, backlinksBySlug(pages, '/'));
  expect(orphans.map((item) => item.slug)).toEqual(['hub']);
  expect(() => assertNoOrphanPages(pages)).toThrow(/hub\.md \(hub\)/);
});

test('the only page in the wiki passes, and a broken link still fails', () => {
  expect(() => assertNoOrphanPages([page({ slug: 'only', body: 'Nothing points here.' })])).not.toThrow();
  expect(() => assertNoOrphanPages([page({ slug: 'only', body: 'See [[missing-page]].' })])).toThrow(
    brokenWikilinkMessage('src/content/wiki/only.md', 'missing-page'),
  );
});

test('the sample pages and the repository catalogue pass', () => {
  const loaded = loadWikiPages(contentDir).map((entry) => ({
    slug: entry.slug,
    title: entry.data.title,
    summary: entry.data.summary,
    type: entry.data.type,
    body: entry.body,
    file: entry.file,
  }));
  expect(loaded.length).toBeGreaterThan(1);
  expect(() => assertNoOrphanPages(loaded)).not.toThrow();

  const site = loadSiteFiles();
  expect(site.pages.map((item) => item.slug).sort()).toEqual(loaded.map((item) => item.slug).sort());
});
