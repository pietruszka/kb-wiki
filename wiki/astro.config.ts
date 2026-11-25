import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';

// `site` is the origin. `base` is the GitHub project-pages path.
// A custom domain later sets `site` to that origin and `base` to '/'.
export default defineConfig({
  site: 'https://pietruszka.github.io',
  base: '/kb-wiki',
  integrations: [mdx(), react()],
});
