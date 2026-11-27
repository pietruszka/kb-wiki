import type { HastNode } from './rehype-index-wikilinks';

function textOf(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textOf).join('');
}

function addClass(node: HastNode, name: string): void {
  const properties = (node.properties ??= {});
  const current = properties.className;
  const list = Array.isArray(current) ? current.map(String) : current ? [String(current)] : [];
  if (!list.includes(name)) list.push(name);
  properties.className = list;
}

/** A kicker is the quote's first paragraph, plain text, starting with ◇ and a label. */
function isKicker(node: HastNode): boolean {
  if (node.tagName !== 'p') return false;
  const children = node.children ?? [];
  if (children.some((child) => child.type === 'element')) return false;
  return /^◇\s+\S/.test(textOf(node).trim());
}

function markCallouts(node: HastNode): void {
  if (node.type === 'element' && node.tagName === 'blockquote') {
    addClass(node, 'callout');
    node.properties = { ...(node.properties ?? {}), 'data-testid': 'wiki.callout' };
    const first = node.children?.find((child) => child.type === 'element');
    if (first && isKicker(first)) addClass(first, 'callout-kicker');
  }
  for (const child of node.children ?? []) markCallouts(child);
}

function wrapTables(node: HastNode): void {
  if (!node.children) return;
  node.children = node.children.map((child) => {
    wrapTables(child);
    if (child.type !== 'element' || child.tagName !== 'table') return child;
    return {
      type: 'element',
      tagName: 'div',
      properties: { className: ['table-scroll'], 'data-testid': 'wiki.table' },
      children: [child],
    };
  });
}

/** Callouts for blockquotes, and a scroll wrapper for tables. */
export function rehypeArticleMarkup() {
  return function transformer(tree: HastNode) {
    markCallouts(tree);
    wrapTables(tree);
  };
}
