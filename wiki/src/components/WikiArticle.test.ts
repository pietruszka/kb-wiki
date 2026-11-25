import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import WikiArticle from './WikiArticle.astro';
import type { Backlink } from '../lib/backlinks';
import { sitePath } from '../lib/paths';

const backlink: Backlink = {
  slug: 'backlink',
  title: 'Backlink',
  summary: 'Pages that link here.',
  type: 'concept',
  href: '/kb-wiki/backlink/',
};

async function article(props: Record<string, unknown>, slot = '<p>Compiled once.</p>'): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(WikiArticle, {
    props,
    slots: { default: slot },
  });
}

const baseProps = {
  slug: 'llm-wiki',
  type: 'concept',
  title: 'LLM wiki',
  summary: 'A page that stays.',
  tags: ['knowledge-base', 'llm'],
  sources: [{ title: 'A public overview', url: 'https://example.com/overview' }],
  updated: new Date('2026-11-25T00:00:00.000Z'),
  status: 'stable',
  backlinks: [backlink],
  neighbours: [
    { slug: 'backlink', title: 'Backlink', type: 'concept', href: '/kb-wiki/backlink/' },
  ],
};

test('a wiki page shows its type, metadata, body, and backlinks', async () => {
  const html = await article(baseProps);
  expect(html).toContain('data-testid="wiki.entry"');
  expect(html).toContain('data-type="concept"');
  expect(html).toContain('data-testid="wiki.title"');
  expect(html).toContain('LLM wiki');
  expect(html).toContain('data-testid="wiki.summary"');
  expect(html).toContain('A page that stays.');
  expect(html).toContain('data-testid="wiki.tags"');
  expect(html).toContain('#knowledge-base');
  expect(html).toContain('data-status="stable"');
  expect(html).toContain('datetime="2026-11-25"');
  expect(html).toContain('1 source');
  expect(html).toContain('data-testid="wiki.body"');
  expect(html).toContain('Compiled once.');
  expect(html).toContain('href="/kb-wiki/backlink/"');
  expect(html).toContain('data-testid="wiki.backlinks.link"');
  expect(html).toContain('Pages that link here.');
  expect(html).toContain('href="https://example.com/overview"');
  expect(html).toContain('example.com');
  expect(html).toContain('data-testid="page-type.badge"');
  expect(html).toContain('Concept');
  expect(html).toContain('data-testid="wiki.local"');
  expect(html).toContain('data-testid="wiki.local.link"');
  expect(html).toContain('data-slug="backlink"');
  expect(html).toContain('data-testid="wiki.local.open"');
  expect(html).toContain(`href="${sitePath('/graph')}"`);
});

test('comparison, entity, and source pages keep their own type', async () => {
  for (const [type, label] of [
    ['comparison', 'Comparison'],
    ['entity', 'Entity'],
    ['source', 'Source'],
  ] as const) {
    const html = await article({ ...baseProps, type, backlinks: [], sources: [], tags: [] });
    expect(html).toContain(`data-type="${type}"`);
    expect(html).toContain(label);
  }
});

test('a page with no inbound links and no sources says so', async () => {
  const html = await article({ ...baseProps, backlinks: [], sources: [], tags: [], neighbours: [] });
  expect(html).toContain('data-testid="wiki.backlinks.empty"');
  expect(html).toContain('No pages link here yet.');
  expect(html).toContain('data-testid="wiki.local.empty"');
  expect(html).toContain('No linked pages yet.');
  expect(html).toContain('data-testid="wiki.sources.empty"');
  expect(html).toContain('No sources filed on this page.');
  expect(html).toContain('0 sources');
  expect(html).not.toContain('data-testid="wiki.tags"');
});
