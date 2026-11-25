import { expect, test } from 'vitest';
import { sitePath } from './paths';

test('sitePath prefixes the GitHub project base', () => {
  expect(sitePath('/', '/kb-wiki/')).toBe('/kb-wiki/');
  expect(sitePath('/graph', '/kb-wiki/')).toBe('/kb-wiki/graph');
  expect(sitePath('favicon.svg', '/kb-wiki')).toBe('/kb-wiki/favicon.svg');
});

test('sitePath keeps a root base on a custom domain', () => {
  expect(sitePath('/', '/')).toBe('/');
  expect(sitePath('/log', '/')).toBe('/log');
});
