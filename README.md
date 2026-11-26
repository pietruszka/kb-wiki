# kb-wiki

A personal knowledge base compiled by an LLM. The site is an Astro app in [`wiki/`](wiki/). The repository root keeps this README, the design mockups in [`design/`](design/), the sources in [`raw/`](raw/), and the agent files.

Live site: https://pietruszka.github.io/kb-wiki/

## Develop

The app needs Node 22.

```bash
cd wiki
npm install
npm run dev
```

`npm run dev` serves the site at http://localhost:4321/kb-wiki/. The `/kb-wiki` base matches GitHub project pages, so links work the same locally and in production.

Other commands, from `wiki/`:

- `npm run typecheck` runs `astro check`
- `npm test` runs the behaviour tests
- `npm run build` writes the static site to `wiki/dist`
- `npm run preview` serves that output

`astro.config.ts` sets `site` to `https://pietruszka.github.io` and `base` to `/kb-wiki`. A custom domain later is a change to those two values: `site` becomes the domain, and `base` becomes `/`.

## Pages

Wiki pages live in `wiki/src/content/wiki` as Markdown or MDX. The build checks frontmatter: `type`, `title`, `summary`, `tags`, `sources`, `updated`, and `status` (`draft`, `stable`, or `stale`). Invalid frontmatter fails the build.

Link another page with `[[slug]]` or `[[slug|label]]`. The build resolves that to a URL under `/kb-wiki`. A target that is not a page fails the build, and the error names the file and the target. Fenced code and inline code are not links. Backlinks are the other pages whose bodies link here.

A page with no inbound wikilink fails the build. The error names the file and the slug. A wiki with a single page is the exception, because nothing else can link to it.

The home page, the tag list, and the source list are built from that frontmatter. There is no hand-maintained list of pages on the site. The nav Index is the home page. Log, Tags, Sources, and Graph are pages.

## Log

[`log.md`](log.md) at the repository root is an append-only changelog. Add a new entry directly under the introduction, above the older entries. Do not edit an entry after it is written.

```markdown
## [YYYY-MM-DD] action | subject

What changed, in a sentence or two.

+ slug-of-a-new-page
~ slug-of-a-page-that-changed
```

`YYYY-MM-DD` is a real calendar day. `action` is `ingest`, `query`, `lint`, or `update`. The subject is one line. The body runs until the next entry and must not be empty. A line that starts with `+`, `~`, `!`, or `>` is a detail (added, changed, a warning, or filed). Any other `##` heading fails the build. The error names `log.md` and the line.

`npm run build` reads this file. A malformed entry fails the build.

## Catalogue

[`index.md`](index.md) at the repository root is the agent-maintained catalogue. One line per page, grouped by type. The link points at the source file. The text after the em dash (`—`) is the summary from that page's frontmatter.

```markdown
## Concept

- [LLM wiki](wiki/src/content/wiki/llm-wiki.md) — A wiki whose pages are written and revised by a language model, from sources a person chooses to keep.
```

The sections are `Concept`, `Comparison`, `Entity`, and `Source`. The build checks this file against `wiki/src/content/wiki`. It fails, and names the page, when a page is missing, a line names a page that does not exist, a page is under the wrong type, or the title or summary disagrees with the frontmatter. That check runs inside `npm run build`. It is not a separate CI script.

## Workflows

Agents write the pages. The schema, the link rules, and the checks are in [AGENTS.md](AGENTS.md). [CLAUDE.md](CLAUDE.md) points Claude Code at that file. Read the skill for the task. Each skill stops before it edits.

[`slip-box`](wiki/src/content/wiki/slip-box.md) is a finished ingest: a source page, a wikilink from [`llm-wiki`](wiki/src/content/wiki/llm-wiki.md), a line under Source in [`index.md`](index.md), and an `ingest` entry in [`log.md`](log.md).

### Adding a new source

Skill: [`.agents/skills/ingest/SKILL.md`](.agents/skills/ingest/SKILL.md). It files one article, note, URL, or file.

[`raw/`](raw/) is committed and public. Read [`raw/README.md`](raw/README.md) before adding a file.

1. Put one source in `raw/`. The file is notes Piotr is willing to publish, or a document whose licence allows republication. For a copyrighted or paywalled text, commit a link plus his notes and leave the full text out.
2. Ask the agent to ingest that source.
3. Review the plan. It names the source, the pages to create, the pages to update, and any further sources left waiting. Pages are written only after you approve.
4. Approve with an explicit yes, or name a narrower plan.
5. From `wiki/`, run:

   ```bash
   npm run typecheck
   npm test
   npm run build
   ```

   `npm run build` runs `astro build`, then Pagefind over `wiki/dist`. It fails on invalid frontmatter, a broken wikilink, and an orphan page. The skill runs the same three commands after it writes.
6. Review the diff, commit, and open a pull request.

### Asking a question

Skill: [`.agents/skills/query/SKILL.md`](.agents/skills/query/SKILL.md).

1. Ask the question.
2. The answer cites each claim with a wiki page, written as `[[slug]]`. A point with no page behind it is labeled as not in the wiki.
3. When the answer is worth keeping, the agent asks before it saves a page. It recommends `concept` for one claim, or `comparison` when two approaches sit side by side. Yes files that page and runs the same three commands from `wiki/`. No leaves the files unchanged.

### Periodic tidy-up

Skill: [`.agents/skills/lint/SKILL.md`](.agents/skills/lint/SKILL.md). It reports judgement findings, then edits after approval. The findings are a stale claim, a contradiction, a missing concept page, a weak summary, or a page to split or merge. Invalid frontmatter, a broken wikilink, and an orphan page fail `npm run build`.

1. Ask the agent to lint the wiki.
2. Read the findings. Editing waits until you name which ones to fix.
3. Name which findings to change. It edits only those, then runs the same three commands from `wiki/`.

### Working through a backlog

Ingest one source at a time, then lint once at the end.

1. Hand over the sources. The ingest skill plans the first and lists the rest as waiting.
2. Finish that source, including the checks in `wiki/`, before the next one.
3. When nothing is waiting, ask for one lint pass.

### Shipping

1. Merge the pull request to `main`.
2. [Deploy Pages](.github/workflows/deploy-pages.yml) runs `verify`, then `build`, then `deploy`. `verify` also typechecks, tests, and builds on the pull request. `build` and `deploy` publish `wiki/dist` on a push to `main`, or on a manual run.
3. The change shows up at https://pietruszka.github.io/kb-wiki/, in the graph and in search.

## Where the site lives

GitHub Pages publishes `wiki/dist`, so the built site is the site root. The public URL does not include an extra `/wiki/` segment.

Publishing the repository root instead would put `/wiki/` in the URL (`https://pietruszka.github.io/kb-wiki/wiki/`) and would also publish this README, `design/`, `raw/`, and the agent files.

## Enable GitHub Pages

In the repository: **Settings > Pages > Source: GitHub Actions**.

The workflow file is [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml). The first deploy can take a minute. What a merge to `main` publishes is under [Shipping](#shipping).
