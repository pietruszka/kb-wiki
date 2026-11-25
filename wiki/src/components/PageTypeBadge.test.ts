import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import PageTypeBadge from './PageTypeBadge.astro';
import { PAGE_TYPES, type PageType } from '../lib/page-types';

async function badge(type: string): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(PageTypeBadge, { props: { type } });
}

test('each page type renders its glyph, label, and outline', async () => {
  for (const type of Object.keys(PAGE_TYPES) as PageType[]) {
    const html = await badge(type);
    const pageType = PAGE_TYPES[type];
    expect(html).toContain(`data-testid="page-type.badge"`);
    expect(html).toContain(`data-type="${type}"`);
    expect(html).toContain(`data-glyph="${pageType.glyph}"`);
    expect(html).toContain(`data-outline="${pageType.outline}"`);
    expect(html).toContain('data-testid="page-type.badge.glyph"');
    expect(html).toContain(pageType.label);
  }
});

test('an unknown page type fails the build', async () => {
  await expect(badge('page')).rejects.toThrow('Unknown page type: page');
});
