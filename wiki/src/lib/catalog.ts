import { backlinksBySlug, type WikiRecord } from './backlinks';
import type { CatalogCard } from './catalog-view';
import { ageInDays, formatAge, type LogEntry } from './log';
import type { PageType } from './page-types';
import type { PageStatus } from './wiki-schema';
import { sitePath } from './paths';

export type CatalogSource = {
  title: string;
  url?: string;
};

export type CatalogInput = {
  slug: string;
  title: string;
  summary: string;
  type: PageType;
  status: PageStatus;
  tags: string[];
  sources: CatalogSource[];
  updated: Date;
  body: string;
  file: string;
};

export type { CatalogCard } from './catalog-view';

export type CatalogStats = {
  pages: number;
  byType: Record<PageType, number>;
  sources: number;
  backlinks: number;
  tags: string[];
  orphans: number;
  drafts: number;
  stable: number;
  stale: number;
};

function updatedIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function sourceKey(source: CatalogSource): string {
  return source.url ?? source.title;
}

export function catalogStats(pages: CatalogInput[]): CatalogStats {
  const records: WikiRecord[] = pages.map((page) => ({
    slug: page.slug,
    title: page.title,
    summary: page.summary,
    type: page.type,
    body: page.body,
    file: page.file,
  }));
  const incoming = backlinksBySlug(records, '/');
  const byType = { concept: 0, comparison: 0, entity: 0, source: 0 };
  const tags = new Set<string>();
  const sources = new Set<string>();
  let backlinks = 0;
  let orphans = 0;
  let drafts = 0;
  let stable = 0;
  let stale = 0;

  for (const page of pages) {
    byType[page.type] += 1;
    for (const tag of page.tags) tags.add(tag);
    for (const source of page.sources) sources.add(sourceKey(source));
    const links = incoming.get(page.slug)?.length ?? 0;
    backlinks += links;
    if (links === 0) orphans += 1;
    if (page.status === 'draft') drafts += 1;
    if (page.status === 'stable') stable += 1;
    if (page.status === 'stale') stale += 1;
  }

  return {
    pages: pages.length,
    byType,
    sources: sources.size,
    backlinks,
    tags: [...tags].sort((a, b) => a.localeCompare(b, 'en')),
    orphans,
    drafts,
    stable,
    stale,
  };
}

export function catalogCards(pages: CatalogInput[], now: Date, base = '/kb-wiki'): CatalogCard[] {
  const records: WikiRecord[] = pages.map((page) => ({
    slug: page.slug,
    title: page.title,
    summary: page.summary,
    type: page.type,
    body: page.body,
    file: page.file,
  }));
  const incoming = backlinksBySlug(records, base);
  return pages
    .map((page) => {
      const updated = updatedIso(page.updated);
      return {
        slug: page.slug,
        href: sitePath(`${page.slug}/`, base),
        title: page.title,
        summary: page.summary,
        type: page.type,
        status: page.status,
        tags: page.tags,
        updated,
        age: formatAge(ageInDays(updated, now)),
        sourceCount: page.sources.length,
        backlinks: incoming.get(page.slug)?.length ?? 0,
      };
    })
    .sort((a, b) => b.updated.localeCompare(a.updated) || a.title.localeCompare(b.title, 'en'));
}

export function recentCards(cards: CatalogCard[], limit = 4): CatalogCard[] {
  return cards.slice(0, limit);
}

export type TagGroup = {
  tag: string;
  pages: CatalogCard[];
};

export function tagGroups(cards: CatalogCard[]): TagGroup[] {
  const groups = new Map<string, CatalogCard[]>();
  for (const card of cards) {
    for (const tag of new Set(card.tags)) {
      const list = groups.get(tag) ?? [];
      list.push(card);
      groups.set(tag, list);
    }
  }
  return [...groups.entries()]
    .map(([tag, pages]) => ({
      tag,
      pages: pages.sort((a, b) => a.title.localeCompare(b.title, 'en')),
    }))
    .sort((a, b) => b.pages.length - a.pages.length || a.tag.localeCompare(b.tag, 'en'));
}

export type CitedSource = {
  key: string;
  title: string;
  url?: string;
  pages: { slug: string; title: string; href: string }[];
};

export function citedSources(pages: CatalogInput[], cards: CatalogCard[]): CitedSource[] {
  const hrefs = new Map(cards.map((card) => [card.slug, card]));
  const groups = new Map<string, CitedSource>();
  for (const page of pages) {
    const card = hrefs.get(page.slug);
    for (const source of page.sources) {
      const key = sourceKey(source);
      const current = groups.get(key) ?? {
        key,
        title: source.title,
        url: source.url,
        pages: [],
      };
      if (card && !current.pages.some((item) => item.slug === page.slug)) {
        current.pages.push({ slug: page.slug, title: page.title, href: card.href });
      }
      groups.set(key, current);
    }
  }
  return [...groups.values()]
    .map((source) => ({
      ...source,
      pages: source.pages.sort((a, b) => a.title.localeCompare(b.title, 'en')),
    }))
    .sort((a, b) => a.title.localeCompare(b.title, 'en'));
}

export function tickerEntries(entries: LogEntry[], limit = 4): LogEntry[] {
  return entries.slice(0, limit);
}
