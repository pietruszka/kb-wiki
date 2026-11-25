import { catalogFromPages, loadWikiPages } from './wiki-catalog';
import {
  WIKILINK_PATTERN,
  failWikilink,
  wikiFileLabel,
  wikiPageHref,
  type WikiTarget,
} from './wikilinks';

export type MarkdownNode = {
  type: string;
  value?: string;
  url?: string;
  title?: string | null;
  children?: MarkdownNode[];
  data?: { hProperties?: Record<string, unknown> };
};

type MarkdownFile = {
  path?: string;
  history?: string[];
};

const SKIPPED = new Set(['code', 'inlineCode', 'link', 'linkReference', 'definition', 'image']);

export type WikilinkPluginOptions = {
  dir: string;
  base: string;
};

function linkNode(target: WikiTarget, label: string, base: string): MarkdownNode {
  return {
    type: 'link',
    url: wikiPageHref(target.slug, base),
    title: null,
    children: [{ type: 'text', value: label }],
    data: {
      hProperties: {
        className: ['wikilink', `wikilink-${target.type}`],
        'data-wikilink': target.slug,
        'data-type': target.type,
        'data-testid': 'wiki.link',
      },
    },
  };
}

function splitText(value: string, catalog: Map<string, WikiTarget>, base: string, file: string): MarkdownNode[] {
  const nodes: MarkdownNode[] = [];
  let last = 0;
  let found = false;
  for (const match of value.matchAll(WIKILINK_PATTERN)) {
    found = true;
    const index = match.index ?? 0;
    const slug = match[1]?.trim() ?? '';
    const alias = match[2]?.trim();
    if (!slug) failWikilink(file, '');
    const target = catalog.get(slug);
    if (!target) failWikilink(file, slug);
    if (index > last) nodes.push({ type: 'text', value: value.slice(last, index) });
    nodes.push(linkNode(target, alias || target.title, base));
    last = index + match[0].length;
  }
  if (!found) return [{ type: 'text', value }];
  if (last < value.length) nodes.push({ type: 'text', value: value.slice(last) });
  return nodes;
}

export function applyWikilinks(
  tree: MarkdownNode,
  catalog: Map<string, WikiTarget>,
  base: string,
  file: string,
): void {
  if (!tree.children || SKIPPED.has(tree.type)) return;
  const next: MarkdownNode[] = [];
  for (const child of tree.children) {
    if (child.type === 'text' && typeof child.value === 'string' && !SKIPPED.has(tree.type)) {
      next.push(...splitText(child.value, catalog, base, file));
    } else {
      applyWikilinks(child, catalog, base, file);
      next.push(child);
    }
  }
  tree.children = next;
}

/** Resolve `[[wikilinks]]` while markdown is compiled. A missing target fails the build. */
export function remarkWikilinks(options: WikilinkPluginOptions) {
  if (!options?.dir || !options.base) {
    throw new Error('remarkWikilinks needs a content directory and a base path');
  }
  return function transformer(tree: MarkdownNode, file: MarkdownFile) {
    const catalog = catalogFromPages(loadWikiPages(options.dir));
    const path = file.path || file.history?.[0] || 'unknown file';
    applyWikilinks(tree, catalog, options.base, wikiFileLabel(path));
  };
}
