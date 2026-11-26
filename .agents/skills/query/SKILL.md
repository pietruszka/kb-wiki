---
name: query
description: Query the wiki and cite the pages. Use when answering a question from the pages, or when filing a kept answer as a concept or comparison.
---

# Query

Answer from the wiki. Read `AGENTS.md` before writing a page. Cite pages in the answer. Filing the answer back waits for a yes.

## Steps

1. Read `index.md`, then the pages the question needs. Done when: you can list the slugs you will use.
2. Answer in English. Cite each claim with the page slug, written as `[[slug]]`. Label a point with no page behind it as not in the wiki. Done when: every claim in the answer has a citation or that label.
3. When the answer is worth keeping, ask whether to file it. Recommend `concept` for one claim, or `comparison` when two approaches sit side by side, and propose a slug. Stop until Piotr says yes or no. Done when: he has answered.
4. On yes, write that one page with `status: draft`, link it from a related page, update `index.md`, and append a `query` entry under the introduction in `log.md`. From `wiki/`, run `npm run typecheck`, `npm test`, and `npm run build`. Done when: all three exit 0.
5. On no, leave the files unchanged. Done when: the working tree matches the tree at the start of this run.
