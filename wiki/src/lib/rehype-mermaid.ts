import { fromHtml } from 'hast-util-from-html';
import type { HastNode } from './rehype-index-wikilinks';
import { renderMermaidSvg, type MermaidTheme } from './mermaid-render';
import { mermaidDiagramType } from './mermaid-type';

type MarkdownFile = {
  path?: string;
};

function textOf(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textOf).join('');
}

function element(tagName: string, properties: Record<string, unknown>, children: HastNode[]): HastNode {
  return { type: 'element', tagName, properties, children };
}

function text(value: string): HastNode {
  return { type: 'text', value };
}

function languageOf(node: HastNode): string | undefined {
  const className = node.properties?.className;
  const list = Array.isArray(className) ? className.map(String) : className ? [String(className)] : [];
  const language = list.find((name) => name.startsWith('language-'));
  return language?.slice('language-'.length);
}

function mermaidCode(node: HastNode): HastNode | undefined {
  if (node.tagName !== 'pre') return undefined;
  return node.children?.find((child) => child.type === 'element' && child.tagName === 'code');
}

function stripScripts(node: HastNode): void {
  if (!node.children) return;
  node.children = node.children.filter((child) => child.tagName !== 'script');
  for (const child of node.children) stripScripts(child);
}

function embeddedSvg(svg: string): HastNode {
  const root = fromHtml(svg, { fragment: true });
  const svgNode = root.children.find((child) => child.type === 'element' && child.tagName === 'svg');
  if (!svgNode || svgNode.type !== 'element') throw new Error('Mermaid returned no SVG');
  const node = svgNode as unknown as HastNode;
  const style = node.properties?.style;
  if (typeof style === 'string') {
    const next = style
      .replace(/max-width\s*:[^;"]*;?/gi, '')
      .trim()
      .replace(/;$/, '');
    if (next) node.properties = { ...node.properties, style: next };
    else {
      const properties = { ...(node.properties ?? {}) };
      delete properties.style;
      node.properties = properties;
    }
  }
  stripScripts(node);
  return node;
}

function themeSvg(theme: MermaidTheme, svg: string): HastNode {
  return element('div', { className: ['mermaid-svg'], 'data-mermaid-theme': theme === 'neutral' ? 'light' : 'dark' }, [
    embeddedSvg(svg),
  ]);
}

async function panelFor(source: string, index: number, file: string): Promise<HastNode> {
  const type = mermaidDiagramType(source);
  const label = `MERMAID · ${type} · rendered at build`;
  let dark: string;
  let light: string;
  try {
    [dark, light] = await Promise.all([renderMermaidSvg(source, 'dark'), renderMermaidSvg(source, 'neutral')]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not render a mermaid diagram in ${file}:\n${message}`);
  }
  const sourceId = `mermaid-source-${index}`;
  return element(
    'figure',
    { className: ['mermaid-panel'], 'data-testid': 'wiki.mermaid', 'data-diagram': type },
    [
      element('div', { className: ['mermaid-bar'] }, [
        element('p', { className: ['mermaid-label'] }, [text(label)]),
        element('div', { className: ['mermaid-controls'] }, [
          element(
            'button',
            {
              type: 'button',
              className: ['mermaid-control'],
              'data-mermaid-action': 'source',
              'data-testid': 'wiki.mermaid.source',
              'aria-expanded': 'false',
              'aria-controls': sourceId,
            },
            [text('[ source ]')],
          ),
          element(
            'button',
            {
              type: 'button',
              className: ['mermaid-control'],
              'data-mermaid-action': 'expand',
              'data-testid': 'wiki.mermaid.expand',
              'aria-haspopup': 'dialog',
            },
            [text('[ expand ]')],
          ),
        ]),
      ]),
      element('div', { className: ['mermaid-canvas'] }, [themeSvg('dark', dark), themeSvg('neutral', light)]),
      element(
        'pre',
        {
          id: sourceId,
          className: ['mermaid-source'],
          'data-mermaid-source': 'true',
          'data-pagefind-ignore': 'all',
          hidden: true,
        },
        [element('code', {}, [text(source)])],
      ),
      element('p', { className: ['mermaid-hint'] }, [text('hover a node → linked page')]),
      element('dialog', { className: ['mermaid-dialog'] }, [
        element('div', { className: ['mermaid-bar'] }, [
          element('p', { className: ['mermaid-label'] }, [text(label)]),
          element(
            'button',
            { type: 'button', className: ['mermaid-control'], 'data-mermaid-action': 'close' },
            [text('[ close ]')],
          ),
        ]),
        element('div', { className: ['mermaid-canvas'], 'data-mermaid-dialog-canvas': '' }, []),
      ]),
    ],
  );
}

async function replaceMermaid(node: HastNode, state: { count: number }, file: string): Promise<void> {
  if (!node.children) return;
  for (const child of node.children) await replaceMermaid(child, state, file);
  const next: HastNode[] = [];
  for (const child of node.children) {
    const code = mermaidCode(child);
    if (!code || languageOf(code) !== 'mermaid') {
      next.push(child);
      continue;
    }
    state.count += 1;
    next.push(await panelFor(textOf(code), state.count, file));
  }
  node.children = next;
}

/** Replace ```mermaid fences with the panel. Rendering happens at build, in Chrome. */
export function rehypeMermaid() {
  return async function transformer(tree: HastNode, file: MarkdownFile) {
    await replaceMermaid(tree, { count: 0 }, file.path || 'unknown file');
  };
}
