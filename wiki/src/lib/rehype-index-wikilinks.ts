import { catalogFromPages, loadWikiPages } from './wiki-catalog';
import { plainWikilinkText } from './wikilinks';

export type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function textOf(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textOf).join('');
}

function plainSpan(value: string): HastNode {
  return {
    type: 'element',
    tagName: 'span',
    properties: {
      className: ['visually-hidden'],
      ariaHidden: 'true',
    },
    children: [{ type: 'text', value }],
  };
}

/**
 * Code keeps the bracket syntax on the page. Pagefind indexes the plain words instead,
 * because a fenced example is still inside the article body.
 */
export function indexWikilinkExamples(tree: HastNode, titles: ReadonlyMap<string, string>): void {
  walk(tree, titles);
}

function walk(node: HastNode, titles: ReadonlyMap<string, string>): void {
  if (!node.children) return;
  for (const child of node.children) walk(child, titles);
  const next: HastNode[] = [];
  for (const child of node.children) {
    next.push(child);
    const inlineCode = child.tagName === 'code' && node.tagName !== 'pre';
    const fence = child.tagName === 'pre';
    if (!inlineCode && !fence) continue;
    const raw = textOf(child);
    if (!raw.includes('[[')) continue;
    child.properties = { ...(child.properties ?? {}), dataPagefindIgnore: 'all' };
    const plain = plainWikilinkText(raw, titles);
    if (!plain.trim() || plain.includes('[[')) continue;
    next.push(plainSpan(plain));
  }
  node.children = next;
}

export function rehypeIndexWikilinks(options: { dir: string }) {
  if (!options?.dir) throw new Error('rehypeIndexWikilinks needs a content directory');
  return function transformer(tree: HastNode) {
    const titles = new Map(
      [...catalogFromPages(loadWikiPages(options.dir))].map(([slug, page]) => [slug, page.title]),
    );
    indexWikilinkExamples(tree, titles);
  };
}
