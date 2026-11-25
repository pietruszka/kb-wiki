import { join } from 'node:path';
import { buildGraph, type GraphDocument } from './graph';
import { loadWikiPages } from './wiki-catalog';

// `astro build` and `npm test` both run with the wiki package as the working directory.
const wikiDir = join(process.cwd(), 'src/content/wiki');

export type GraphView = {
  graph: GraphDocument;
  summaries: Record<string, string>;
};

export function loadGraphView(): GraphView {
  const pages = loadWikiPages(wikiDir);
  return {
    graph: buildGraph(
      pages.map((page) => ({
        slug: page.slug,
        title: page.data.title,
        type: page.data.type,
        status: page.data.status,
        tags: page.data.tags,
        body: page.body,
        file: page.file,
      })),
    ),
    summaries: Object.fromEntries(pages.map((page) => [page.slug, page.data.summary])),
  };
}

export function graphJsonBody(): string {
  return `${JSON.stringify(loadGraphView().graph, null, 2)}\n`;
}
