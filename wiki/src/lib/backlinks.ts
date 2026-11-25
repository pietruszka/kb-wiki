import type { PageType } from './page-types';
import { assertKnownWikilinks, extractWikilinks, wikiPageHref } from './wikilinks';

export type WikiRecord = {
  slug: string;
  title: string;
  summary: string;
  type: PageType;
  body: string;
  file: string;
};

export type Backlink = {
  slug: string;
  title: string;
  summary: string;
  type: PageType;
  href: string;
};

/** Pages whose bodies link to each slug. A missing target fails. Self-links are not backlinks. */
export function backlinksBySlug(pages: WikiRecord[], base: string): Map<string, Backlink[]> {
  const known = new Set(pages.map((page) => page.slug));
  const incoming = new Map<string, Backlink[]>(pages.map((page) => [page.slug, []]));
  for (const page of pages) {
    for (const target of assertKnownWikilinks(extractWikilinks(page.body), known, page.file)) {
      if (target === page.slug) continue;
      incoming.get(target)?.push({
        slug: page.slug,
        title: page.title,
        summary: page.summary,
        type: page.type,
        href: wikiPageHref(page.slug, base),
      });
    }
  }
  for (const list of incoming.values()) {
    list.sort((a, b) => a.title.localeCompare(b.title, 'en'));
  }
  return incoming;
}
