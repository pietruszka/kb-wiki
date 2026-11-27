import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { afterAll, expect, test } from 'vitest';
import { articleRehypePlugins, articleRemarkPlugins } from './article-markdown';
import { bindMermaidPanels, expandMermaid, toggleMermaidSource } from './mermaid-panel';
import { closeMermaidBrowser, hiddenMermaidSource } from './mermaid-render';
import { mermaidDiagramType } from './mermaid-type';

const fixtureDir = fileURLToPath(new URL('../fixtures/wiki', import.meta.url));
const articleUrl = new URL('../fixtures/article.md', import.meta.url);

afterAll(async () => {
  await closeMermaidBrowser();
});

async function renderMarkdown(markdown: string, fileURL: URL): Promise<string> {
  const processor = await createMarkdownProcessor({
    syntaxHighlight: false,
    gfm: true,
    smartypants: true,
    remarkPlugins: articleRemarkPlugins(fixtureDir, '/kb-wiki'),
    rehypePlugins: articleRehypePlugins(fixtureDir),
  });
  const { code } = await processor.render(markdown, { fileURL });
  return code;
}

test('mermaidDiagramType reads the first line of the fence', () => {
  expect(mermaidDiagramType('flowchart TD\n  A --> B')).toBe('flowchart');
  expect(mermaidDiagramType('graph LR\n  A --> B')).toBe('flowchart');
  expect(mermaidDiagramType('%% comment\nsequenceDiagram\n  Alice->>Bob: hi')).toBe('sequence');
  expect(mermaidDiagramType('   ')).toBe('diagram');
});

test('a blockquote becomes a callout and a kicker stays plain text', async () => {
  const html = await renderMarkdown(
    ['> ◇ NOTE', '>', '> See [[llm-wiki]].', '', '> A plain quote stays a callout.', ''].join('\n'),
    new URL('callout.md', articleUrl),
  );
  expect(html.match(/data-testid="wiki.callout"/g)).toHaveLength(2);
  expect(html.match(/callout-kicker/g)).toHaveLength(1);
  expect(html).toContain('◇ NOTE');
  expect(html).toContain('class="callout"');
  const kicker = html.slice(html.indexOf('callout-kicker'), html.indexOf('</p>'));
  expect(kicker).not.toContain('wiki.link');
  expect(html).toContain('href="/kb-wiki/llm-wiki/"');
  expect(html).toContain('data-testid="wiki.link"');
  expect(html).toContain('See');
});

test('a table is wrapped so a wide one can scroll', async () => {
  const html = await renderMarkdown(
    ['| Rule type | When it is included |', '| --- | --- |', '| Always Apply | Every chat session |', ''].join('\n'),
    new URL('table.md', articleUrl),
  );
  expect(html).toContain('data-testid="wiki.table"');
  expect(html).toContain('class="table-scroll"');
  const wrapper = html.slice(html.indexOf('table-scroll'));
  expect(wrapper).toContain('<table>');
  expect(wrapper).toContain('Always Apply');
  expect(wrapper.indexOf('<table>')).toBeGreaterThan(-1);
  expect(wrapper.indexOf('<table>')).toBeLessThan(wrapper.indexOf('</div>'));
});

test('a mermaid fence becomes a panel, and source and expand work', async () => {
  const html = await renderMarkdown(readFileSync(articleUrl, 'utf8'), articleUrl);
  expect(html).toContain('data-testid="wiki.mermaid"');
  expect(html).toContain('data-diagram="flowchart"');
  expect(html).toContain('MERMAID · flowchart · rendered at build');
  expect(html).toContain('[ source ]');
  expect(html).toContain('[ expand ]');
  expect(html).toContain('hover a node → linked page');
  expect(html).toContain('data-mermaid-theme="dark"');
  expect(html).toContain('data-mermaid-theme="light"');
  expect(html.match(/<svg\b/g)?.length).toBeGreaterThanOrEqual(2);
  expect(html).not.toContain('Syntax error');
  expect(html).toMatch(/data-mermaid-source(?:=|[\s>])[^>]*hidden|hidden[^>]*data-mermaid-source/);
  expect(html).toContain('flowchart TD');
  expect(html).toContain('data-testid="wiki.callout"');
  expect(html).toContain('data-testid="wiki.table"');
  expect(await hiddenMermaidSource(html)).toBe(true);

  const window = new Window();
  window.document.body.innerHTML = [
    '<figure data-testid="wiki.mermaid">',
    '<button type="button" data-mermaid-action="source" data-testid="wiki.mermaid.source" aria-expanded="false">[ source ]</button>',
    '<button type="button" data-mermaid-action="expand" data-testid="wiki.mermaid.expand">[ expand ]</button>',
    '<div class="mermaid-canvas"><svg></svg></div>',
    '<pre data-mermaid-source hidden><code>flowchart TD</code></pre>',
    '<dialog class="mermaid-dialog"><button type="button" data-mermaid-action="close">[ close ]</button><div data-mermaid-dialog-canvas></div></dialog>',
    '</figure>',
  ].join('');
  const panel = window.document.querySelector('[data-testid="wiki.mermaid"]') as unknown as ParentNode;
  const source = (panel as ParentNode).querySelector('[data-mermaid-source]')!;
  expect(source.hasAttribute('hidden')).toBe(true);

  toggleMermaidSource(panel);
  expect(source.hasAttribute('hidden')).toBe(false);
  expect(
    source.closest('[data-testid="wiki.mermaid"]')?.querySelector('[data-mermaid-action="source"]')?.getAttribute('aria-expanded'),
  ).toBe('true');
  toggleMermaidSource(panel);
  expect(source.hasAttribute('hidden')).toBe(true);

  bindMermaidPanels(window.document as unknown as Document);
  (window.document.querySelector('[data-testid="wiki.mermaid.source"]') as unknown as HTMLElement).click();
  expect(source.hasAttribute('hidden')).toBe(false);

  expandMermaid(panel);
  const dialog = (panel as ParentNode).querySelector('dialog') as HTMLDialogElement;
  expect(dialog.open || dialog.hasAttribute('open')).toBe(true);
  expect(dialog.querySelector('[data-mermaid-dialog-canvas]')!.innerHTML).toContain('<svg');

  (window.document.querySelector('[data-mermaid-action="close"]') as unknown as HTMLElement).click();
  expect(dialog.open || dialog.hasAttribute('open')).toBe(false);
  window.close();
}, 30000);
