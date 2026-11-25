import { sitePath } from './paths';
import type { PageType } from './page-types';

export type WikiTarget = {
  slug: string;
  title: string;
  type: PageType;
};

export type WikiLink = {
  slug: string;
  label?: string;
};

/**
 * `[[slug]]` or `[[slug|label]]` on one line.
 * Shared by the remark plugin and the backlink scan so the syntax cannot drift.
 */
export const WIKILINK_PATTERN = /\[\[([^\[\]|\n]+?)(?:\|([^\[\]\n]*))?\]\]/g;

export function wikiPageHref(slug: string, base: string): string {
  return sitePath(`${slug}/`, base);
}

export function brokenWikilinkMessage(file: string, target: string): string {
  return `Broken wikilink [[${target}]] in ${file}`;
}

export function failWikilink(file: string, target: string): never {
  throw new Error(brokenWikilinkMessage(file, target));
}

/** Path from `src/content/…` when we have one, otherwise the path we were given. */
export function wikiFileLabel(filePath: string): string {
  const normalized = filePath.replaceAll('\\', '/');
  const marker = 'src/content/';
  const index = normalized.lastIndexOf(marker);
  return index === -1 ? normalized : normalized.slice(index);
}

function stripNonLinks(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/`[^`\n]*`/g, '')
    .replace(/!?\[[^\[\]\n]*\]\([^)\n]*\)/g, '');
}

/** Wikilinks in prose. Fenced code, inline code, and markdown links are not links. */
export function extractWikilinks(markdown: string): WikiLink[] {
  const links: WikiLink[] = [];
  for (const match of stripNonLinks(markdown).matchAll(WIKILINK_PATTERN)) {
    const slug = match[1]?.trim() ?? '';
    if (!slug) continue;
    const label = match[2]?.trim();
    links.push(label ? { slug, label } : { slug });
  }
  return links;
}

export function assertKnownWikilinks(links: WikiLink[], known: ReadonlySet<string>, file: string): string[] {
  const unique: string[] = [];
  for (const link of links) {
    if (!known.has(link.slug)) failWikilink(file, link.slug);
    if (!unique.includes(link.slug)) unique.push(link.slug);
  }
  return unique;
}
