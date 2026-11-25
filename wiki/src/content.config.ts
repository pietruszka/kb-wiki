import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { slugFromRelativePath } from './lib/slugs';
import { wikiSchema } from './lib/wiki-schema';

const wiki = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/wiki',
    generateId: ({ entry }) => slugFromRelativePath(entry),
    retainBody: true,
  }),
  schema: wikiSchema,
});

export const collections = { wiki };
