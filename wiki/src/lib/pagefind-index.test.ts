import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Window } from 'happy-dom';
import { beforeAll, expect, test } from 'vitest';
import { loadWikiPages } from './wiki-catalog';

const wikiRoot = fileURLToPath(new URL('../..', import.meta.url));
const dist = fileURLToPath(new URL('../../dist', import.meta.url));

beforeAll(() => {
  execFileSync('npm', ['run', 'build'], {
    cwd: wikiRoot,
    stdio: 'pipe',
    timeout: 180000,
    env: process.env,
  });
}, 180000);

test('the built site indexes wiki pages and leaves chrome out', async () => {
  const entry = await readFile(fileURLToPath(new URL('../../dist/pagefind/pagefind.js', import.meta.url)), 'utf8');
  expect(entry.length).toBeGreaterThan(0);

  const html = await readFile(fileURLToPath(new URL('../../dist/llm-wiki/index.html', import.meta.url)), 'utf8');
  const home = await readFile(fileURLToPath(new URL('../../dist/index.html', import.meta.url)), 'utf8');
  const window = new Window();
  window.document.write(html);
  const indexed = window.document.querySelector('[data-pagefind-body]');
  expect(indexed?.querySelector('[data-testid="wiki.body"]')).toBeTruthy();
  expect(indexed?.querySelector('[data-testid="wiki.backlinks"]')).toBeNull();
  expect(indexed?.querySelector('[data-testid="wiki.local"]')).toBeNull();
  expect(indexed?.textContent).not.toContain('Open graph');
  expect(indexed?.textContent).not.toContain('Skip to content');
  expect(window.document.querySelector('[data-testid="wiki.backlinks"]')?.getAttribute('data-pagefind-ignore')).toBe(
    'all',
  );
  expect(window.document.querySelector('header')?.getAttribute('data-pagefind-ignore')).toBe('all');
  expect(home).not.toContain('data-pagefind-body');
  await window.happyDOM.close();

  const pagefind = await loadBuiltIndex();
  const filters = await pagefind.filters();
  const pages = loadWikiPages(fileURLToPath(new URL('../content/wiki', import.meta.url)));
  const indexedCount = Object.values(filters.type ?? {}).reduce((sum, count) => sum + count, 0);
  expect(indexedCount).toBe(pages.length);
  expect(Object.values(filters.status ?? {}).reduce((sum, count) => sum + count, 0)).toBe(pages.length);

  const hit = await search(pagefind, 'luhmann');
  expect(hit).toHaveLength(1);
  expect(hit[0]?.url).toBe('/kb-wiki/slip-box/');
  expect(hit[0]?.filters?.type).toContain('source');
  expect(hit[0]?.excerpt.toLowerCase()).toContain('luhmann');

  const section = await search(pagefind, 'chunks');
  expect(section.some((result) => result.sub_results?.some((sub) => sub.url.includes('#retrieval')))).toBe(true);

  const wikiHits = await search(pagefind, 'wiki');
  expect(wikiHits.length).toBeGreaterThan(0);
  for (const hit of wikiHits) {
    const text = hit.content ?? '';
    expect(text).not.toContain('Open graph');
    expect(text).not.toContain('Skip to content');
    expect(text).not.toContain('Show orphans');
    expect(text).not.toContain('Pages that link here');
  }
  expect(await search(pagefind, 'github')).toEqual([]);
});

type BuiltResult = {
  url: string;
  excerpt: string;
  content?: string;
  filters?: Record<string, string[]>;
  sub_results?: Array<{ url: string; title: string }>;
};

type BuiltPagefind = {
  filters: () => Promise<Record<string, Record<string, number>>>;
  search: (query: string) => Promise<{ results: Array<{ data: () => Promise<BuiltResult> }> }>;
};

async function loadBuiltIndex(): Promise<BuiltPagefind> {
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (href.startsWith('file:')) {
      const fileUrl = new URL(href);
      fileUrl.search = '';
      const bytes = await readFile(fileURLToPath(fileUrl));
      return new Response(bytes);
    }
    return original(input, init);
  };
  const bundle = pathToFileURL(`${dist}/pagefind/`);
  const pagefind = (await import(/* @vite-ignore */ new URL('pagefind.js', bundle).href)) as BuiltPagefind & {
    options: (options: { baseUrl?: string; basePath?: string }) => Promise<void>;
    init: () => Promise<void>;
  };
  await pagefind.options({
    baseUrl: '/kb-wiki/',
    basePath: bundle.href,
  });
  await pagefind.init();
  return pagefind;
}

async function search(pagefind: BuiltPagefind, query: string): Promise<BuiltResult[]> {
  const found = await pagefind.search(query);
  return Promise.all(found.results.map((result) => result.data()));
}
