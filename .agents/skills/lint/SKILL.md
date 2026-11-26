---
name: lint
description: Lint the wiki for judgement issues. Use when checking stale claims, contradictions between pages, missing concept pages, weak summaries, or pages to split or merge.
---

# Lint

Judge the pages. The build already fails on schema, broken wikilinks, orphan pages, index drift, and log format. This pass needs a reader: report findings, then edit after approval.

Read `AGENTS.md` before an edit.

## Judgement checks

Apply each check to every page `index.md` lists.

- **Stale claim.** A sentence the page's sources, or a later page, no longer supports. `status: stale` marks a page for this check. The finding is the claim that went stale.
- **Contradiction.** Two pages assert incompatible claims. Name both slugs.
- **Missing page.** A concept the pages mention often enough that it should have its own concept page.
- **Weak summary.** The frontmatter `summary` misses the page's claim, or it takes more than one sentence.
- **Split or merge.** A page holds two ideas, or two pages hold one.

## Steps

1. Read `index.md` and every page it lists. Apply every judgement check. Done when: the report lists each finding, or it says "No findings."
2. Report the findings in the shape below. Name a mechanical build failure on its own, as something `npm run build` rejects. Stop until Piotr says which findings to edit. Done when: he has approved that list.

```markdown
## Findings

1. <stale|contradiction|missing|summary|split|merge> — <slugs> — <what is wrong>
```

3. Edit only the approved findings. Update `index.md` when a title or summary changes. Append one `lint` entry under the introduction in `log.md`. Record a finding he left unfixed as an `!` line. From `wiki/`, run `npm run typecheck`, `npm test`, and `npm run build`. Done when: all three exit 0.
