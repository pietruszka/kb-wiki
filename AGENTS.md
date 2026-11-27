# Agents

This wiki is a compiled knowledge base. An agent writes and revises the pages from sources Piotr chooses to keep. Piotr reviews the diff and hand-edits small corrections. Write every page in English, including when the source is Polish. A source title may stay in its original language.

## Layout

- `wiki/` — the Astro app. Pages live in `wiki/src/content/wiki` as `.md` or `.mdx`. The site base is `/kb-wiki`. Run commands in `wiki/`.
- `index.md` — the catalogue. The build compares it with the pages.
- `log.md` — the append-only changelog.
- `raw/` — committed, public sources. Read `raw/README.md` before adding a file.
- `design/` — mockups, kept out of the published site.
- `.agents/skills/` — ingest, query, and lint.
- `.github/workflows/deploy-pages.yml` — CI. GitHub Pages publishes `wiki/dist` only.

## Page types

One type per page. The slug is the path under `wiki/src/content/wiki` without `.md` or `.mdx`.

- **concept** — one idea worth keeping, such as `llm-wiki`.
- **comparison** — two approaches side by side, such as `retrieval-vs-compiled-wiki`.
- **entity** — a person, tool, paper, or company, such as `obsidian`.
- **source** — one document, in this wiki's own words, such as `slip-box`. It stays with that document.

## Frontmatter

`wiki/src/lib/wiki-schema.ts` validates this block. An extra key fails the build. `sources` is a title and an optional `http` or `https` URL. Name a file in `raw/` inside `title`. The schema has no `path` key.

```yaml
---
type: concept
title: LLM wiki
summary: One sentence a reader can scan.
tags:
  - knowledge-base
sources:
  - title: raw/notes.md
    url: https://example.com/overview
updated: 2026-11-26
status: draft
---
```

- `title` and `summary` are non-empty. The summary is the sentence copied into `index.md`.
- Page summaries must not contain apostrophes. They get HTML-escaped and break `pages.test.ts`.
- `tags` is a list of non-empty strings. Reuse a tag already on a page when it fits. The sample pages use lowercase words.
- `updated` is the calendar day the page was last revised.
- `status` is `draft` (the judgement is still open), `stable` (reviewed, and nothing filed since contradicts it), or `stale` (not rechecked). A page this run creates starts as `draft`.

## Wikilinks

Link a page from the body with `[[slug]]` or `[[slug|label]]`. A target that is not a page fails the build. The error is `Broken wikilink [[target]] in <file>`, and the file is the path under `src/content/`.

An inbound link is a wikilink in another page's prose. A self-link, a fenced or inline code span, a Markdown link, a line in `index.md`, and a frontmatter source are not inbound links.

A page with no inbound link fails the build once a second page exists. The error starts `Orphan pages have no inbound wikilink` and names each file and slug. A wiki with fewer than two pages passes, because nothing else can link here. Link a new page from an existing page.

The home-page orphan count uses this same inbound rule, and it still counts a lone page. The graph control "Show orphans" is a different rule: it hides pages with no edges at all.

## Article markdown

A blockquote is a callout. To give it a kicker, make the first paragraph plain text that starts with `◇` and a label, then a blank line, then the body. The kicker is shown as written. A wikilink in the body resolves as it does elsewhere. A kicker has no wikilink.

```markdown
> ◇ NOTE
>
> Filed from a query. See [[llm-wiki]].
```

A fenced block whose language is `mermaid` is drawn when the site builds. The panel names the diagram type from the first line of the fence.

## index.md

One bullet per page, under `## Concept`, `## Comparison`, `## Entity`, or `## Source`. The separator is the em dash ` — `.

```markdown
- [LLM wiki](wiki/src/content/wiki/llm-wiki.md) — A wiki whose pages are written and revised by a language model, from sources a person chooses to keep.
```

The link points at the source file. Use `.mdx` when that is the file. The title and the text after the em dash match that page's frontmatter. The build fails, and names the page, when a page is missing, a line names a missing page, a page is under the wrong type, or the title or summary disagrees.

## log.md

Add the new entry directly under the introduction, above the older entries. Leave an older entry as it was written.

```markdown
## [YYYY-MM-DD] action | subject

What changed, in a sentence or two.

+ slug-of-a-new-page
~ slug-of-a-page-that-changed
```

`YYYY-MM-DD` is a real calendar day. `action` is `ingest`, `query`, `lint`, or `update`. The subject is one line. The body runs until the next entry and has text. A line that starts with `+`, `~`, `!`, or `>` is a detail: added, changed, a warning, or filed. Any other `##` heading fails the build. The error names `log.md` and the line.

## raw/

`raw/` is committed and public. Commit a source when Piotr is willing to publish it: notes he wrote, or a document whose licence allows republication. For a copyrighted or paywalled source, commit a link and his notes, and leave the full text out. Ingest one source at a time. The detail is in `raw/README.md`.

## Checks

From `wiki/`:

- `npm run typecheck` runs `astro check`
- `npm test` runs the behaviour tests
- `npm run build` runs `astro build`, then Pagefind over `wiki/dist`

`npm run build` enforces frontmatter, wikilinks, orphan pages, `index.md`, and `log.md`.

## Review

Open a pull request for Piotr to review. The `verify` job in `.github/workflows/deploy-pages.yml` runs the three checks on pull requests. `build` and `deploy` stay separate jobs. They publish `wiki/dist` from `main`, or from a manual run.

## Skills

Read the skill whose task this is. Each skill stops for approval before it edits.

- **Ingest**, `.agents/skills/ingest/SKILL.md` — filing one article, note, URL, or file into `raw/` and the pages.
- **Query**, `.agents/skills/query/SKILL.md` — answering a question from the pages, or filing a kept answer as a concept or comparison.
- **Lint**, `.agents/skills/lint/SKILL.md` — judging stale claims, contradictions, missing concept pages, weak summaries, or pages to split or merge.

Lint is the judgement pass. The checks in this file stay the mechanical failures.
