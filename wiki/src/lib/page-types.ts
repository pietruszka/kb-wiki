export const PAGE_TYPES = {
  concept: { glyph: '◆', label: 'Concept', outline: 'solid' },
  comparison: { glyph: '⇄', label: 'Comparison', outline: 'solid' },
  entity: { glyph: '●', label: 'Entity', outline: 'solid' },
  source: { glyph: '▤', label: 'Source', outline: 'dashed' },
} as const;

export type PageType = keyof typeof PAGE_TYPES;

export function isPageType(value: unknown): value is PageType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PAGE_TYPES, value);
}
