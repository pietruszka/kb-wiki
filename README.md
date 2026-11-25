# kb-wiki

A personal knowledge base compiled by an LLM. The site is an Astro app in [`wiki/`](wiki/). The repository root keeps this README, the design mockups in [`design/`](design/), and, later, the raw sources and agent files that should not be published.

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

The home page, the tag list, and the source list are built from that frontmatter. There is no hand-maintained list of pages on the site. The nav Index is the home page. Log, Tags, and Sources are pages. Graph is not a page yet.

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

## Where the site lives

GitHub Pages publishes `wiki/dist`, so the built site is the site root. The public URL does not include an extra `/wiki/` segment.

Publishing the repository root instead would put `/wiki/` in the URL (`https://pietruszka.github.io/kb-wiki/wiki/`) and would also publish this README, `design/`, and any future root files.

## Enable GitHub Pages

In the repository: **Settings > Pages > Source: GitHub Actions**.

[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) typechecks, tests, and builds on pull requests and on `main`. A push to `main`, or a manual run, also deploys `wiki/dist`. The first deploy can take a minute.
