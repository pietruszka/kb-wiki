import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { assertIndexMatches, indexPathFor, parseIndex, type CatalogPage } from './index-catalog';
import { loadWikiPages } from './wiki-catalog';

const concept: CatalogPage = {
  slug: 'llm-wiki',
  path: 'wiki/src/content/wiki/llm-wiki.md',
  type: 'concept',
  title: 'LLM wiki',
  summary: 'A compiled page.',
};

function catalogue(lines: string): string {
  return `# Index\n\n## Concept\n\n${lines}\n`;
}

test('index check accepts one matching line per page', () => {
  const text = catalogue('- [LLM wiki](wiki/src/content/wiki/llm-wiki.md) — A compiled page.');
  expect(() => assertIndexMatches(parseIndex(text), [concept])).not.toThrow();
});

test('index check fails when a page is missing, extra, or drifted', () => {
  const missing = catalogue('');
  expect(() => assertIndexMatches(parseIndex(missing), [concept])).toThrow(
    /missing page wiki\/src\/content\/wiki\/llm-wiki\.md \(llm-wiki\)/,
  );

  const extra = catalogue(
    [
      '- [LLM wiki](wiki/src/content/wiki/llm-wiki.md) — A compiled page.',
      '- [Gone](wiki/src/content/wiki/gone.md) — Not a page.',
    ].join('\n'),
  );
  expect(() => assertIndexMatches(parseIndex(extra), [concept])).toThrow(/gone\.md, which is not a page/);

  const wrongType = `# Index\n\n## Entity\n\n- [LLM wiki](wiki/src/content/wiki/llm-wiki.md) — A compiled page.\n`;
  expect(() => assertIndexMatches(parseIndex(wrongType), [concept])).toThrow(/under Entity, but llm-wiki is a Concept/);

  const wrongSummary = catalogue('- [LLM wiki](wiki/src/content/wiki/llm-wiki.md) — A different summary.');
  expect(() => assertIndexMatches(parseIndex(wrongSummary), [concept])).toThrow(
    /summary for llm-wiki does not match its frontmatter/,
  );
});

test('a malformed index line fails', () => {
  expect(() => parseIndex('## Notes\n\n- [LLM wiki](wiki/src/content/wiki/llm-wiki.md) — Summary.\n')).toThrow(
    /unknown section "Notes"/,
  );
  expect(() =>
    parseIndex('## Concept\n\n- LLM wiki — no link\n', 'index.md'),
  ).toThrow(/index\.md:\d+: expected a page line/);
});

test('the repository index lists every wiki page', () => {
  const dir = fileURLToPath(new URL('../content/wiki', import.meta.url));
  const pages = loadWikiPages(dir).map((page) => ({
    slug: page.slug,
    path: indexPathFor(page.file),
    type: page.data.type,
    title: page.data.title,
    summary: page.data.summary,
  }));
  const text = readFileSync(fileURLToPath(new URL('../../../index.md', import.meta.url)), 'utf8');
  const entries = parseIndex(text, 'index.md');
  expect(entries).toHaveLength(pages.length);
  expect(() => assertIndexMatches(entries, pages)).not.toThrow();
});
