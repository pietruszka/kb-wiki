import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { GET } from '../pages/graph.json';
import { buildGraph, degreeOf, GRAPH_SEED, GRAPH_TICKS, type GraphSource } from './graph';
import { loadWikiPages } from './wiki-catalog';

// Frozen corpus. The graph.json route test below still reads the live notes and compares them to themselves.
const fixtureDir = fileURLToPath(new URL('../fixtures/wiki', import.meta.url));

function source(partial: Partial<GraphSource> & Pick<GraphSource, 'slug' | 'body'>): GraphSource {
  return {
    title: partial.slug,
    type: 'concept',
    status: 'stable',
    tags: [],
    file: `${partial.slug}.md`,
    ...partial,
  };
}

const expectedEdges = [
  { source: 'backlink', target: 'llm-wiki' },
  { source: 'backlink', target: 'obsidian' },
  { source: 'llm-wiki', target: 'backlink' },
  { source: 'llm-wiki', target: 'obsidian' },
  { source: 'llm-wiki', target: 'retrieval-vs-compiled-wiki' },
  { source: 'llm-wiki', target: 'slip-box' },
  { source: 'obsidian', target: 'backlink' },
  { source: 'obsidian', target: 'llm-wiki' },
  { source: 'retrieval-vs-compiled-wiki', target: 'backlink' },
  { source: 'retrieval-vs-compiled-wiki', target: 'llm-wiki' },
  { source: 'slip-box', target: 'backlink' },
  { source: 'slip-box', target: 'llm-wiki' },
];

test('graph.json has one node per page and one edge per wikilink', () => {
  const pages = loadWikiPages(fixtureDir);
  const graph = buildGraph(
    pages.map((page) => ({
      slug: page.slug,
      title: page.data.title,
      type: page.data.type,
      status: page.data.status,
      tags: page.data.tags,
      body: page.body,
      file: page.file,
    })),
  );

  expect(graph.seed).toBe(GRAPH_SEED);
  expect(graph.seed).toBe(42);
  expect(graph.ticks).toBe(GRAPH_TICKS);
  expect(graph.ticks).toBe(400);
  expect(graph.nodes.map((node) => node.slug).sort()).toEqual(pages.map((page) => page.slug).sort());
  expect(graph.edges).toEqual(expectedEdges);
  expect(graph.edges.some((edge) => edge.target === 'missing-page')).toBe(false);

  for (const node of graph.nodes) {
    expect(node.id).toBe(node.slug);
    expect(node.degree).toBe(degreeOf(graph.edges, node.id));
    expect(Number.isFinite(node.x)).toBe(true);
    expect(Number.isFinite(node.y)).toBe(true);
  }
  expect(graph.nodes.find((node) => node.slug === 'llm-wiki')).toMatchObject({
    type: 'concept',
    status: 'stable',
    degree: 4,
    tags: ['knowledge-base', 'llm'],
  });
  expect(graph.nodes.find((node) => node.slug === 'slip-box')?.degree).toBe(2);
  expect(new Set(graph.nodes.map((node) => `${node.x},${node.y}`)).size).toBe(graph.nodes.length);
});

test('the same pages produce the same layout', () => {
  const pages = [
    source({ slug: 'a', body: 'See [[b]] and [[c]].' }),
    source({ slug: 'b', body: 'See [[a]].', type: 'entity' }),
    source({ slug: 'c', body: 'Alone in prose.', type: 'comparison', tags: ['eval'] }),
  ];
  const first = buildGraph(pages);
  const second = buildGraph(pages);
  expect(second).toEqual(first);
  expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  expect(first.edges).toEqual([
    { source: 'a', target: 'b' },
    { source: 'a', target: 'c' },
    { source: 'b', target: 'a' },
  ]);
});

test('repeated wikilinks and self-links become one edge, and a missing target fails', () => {
  const graph = buildGraph([
    source({ slug: 'a', body: '[[b]] plus [[b|again]] and [[a|itself]].' }),
    source({ slug: 'b', body: 'No links.' }),
  ]);
  expect(graph.edges).toEqual([{ source: 'a', target: 'b' }]);
  expect(graph.nodes.find((node) => node.slug === 'a')?.degree).toBe(1);
  expect(graph.nodes.find((node) => node.slug === 'b')?.degree).toBe(1);

  expect(() =>
    buildGraph([source({ slug: 'a', file: 'src/content/wiki/a.md', body: '[[nope]]' })]),
  ).toThrow('Broken wikilink [[nope]] in src/content/wiki/a.md');
});

test('the graph.json route repeats the same document', async () => {
  const first = await GET({} as Parameters<typeof GET>[0]);
  const second = await GET({} as Parameters<typeof GET>[0]);
  const body = await first.text();
  expect(await second.text()).toBe(body);
  expect(body.endsWith('\n')).toBe(true);
  expect(first.headers.get('content-type')).toContain('application/json');

  const parsed = JSON.parse(body) as { nodes: { slug: string }[]; edges: unknown[]; seed: number };
  const pages = loadWikiPages(fileURLToPath(new URL('../content/wiki', import.meta.url)));
  const expected = buildGraph(
    pages.map((page) => ({
      slug: page.slug,
      title: page.data.title,
      type: page.data.type,
      status: page.data.status,
      tags: page.data.tags,
      body: page.body,
      file: page.file,
    })),
  );
  expect(parsed.seed).toBe(GRAPH_SEED);
  expect(parsed.nodes.map((node) => node.slug).sort()).toEqual(expected.nodes.map((node) => node.slug).sort());
  expect(parsed.edges).toEqual(expected.edges);
});
