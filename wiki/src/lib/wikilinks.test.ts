import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { applyWikilinks, remarkWikilinks, type MarkdownNode } from './remark-wikilinks';
import { brokenWikilinkMessage, extractWikilinks, wikiPageHref, type WikiTarget } from './wikilinks';

const catalog = new Map<string, WikiTarget>([
  ['llm-wiki', { slug: 'llm-wiki', title: 'LLM wiki', type: 'concept' }],
  [
    'retrieval-vs-compiled-wiki',
    { slug: 'retrieval-vs-compiled-wiki', title: 'Retrieval versus a compiled wiki', type: 'comparison' },
  ],
  ['obsidian', { slug: 'obsidian', title: 'Obsidian', type: 'entity' }],
  ['slip-box', { slug: 'slip-box', title: 'Slip box', type: 'source' }],
]);

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

test('wikiPageHref keeps the project base and a trailing slash', () => {
  expect(wikiPageHref('llm-wiki', '/kb-wiki')).toBe('/kb-wiki/llm-wiki/');
  expect(wikiPageHref('llm-wiki', '/')).toBe('/llm-wiki/');
});

test('extractWikilinks reads slug and label, and skips code', () => {
  const markdown = [
    'See [[llm-wiki|the wiki]] and [[ obsidian ]].',
    'Not a link: `[[missing-page]]`.',
    '```',
    '[[missing-page]]',
    '```',
    'A markdown link stays put: [label](https://example.com).',
  ].join('\n');
  expect(extractWikilinks(markdown)).toEqual([
    { slug: 'llm-wiki', label: 'the wiki' },
    { slug: 'obsidian' },
  ]);
});

test('wikilinks resolve to the target page, label, and type', () => {
  const tree: MarkdownNode = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            value: 'See [[ llm-wiki | the wiki ]] and [[retrieval-vs-compiled-wiki]].',
          },
        ],
      },
      { type: 'code', value: '[[missing-page]]', children: [{ type: 'text', value: '[[missing-page]]' }] },
      { type: 'paragraph', children: [{ type: 'inlineCode', value: '[[missing-page]]' }] },
      {
        type: 'paragraph',
        children: [
          {
            type: 'link',
            url: 'https://example.com',
            children: [{ type: 'text', value: '[[missing-page]]' }],
          },
        ],
      },
    ],
  };
  applyWikilinks(tree, catalog, '/kb-wiki', 'src/content/wiki/llm-wiki.md');
  const paragraph = tree.children?.[0];
  expect(paragraph?.children?.map((node) => node.type)).toEqual(['text', 'link', 'text', 'link', 'text']);
  const alias = paragraph?.children?.[1];
  const titled = paragraph?.children?.[3];
  expect(alias).toMatchObject({
    url: '/kb-wiki/llm-wiki/',
    data: {
      hProperties: {
        className: ['wikilink', 'wikilink-concept'],
        'data-wikilink': 'llm-wiki',
        'data-type': 'concept',
        'data-testid': 'wiki.link',
      },
    },
  });
  expect(alias?.children?.[0]).toMatchObject({ type: 'text', value: 'the wiki' });
  expect(titled?.url).toBe('/kb-wiki/retrieval-vs-compiled-wiki/');
  expect(titled?.data?.hProperties?.className).toEqual(['wikilink', 'wikilink-comparison']);
  expect(titled?.children?.[0]).toMatchObject({ value: 'Retrieval versus a compiled wiki' });
  expect(tree.children?.[1]).toMatchObject({ type: 'code', value: '[[missing-page]]' });
  expect(tree.children?.[2]?.children?.[0]).toMatchObject({ type: 'inlineCode' });
  expect(tree.children?.[3]?.children?.[0]).toMatchObject({ type: 'link', url: 'https://example.com' });
});

test('a broken wikilink fails with the file and the target', () => {
  const tree: MarkdownNode = {
    type: 'root',
    children: [{ type: 'paragraph', children: [{ type: 'text', value: 'See [[missing-page]].' }] }],
  };
  expect(() => applyWikilinks(tree, catalog, '/kb-wiki', 'src/content/wiki/backlink.md')).toThrow(
    brokenWikilinkMessage('src/content/wiki/backlink.md', 'missing-page'),
  );
});

test('the remark plugin fails the build for a missing target', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wiki-'));
  dirs.push(dir);
  writeFileSync(
    join(dir, 'note.md'),
    ['---', 'type: concept', 'title: Note', 'summary: A note.', 'tags: []', 'sources: []', 'updated: 2026-11-25', 'status: draft', '---', '', 'See [[missing-page]].', ''].join('\n'),
  );
  const plugin = remarkWikilinks({ dir, base: '/kb-wiki' });
  const tree: MarkdownNode = {
    type: 'root',
    children: [{ type: 'paragraph', children: [{ type: 'text', value: 'See [[missing-page]].' }] }],
  };
  expect(() => plugin(tree, { path: join(dir, 'note.md') })).toThrow(/Broken wikilink \[\[missing-page\]\]/);
  expect(() => plugin(tree, { path: join(dir, 'note.md') })).toThrow(/note\.md/);
});
