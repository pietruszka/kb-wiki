import { PAGE_TYPES, type PageType } from './page-types';

export type IndexEntry = {
  title: string;
  href: string;
  summary: string;
  type: PageType;
  line: number;
};

export type CatalogPage = {
  slug: string;
  path: string;
  type: PageType;
  title: string;
  summary: string;
};

const GROUP = /^## (.+)$/;
const BULLET = /^- \[([^\]]+)\]\(([^)]+)\) — (.*)$/;

const TYPE_BY_LABEL = new Map<string, PageType>(
  (Object.keys(PAGE_TYPES) as PageType[]).map((type) => [PAGE_TYPES[type].label, type]),
);

function fail(file: string, line: number, message: string): never {
  throw new Error(`${file}:${line}: ${message}`);
}

/** Repo-root path for a content file label such as `src/content/wiki/llm-wiki.md`. */
export function indexPathFor(file: string): string {
  const normalized = file.replaceAll('\\', '/');
  const marker = 'src/content/';
  const index = normalized.lastIndexOf(marker);
  const relative = index === -1 ? normalized : normalized.slice(index);
  return `wiki/${relative}`;
}

export function slugFromIndexPath(href: string): string {
  const name = href.split('/').pop() ?? '';
  return name.replace(/\.(mdx|md)$/i, '');
}

/**
 * Parse the agent catalogue. One bullet per page, under a type heading:
 * `- [Title](wiki/src/content/wiki/slug.md) — summary`
 */
export function parseIndex(text: string, file = 'index.md'): IndexEntry[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const entries: IndexEntry[] = [];
  let type: PageType | null = null;
  let seenGroup = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const lineNo = index + 1;
    if (!line.trim()) continue;

    const group = GROUP.exec(line);
    if (group) {
      const label = group[1]?.trim() ?? '';
      const next = TYPE_BY_LABEL.get(label);
      if (!next) {
        fail(file, lineNo, `unknown section "${label}". Expected ${[...TYPE_BY_LABEL.keys()].join(', ')}`);
      }
      type = next;
      seenGroup = true;
      continue;
    }

    if (line.startsWith('# ')) continue;

    const bullet = BULLET.exec(line);
    if (!bullet) {
      if (!seenGroup) continue;
      fail(
        file,
        lineNo,
        'expected a page line: "- [Title](wiki/src/content/wiki/slug.md) — summary"',
      );
    }
    if (!type) fail(file, lineNo, 'page is listed before a type section');
    const title = (bullet[1] ?? '').trim();
    const href = (bullet[2] ?? '').trim();
    const summary = (bullet[3] ?? '').trim();
    if (!title) fail(file, lineNo, 'title is empty');
    if (!href.startsWith('wiki/src/content/wiki/') || href.includes('..')) {
      fail(file, lineNo, `link "${href}" must point at wiki/src/content/wiki/`);
    }
    if (!summary) fail(file, lineNo, 'summary is empty');
    entries.push({ title, href, summary, type, line: lineNo });
  }

  return entries;
}

/** Fail when the catalogue drifts from the pages on disk. */
export function assertIndexMatches(entries: IndexEntry[], pages: CatalogPage[], file = 'index.md'): void {
  const problems: string[] = [];
  const byPath = new Map<string, IndexEntry>();

  for (const entry of entries) {
    const previous = byPath.get(entry.href);
    if (previous) {
      problems.push(`${file}:${entry.line}: ${entry.href} is listed again (also line ${previous.line})`);
      continue;
    }
    byPath.set(entry.href, entry);
  }

  const pagePaths = new Set(pages.map((page) => page.path));
  for (const entry of entries) {
    if (!pagePaths.has(entry.href)) {
      problems.push(`${file}:${entry.line}: lists ${entry.href}, which is not a page`);
    }
  }

  for (const page of pages) {
    const entry = byPath.get(page.path);
    if (!entry) {
      problems.push(`${file}: missing page ${page.path} (${page.slug})`);
      continue;
    }
    if (entry.type !== page.type) {
      const label = PAGE_TYPES[entry.type].label;
      const actual = PAGE_TYPES[page.type].label;
      problems.push(`${file}:${entry.line}: "${entry.title}" is under ${label}, but ${page.slug} is a ${actual}`);
    }
    if (entry.title !== page.title) {
      problems.push(
        `${file}:${entry.line}: title "${entry.title}" does not match frontmatter title "${page.title}"`,
      );
    }
    if (entry.summary !== page.summary) {
      problems.push(`${file}:${entry.line}: summary for ${page.slug} does not match its frontmatter`);
    }
  }

  if (problems.length > 0) {
    throw new Error(['index.md does not match the wiki pages:', ...problems].join('\n'));
  }
}
