# kb-wiki

A sample knowledge base. The hosted site is plain HTML in [`wiki/`](wiki/). The repository root keeps this README and anything else that should not be published. There is no build step.

Live site: https://pietruszka.github.io/kb-wiki/

## Where the site lives

`wiki/` is uploaded as the Pages artifact, so it becomes the site root. `wiki/index.html` is served at https://pietruszka.github.io/kb-wiki/, not at https://pietruszka.github.io/kb-wiki/wiki/.

Publishing the repository root instead would put that extra `/wiki/` segment in the URL (`https://pietruszka.github.io/kb-wiki/wiki/`) and would also publish this README and any future root files. This repo publishes only `wiki/`.

## Enable GitHub Pages

In the repository: **Settings > Pages > Source: GitHub Actions**.

[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) publishes `wiki/` on every push to `main`, and when the workflow is run manually. The first deploy can take a minute. After it finishes, the live URL above should show `wiki/index.html`.

The workflow uploads the folder as a Pages artifact. GitHub does not run Jekyll on that artifact, so `wiki/` does not need a `.nojekyll` file.

## Add a page

Drop another `.html` file in `wiki/` next to `index.html` and link it with a relative URL, for example `./notes.html`. From that page, link back with `./` or `./index.html`.

Relative links keep the site under `https://pietruszka.github.io/kb-wiki/`. A link that starts with `/` leaves the project site and requests `https://pietruszka.github.io/` instead.

`wiki/index.html` loads one Mermaid diagram from the jsDelivr ESM build (`mermaid@12.3.0`). Copy that script into another page when a diagram is useful. The diagram text stays in the HTML, so there is still nothing to compile.

## If the site grows

Plain HTML is enough while this is a handful of pages. If it needs shared layout, navigation, or Markdown, build it with Astro and change the workflow to upload the build output instead of the `wiki/` folder. The Pages source stays **GitHub Actions**.
