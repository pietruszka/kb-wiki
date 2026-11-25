# kb-wiki

A sample knowledge base published as a static site with GitHub Pages. The pages are plain HTML and CSS in the repository root. There is no build step.

Live site: https://pietruszka.github.io/kb-wiki/

## Enable GitHub Pages

In the repository: **Settings > Pages > Source: Deploy from a branch**, branch `main`, folder `/ (root)`.

The empty `.nojekyll` file tells GitHub to serve those files as they are, without running them through Jekyll. The first deploy can take a minute. After it finishes, the live URL above should show `index.html`.

## Add a page

Drop another `.html` file next to `index.html` and link it with a relative URL, for example `./notes.html`. From that page, link back with `./` or `./index.html`.

Relative links keep the site under `https://pietruszka.github.io/kb-wiki/`. A link that starts with `/` leaves the project site and requests `https://pietruszka.github.io/` instead.

`index.html` loads one Mermaid diagram from the jsDelivr ESM build (`mermaid@12.3.0`). Copy that script into another page when a diagram is useful. The diagram text stays in the HTML, so there is still nothing to compile.

## If the site grows

Plain HTML is enough while this is a handful of pages. If it needs shared layout, navigation, or Markdown, move the content to Astro and deploy the built site with a GitHub Actions workflow. That replaces "Deploy from a branch" with an Actions publish step, and the Pages source becomes the workflow rather than the repository root.
