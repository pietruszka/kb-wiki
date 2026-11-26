import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { catalogCards, catalogStats, type CatalogInput } from './catalog';
import { assertIndexMatches, indexPathFor, parseIndex } from './index-catalog';
import { newestFirst, parseLog, type LogEntry } from './log';
import { assertNoOrphanPages } from './orphans';
import { loadWikiPages, type LoadedPage } from './wiki-catalog';

// The prerender bundle does not keep this file's URL. `astro build` and
// `npm test` both run with the wiki package as the working directory.
const repoRoot = join(process.cwd(), '..');
const wikiDir = join(process.cwd(), 'src/content/wiki');

export const LOG_FILE = 'log.md';
export const INDEX_FILE = 'index.md';

export function toCatalogInput(page: LoadedPage): CatalogInput {
  return {
    slug: page.slug,
    title: page.data.title,
    summary: page.data.summary,
    type: page.data.type,
    status: page.data.status,
    tags: page.data.tags,
    sources: page.data.sources,
    updated: page.data.updated,
    body: page.body,
    file: page.file,
  };
}

export type SiteFiles = {
  pages: CatalogInput[];
  logText: string;
  log: LogEntry[];
  indexText: string;
};

/** Read the root log and catalogue. Fail the build when either is wrong, or when a page has no inbound wikilink. */
export function loadSiteFiles(): SiteFiles {
  const loaded = loadWikiPages(wikiDir);
  let logText: string;
  let indexText: string;
  try {
    logText = readFileSync(join(repoRoot, LOG_FILE), 'utf8');
  } catch {
    throw new Error(`${LOG_FILE} is missing at the repository root`);
  }
  try {
    indexText = readFileSync(join(repoRoot, INDEX_FILE), 'utf8');
  } catch {
    throw new Error(`${INDEX_FILE} is missing at the repository root`);
  }
  const log = newestFirst(parseLog(logText, LOG_FILE));
  const pages = loaded.map(toCatalogInput);
  assertIndexMatches(
    parseIndex(indexText, INDEX_FILE),
    pages.map((page) => ({
      slug: page.slug,
      path: indexPathFor(page.file),
      type: page.type,
      title: page.title,
      summary: page.summary,
    })),
    INDEX_FILE,
  );
  assertNoOrphanPages(
    pages.map((page) => ({
      slug: page.slug,
      title: page.title,
      summary: page.summary,
      type: page.type,
      body: page.body,
      file: page.file,
    })),
  );
  return { pages, logText, log, indexText };
}

export function loadHome(now = new Date(), base?: string) {
  const site = loadSiteFiles();
  const cards = catalogCards(site.pages, now, base ?? '/kb-wiki');
  return {
    ...site,
    cards,
    stats: catalogStats(site.pages),
  };
}
