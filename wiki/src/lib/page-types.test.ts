import { expect, test } from 'vitest';
import { PAGE_TYPES, isPageType } from './page-types';

test('page types keep the glyph and outline from the design', () => {
  expect(PAGE_TYPES.concept).toMatchObject({ glyph: '◆', label: 'Concept', outline: 'solid' });
  expect(PAGE_TYPES.comparison).toMatchObject({ glyph: '⇄', label: 'Comparison', outline: 'solid' });
  expect(PAGE_TYPES.entity).toMatchObject({ glyph: '●', label: 'Entity', outline: 'solid' });
  expect(PAGE_TYPES.source).toMatchObject({ glyph: '▤', label: 'Source', outline: 'dashed' });
});

test('isPageType accepts only the four page types', () => {
  expect(isPageType('concept')).toBe(true);
  expect(isPageType('source')).toBe(true);
  expect(isPageType('page')).toBe(false);
  expect(isPageType('toString')).toBe(false);
  expect(isPageType(null)).toBe(false);
});
