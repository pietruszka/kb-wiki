import { backlinksBySlug, type Backlink, type WikiRecord } from './backlinks';

/** Pages whose bodies are not linked from any other page. */
export function orphanRecords(
  pages: readonly WikiRecord[],
  incoming: ReadonlyMap<string, Backlink[]>,
): WikiRecord[] {
  return pages
    .filter((page) => (incoming.get(page.slug)?.length ?? 0) === 0)
    .sort((a, b) => a.slug.localeCompare(b.slug, 'en') || a.file.localeCompare(b.file, 'en'));
}

export function orphanPagesMessage(pages: readonly Pick<WikiRecord, 'file' | 'slug'>[]): string {
  const lines = pages.map((page) => `${page.file} (${page.slug})`);
  return ['Orphan pages have no inbound wikilink. Link each one from another page:', ...lines].join('\n');
}

/**
 * Fail the build when a page has no inbound wikilink.
 * A wiki with fewer than two pages passes, because nothing else can link here.
 * A self-link, a link in code, a line in index.md, and a frontmatter source are not inbound links.
 * A broken wikilink still fails, including in a one-page wiki.
 */
export function assertNoOrphanPages(pages: readonly WikiRecord[]): void {
  const incoming = backlinksBySlug(pages, '/');
  if (pages.length < 2) return;
  const orphans = orphanRecords(pages, incoming);
  if (orphans.length === 0) return;
  throw new Error(orphanPagesMessage(orphans));
}
