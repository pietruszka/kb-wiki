import { PAGE_TYPES, type PageType } from './page-types';
import type { PageStatus } from './wiki-schema';

export type CatalogCard = {
  slug: string;
  href: string;
  title: string;
  summary: string;
  type: PageType;
  status: PageStatus;
  tags: string[];
  updated: string;
  age: string;
  sourceCount: number;
  backlinks: number;
};

export type CatalogFilter = {
  type: PageType | 'all';
  status: PageStatus | 'all';
  tag: string;
  text: string;
};

const TYPE_ORDER = Object.keys(PAGE_TYPES) as PageType[];

export function matchesCatalog(page: CatalogCard, filter: CatalogFilter): boolean {
  if (filter.type !== 'all' && page.type !== filter.type) return false;
  if (filter.status !== 'all' && page.status !== filter.status) return false;
  if (filter.tag && !page.tags.includes(filter.tag)) return false;
  const text = filter.text.trim().toLowerCase();
  if (!text) return true;
  const haystack = [page.title, page.summary, page.slug, page.tags.join(' ')].join(' ').toLowerCase();
  return haystack.includes(text);
}

export function groupCatalog(pages: CatalogCard[]): { type: PageType; pages: CatalogCard[] }[] {
  return TYPE_ORDER.map((type) => ({
    type,
    pages: pages
      .filter((page) => page.type === type)
      .sort((a, b) => a.title.localeCompare(b.title, 'en')),
  })).filter((group) => group.pages.length > 0);
}
