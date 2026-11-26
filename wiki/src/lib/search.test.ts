import { expect, test } from 'vitest';
import {
  escapeHtml,
  flattenGroups,
  graphFocusHref,
  groupRows,
  highlight,
  mapResults,
  scopeCounts,
  slugFromResultUrl,
  type PagefindResultData,
} from './search';

const pages: PagefindResultData[] = [
  {
    url: '/kb-wiki/llm-wiki/',
    excerpt: 'A compiled <mark>wiki</mark> stays.',
    meta: { title: 'LLM wiki', type: 'concept', status: 'stable' },
    filters: { type: ['concept'], tag: ['llm', 'knowledge-base'], status: ['stable'] },
    sub_results: [
      {
        url: '/kb-wiki/llm-wiki/#what-the-build-checks',
        title: 'What the build checks',
        excerpt: 'The build checks the <mark>wiki</mark>.',
      },
      {
        url: '/kb-wiki/llm-wiki/',
        title: 'LLM wiki',
        excerpt: 'Same page.',
      },
    ],
  },
  {
    url: '/kb-wiki/slip-box/',
    excerpt: 'One idea to a note.',
    meta: { title: 'Slip box', type: 'source' },
    filters: { type: ['source'], tag: ['llm'], status: ['stable'] },
    sub_results: [],
  },
];

test('highlight escapes markup and marks the query', () => {
  expect(highlight('<script>', 'script')).toBe('&lt;<mark>script</mark>&gt;');
  expect(escapeHtml('"&"')).toBe('&quot;&amp;&quot;');
  expect(highlight('LLM wiki', 'a')).toBe('LLM wiki');
});

test('results keep the page, its sections, and a matching tag once', () => {
  const rows = mapResults('wiki', pages, '/kb-wiki/');
  expect(rows.map((row) => row.kind)).toEqual(['page', 'section', 'source']);
  expect(rows[0]).toMatchObject({ href: '/kb-wiki/llm-wiki/', slug: 'llm-wiki', locator: 'llm-wiki/' });
  expect(rows[0]?.titleHtml).toContain('<mark>');
  expect(rows[1]).toMatchObject({
    href: '/kb-wiki/llm-wiki/#what-the-build-checks',
    locator: '#what-the-build-checks',
    slug: 'llm-wiki',
  });
  expect(rows[1]?.titleHtml).toContain('LLM wiki');
  expect(rows[1]?.titleHtml).toContain('What the build checks');

  const tagged = mapResults('llm', pages, '/kb-wiki/');
  const tags = tagged.filter((row) => row.kind === 'tag');
  expect(tags).toHaveLength(1);
  expect(tags[0]).toMatchObject({
    href: '/kb-wiki/?tag=llm',
    locator: '#llm',
    slug: null,
    excerptHtml: 'Tagged on 2 pages',
  });
  expect(slugFromResultUrl('/kb-wiki/slip-box/#note', '/kb-wiki/')).toBe('slip-box');
});

test('scopes split the best match from pages, sections, and sources', () => {
  const rows = mapResults('wiki', pages, '/kb-wiki/');
  expect(scopeCounts(rows)).toEqual({ all: 3, pages: 1, sections: 1, sources: 1, tags: 0 });
  const grouped = groupRows(rows, 'all');
  expect(grouped.map((group) => group.label)).toEqual(['Best match', 'Sections', 'Sources']);
  expect(flattenGroups(grouped).map((row) => row.kind)).toEqual(['page', 'section', 'source']);
  expect(groupRows(rows, 'sections').map((group) => group.rows.map((row) => row.kind))).toEqual([['section']]);
  expect(graphFocusHref('llm-wiki', '/kb-wiki/')).toBe('/kb-wiki/graph?focus=llm-wiki');
});
