import { expect, test } from 'vitest';
import { wikiSchema } from './wiki-schema';

const valid = {
  type: 'concept',
  title: 'LLM wiki',
  summary: 'A compiled page.',
  tags: ['knowledge-base'],
  sources: [{ title: 'A public overview', url: 'https://example.com/overview' }],
  updated: '2026-11-25',
  status: 'stable',
};

test('schema accepts a complete page', () => {
  const parsed = wikiSchema.parse(valid);
  expect(parsed.type).toBe('concept');
  expect(parsed.title).toBe('LLM wiki');
  expect(parsed.updated.toISOString()).toBe('2026-11-25T00:00:00.000Z');
  expect(parsed.sources[0]?.url).toBe('https://example.com/overview');
});

test('schema rejects bad frontmatter', () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ['missing title', { ...valid, title: undefined }],
    ['blank title', { ...valid, title: '   ' }],
    ['unknown type', { ...valid, type: 'note' }],
    ['unknown status', { ...valid, status: 'published' }],
    ['bad date', { ...valid, updated: 'yesterday' }],
    ['tags as a string', { ...valid, tags: 'knowledge-base' }],
    ['empty tag', { ...valid, tags: [''] }],
    ['source without a title', { ...valid, sources: [{ url: 'https://example.com' }] }],
    ['source url scheme', { ...valid, sources: [{ title: 'Script', url: 'javascript:alert(1)' }] }],
    ['extra field', { ...valid, reviewed: true }],
  ];
  for (const [name, value] of cases) {
    expect(wikiSchema.safeParse(value).success, name).toBe(false);
  }
});
