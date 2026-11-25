---
type: concept
title: Backlink
summary: The pages that link to this one, collected from their bodies when the site is built.
tags:
  - linking
  - knowledge-base
sources:
  - title: Zettelkasten (Wikipedia)
    url: https://en.wikipedia.org/wiki/Zettelkasten
updated: 2026-11-25
status: stable
---

A backlink is the reverse of a wikilink. If the [[llm-wiki|LLM wiki]] page links here, this page lists it. The list is not typed by hand. The build reads every body, keeps the links that resolve, and groups them by the page they point at.

A link in frontmatter does not count. Frontmatter describes the page. The body is where one page points at another. A link inside code does not count either. It is an example, not a reference, which is why `[[missing-page]]` is still just text.

```
[[missing-page]]
```

## Why the list is on the page

Changing a definition is safer when you can see the pages that cite it. [[obsidian|Obsidian]] shows the same idea inside a notes app: the references are visible while you edit. Here they are computed when the site is built, so a published page cannot disagree with the links in the source.
