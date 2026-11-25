import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import { slugFromRelativePath } from './slugs';
import { wikiSchema, type WikiFrontmatter } from './wiki-schema';
import { wikiFileLabel, type WikiTarget } from './wikilinks';

export type LoadedPage = {
  slug: string;
  file: string;
  body: string;
  data: WikiFrontmatter;
};

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function markdownFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(full));
    else if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) files.push(full);
  }
  return files.sort();
}

function parseData(text: string, file: string): unknown {
  try {
    return parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid YAML';
    throw new Error(`Invalid frontmatter in ${file}: ${message}`);
  }
}

export function loadWikiPages(dir: string): LoadedPage[] {
  return markdownFiles(dir).map((full) => {
    const file = wikiFileLabel(full);
    const raw = readFileSync(full, 'utf8');
    const match = raw.match(FRONTMATTER);
    if (!match?.[1]) throw new Error(`Invalid frontmatter in ${file}: missing opening block`);
    const parsed = wikiSchema.safeParse(parseData(match[1], file));
    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((issue) => `${issue.path.join('.') || 'frontmatter'}: ${issue.message}`)
        .join('; ');
      throw new Error(`Invalid frontmatter in ${file}: ${detail}`);
    }
    return {
      slug: slugFromRelativePath(relative(dir, full)),
      file,
      body: raw.slice(match[0].length),
      data: parsed.data,
    };
  });
}

export function catalogFromPages(pages: LoadedPage[]): Map<string, WikiTarget> {
  return new Map(
    pages.map((page) => [
      page.slug,
      { slug: page.slug, title: page.data.title, type: page.data.type },
    ]),
  );
}
