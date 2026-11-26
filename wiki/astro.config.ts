import { fileURLToPath } from 'node:url';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';
import { rehypeIndexWikilinks } from './src/lib/rehype-index-wikilinks';
import { remarkWikilinks } from './src/lib/remark-wikilinks';
import { SITE_BASE, SITE_ORIGIN } from './src/lib/site';

const wikiDir = fileURLToPath(new URL('./src/content/wiki', import.meta.url));

// `site` is the origin. `base` is the GitHub project-pages path.
// A custom domain later sets `site` to that origin and `base` to '/'.
// Astro 7's default Markdown processor does not run remark plugins. `unified`
// is the remark/rehype pipeline, so wikilinks resolve for both .md and .mdx.
export default defineConfig({
  site: SITE_ORIGIN,
  base: SITE_BASE,
  integrations: [mdx(), react()],
  markdown: {
    // Plain code blocks follow the theme tokens. The default highlighter
    // inlines a dark theme, which breaks the light page.
    syntaxHighlight: false,
    processor: unified({
      remarkPlugins: [[remarkWikilinks, { dir: wikiDir, base: SITE_BASE }]],
      rehypePlugins: [[rehypeIndexWikilinks, { dir: wikiDir }]],
    }),
  },
});
