import { isPageType, type PageType } from './page-types';
import { sitePath } from './paths';

export const SEARCH_OPEN_EVENT = 'kb-wiki:search-open';

export const SEARCH_SCOPES = [
  { id: 'all', label: 'All' },
  { id: 'pages', label: 'Pages' },
  { id: 'sections', label: 'Sections' },
  { id: 'sources', label: 'Sources' },
  { id: 'tags', label: 'Tags' },
] as const;

export type SearchScope = (typeof SEARCH_SCOPES)[number]['id'];
export type SearchKind = 'page' | 'section' | 'source' | 'tag';

export type SearchRow = {
  key: string;
  kind: SearchKind;
  type: PageType | null;
  titleHtml: string;
  excerptHtml: string;
  href: string;
  locator: string;
  slug: string | null;
};

export type SearchGroup = {
  id: string;
  label: string;
  rows: SearchRow[];
};

export type PagefindResultData = {
  url: string;
  excerpt: string;
  meta: Record<string, string>;
  filters?: Record<string, string[]>;
  sub_results?: Array<{
    url: string;
    title: string;
    excerpt: string;
  }>;
};

type PagefindApi = {
  options: (options: { baseUrl?: string; basePath?: string }) => Promise<void>;
  init: () => Promise<void>;
  search: (query: string) => Promise<{
    results: Array<{ data: () => Promise<PagefindResultData> }>;
  }>;
};

export type SearchOutcome =
  | { status: 'ready'; rows: SearchRow[]; ms: number }
  | { status: 'unavailable' };

const GROUP_LABEL: Record<SearchKind | 'best', string> = {
  best: 'Best match',
  page: 'Pages',
  section: 'Sections',
  source: 'Sources',
  tag: 'Tags',
};

const loaded = new Map<string, Promise<PagefindApi | null>>();

export function siteBase(base: string): string {
  if (!base) return '/';
  return base.endsWith('/') ? base : `${base}/`;
}

/** Load the build-time index. A dev server has no bundle, so this resolves to null. */
export function loadPagefind(base: string): Promise<PagefindApi | null> {
  const root = siteBase(base);
  const existing = loaded.get(root);
  if (existing) return existing;
  const pending = importPagefind(root);
  loaded.set(root, pending);
  return pending;
}

async function importPagefind(root: string): Promise<PagefindApi | null> {
  try {
    const pagefind = (await import(/* @vite-ignore */ `${root}pagefind/pagefind.js`)) as PagefindApi;
    await pagefind.options({
      baseUrl: root,
      basePath: `${root}pagefind/`,
    });
    await pagefind.init();
    return pagefind;
  } catch {
    return null;
  }
}

export async function searchWiki(query: string, base: string = import.meta.env.BASE_URL ?? '/'): Promise<SearchOutcome> {
  const pagefind = await loadPagefind(base);
  if (!pagefind) return { status: 'unavailable' };
  const started = performance.now();
  const found = await pagefind.search(query);
  const ms = Math.max(1, Math.round(performance.now() - started));
  const pages = await Promise.all(found.results.map((result) => result.data()));
  return { status: 'ready', rows: mapResults(query, pages, base), ms };
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function highlight(text: string, query: string): string {
  const safe = escapeHtml(text);
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((term) => term.length >= 2);
  if (terms.length === 0) return safe;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  return safe.replace(pattern, '<mark>$1</mark>');
}

export function slugFromResultUrl(url: string, base: string): string | null {
  const path = (url.split('#')[0] ?? '').split('?')[0] ?? '';
  const prefix = siteBase(base);
  const stripped = path.startsWith(prefix) ? path.slice(prefix.length) : path.replace(/^\//, '');
  const slug = stripped.split('/').filter(Boolean)[0];
  return slug || null;
}

export function graphFocusHref(slug: string, base?: string): string {
  return `${sitePath('/graph', base)}?focus=${encodeURIComponent(slug)}`;
}

export function mapResults(query: string, pages: readonly PagefindResultData[], base: string): SearchRow[] {
  const rows: SearchRow[] = [];
  const tags = new Map<string, number>();
  const needle = query.trim().toLowerCase();

  for (const page of pages) {
    const type = pageTypeOf(page);
    const slug = slugFromResultUrl(page.url, base);
    const title = page.meta.title || slug || 'Untitled';
    const kind: SearchKind = type === 'source' ? 'source' : 'page';
    rows.push({
      key: page.url,
      kind,
      type,
      titleHtml: highlight(title, query),
      excerptHtml: page.excerpt,
      href: page.url,
      locator: slug ? `${slug}/` : page.url,
      slug,
    });

    for (const sub of page.sub_results ?? []) {
      const hashAt = sub.url.indexOf('#');
      if (hashAt === -1) continue;
      const heading = sub.title.trim();
      if (!heading || heading === title.trim()) continue;
      rows.push({
        key: sub.url,
        kind: 'section',
        type,
        titleHtml: `${escapeHtml(title)} <span class="search-sep">›</span> ${highlight(heading, query)}`,
        excerptHtml: sub.excerpt,
        href: sub.url,
        locator: sub.url.slice(hashAt),
        slug,
      });
    }

    if (!needle) continue;
    for (const tag of page.filters?.tag ?? []) {
      if (!tag.toLowerCase().includes(needle)) continue;
      tags.set(tag, (tags.get(tag) ?? 0) + 1);
    }
  }

  for (const [tag, count] of tags) {
    rows.push({
      key: `tag:${tag}`,
      kind: 'tag',
      type: null,
      titleHtml: highlight(`#${tag}`, query),
      excerptHtml: count === 1 ? 'Tagged on 1 page' : `Tagged on ${count} pages`,
      href: sitePath(`/?tag=${encodeURIComponent(tag)}`, base),
      locator: `#${tag}`,
      slug: null,
    });
  }

  return rows;
}

export function scopeCounts(rows: readonly SearchRow[]): Record<SearchScope, number> {
  return {
    all: rows.length,
    pages: rows.filter((row) => row.kind === 'page').length,
    sections: rows.filter((row) => row.kind === 'section').length,
    sources: rows.filter((row) => row.kind === 'source').length,
    tags: rows.filter((row) => row.kind === 'tag').length,
  };
}

export function groupRows(rows: readonly SearchRow[], scope: SearchScope): SearchGroup[] {
  const visible = scope === 'all' ? [...rows] : rows.filter((row) => row.kind === scopeKind(scope));
  if (visible.length === 0) return [];
  if (scope !== 'all') {
    return [{ id: scope, label: GROUP_LABEL[scopeKind(scope)], rows: visible }];
  }

  const best = visible.find((row) => row.kind === 'page' || row.kind === 'source');
  const rest = best ? visible.filter((row) => row.key !== best.key) : visible;
  const groups: SearchGroup[] = [];
  if (best) groups.push({ id: 'best', label: GROUP_LABEL.best, rows: [best] });
  for (const kind of ['page', 'section', 'source', 'tag'] as const) {
    const items = rest.filter((row) => row.kind === kind);
    if (items.length > 0) groups.push({ id: kind, label: GROUP_LABEL[kind], rows: items });
  }
  return groups;
}

export function flattenGroups(groups: readonly SearchGroup[]): SearchRow[] {
  return groups.flatMap((group) => group.rows);
}

function scopeKind(scope: Exclude<SearchScope, 'all'>): SearchKind {
  if (scope === 'pages') return 'page';
  if (scope === 'sections') return 'section';
  if (scope === 'sources') return 'source';
  return 'tag';
}

function pageTypeOf(page: PagefindResultData): PageType | null {
  const value = page.filters?.type?.[0] ?? page.meta.type;
  return isPageType(value) ? value : null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
