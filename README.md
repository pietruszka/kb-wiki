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

## Where the site lives

GitHub Pages publishes `wiki/dist`, so the built site is the site root. The public URL does not include an extra `/wiki/` segment.

Publishing the repository root instead would put `/wiki/` in the URL (`https://pietruszka.github.io/kb-wiki/wiki/`) and would also publish this README, `design/`, and any future root files.

## Enable GitHub Pages

In the repository: **Settings > Pages > Source: GitHub Actions**.

[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) typechecks, tests, and builds on pull requests and on `main`. A push to `main`, or a manual run, also deploys `wiki/dist`. The first deploy can take a minute.
