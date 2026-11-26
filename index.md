# Index

Catalogue of wiki pages for the agent that maintains them. One line per page, grouped by type. The link points at the source file. The text after the em dash is the page summary, copied from that file's frontmatter.

The site build reads this file and the pages in `wiki/src/content/wiki`. It fails if a page is missing, if a line names a page that does not exist, if a page sits under the wrong type, if the title or summary disagrees with that page, or if a page has no inbound wikilink. A wiki with a single page is the exception to that last check.

## Concept

- [Backlink](wiki/src/content/wiki/backlink.md) — The pages that link to this one, collected from their bodies when the site is built.
- [LLM wiki](wiki/src/content/wiki/llm-wiki.md) — A wiki whose pages are written and revised by a language model, from sources a person chooses to keep.

## Comparison

- [Retrieval versus a compiled wiki](wiki/src/content/wiki/retrieval-vs-compiled-wiki.mdx) — Retrieval finds passages when a question arrives. A compiled wiki writes the answer down and updates the page when the sources change.

## Entity

- [Obsidian](wiki/src/content/wiki/obsidian.md) — A local notes application whose Markdown files link to each other with wikilinks, and whose backlinks panel lists the notes that point at the open one.

## Source

- [Slip box](wiki/src/content/wiki/slip-box.md) — A short filing of the slip-box method: one idea to a note, written so that another note can point at it later.
