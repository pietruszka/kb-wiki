import type { RehypePlugins, RemarkPlugins } from '@astrojs/internal-helpers/markdown';
import { rehypeArticleMarkup } from './rehype-article';
import { rehypeIndexWikilinks } from './rehype-index-wikilinks';
import { rehypeMermaid } from './rehype-mermaid';
import { remarkWikilinks } from './remark-wikilinks';

/** The remark and rehype plugins the site and the behaviour tests both run. */
export function articleRemarkPlugins(dir: string, base: string): RemarkPlugins {
  return [[remarkWikilinks, { dir, base }]] as RemarkPlugins;
}

export function articleRehypePlugins(dir: string): RehypePlugins {
  return [rehypeArticleMarkup, rehypeMermaid, [rehypeIndexWikilinks, { dir }]] as RehypePlugins;
}
