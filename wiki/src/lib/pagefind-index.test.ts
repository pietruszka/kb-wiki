import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Window } from 'happy-dom';
import { beforeAll, describe, expect, test } from 'vitest';
import { loadWikiPages } from './wiki-catalog';

const wikiRoot = fileURLToPath(new URL('../..', import.meta.url));
const dist = fileURLToPath(new URL('../../dist', import.meta.url));
const pagefindBin = join(wikiRoot, 'node_modules', '.bin', 'pagefind');
const fixtureSite = fileURLToPath(new URL('../fixtures/pagefind-site', import.meta.url));

describe('built site', () => {
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

    const pagefind = await loadBuiltIndex(`${dist}/pagefind`);
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

    const examples = await search(pagefind, 'frontmatter');
    const example = examples.find((result) => result.url.endsWith('/backlink/'));
    expect(example?.content ?? '').toContain('missing-page');
    expect(example?.excerpt ?? '').not.toContain('[[');
    expect(example?.content ?? '').not.toContain('[[');
    for (const result of wikiHits) {
      expect(result.excerpt).not.toContain('[[');
      expect(result.content ?? '').not.toContain('[[');
      for (const sub of result.sub_results ?? []) expect(sub.excerpt ?? '').not.toContain('[[');
    }
  });
});

test('a fixture index omits github when that word is only in ignored chrome', async () => {
  const out = await mkdtemp(join(tmpdir(), 'kb-wiki-pagefind-'));
  try {
    execFileSync(
      pagefindBin,
      ['--site', fixtureSite, '--output-path', out, '--force-language', 'en', '--silent'],
      { cwd: wikiRoot, stdio: 'pipe' },
    );
    const pagefind = await loadBuiltIndex(out);
    expect(await search(pagefind, 'github')).toEqual([]);
    expect(await search(pagefind, 'zettelfixture')).toHaveLength(1);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

type BuiltResult = {
  url: string;
  excerpt: string;
  content?: string;
  filters?: Record<string, string[]>;
  sub_results?: Array<{ url: string; title: string; excerpt?: string }>;
};

type BuiltPagefind = {
  filters: () => Promise<Record<string, Record<string, number>>>;
  search: (query: string) => Promise<{ results: Array<{ data: () => Promise<BuiltResult> }> }>;
};

async function loadBuiltIndex(indexDir: string): Promise<BuiltPagefind> {
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
  const bundle = pathToFileURL(`${indexDir}/`);
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
