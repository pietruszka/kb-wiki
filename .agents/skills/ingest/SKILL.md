---
name: ingest
description: Ingest one source into the wiki. Use when filing an article, note, URL, or file into raw/ and the pages.
---

# Ingest

File one source. Read `AGENTS.md` for the schema, wikilinks, `index.md`, `log.md`, and `raw/` rules. Read `raw/README.md` before copying a file into `raw/`.

When several sources are offered, plan the first and list the rest as waiting.

## Steps

1. Read the one source and decide what may be committed. Done when: you can name the source, and the committed form is either text Piotr is willing to publish or a link plus his notes.
2. Read `index.md` and the pages those claims touch. Done when: each claim maps to an existing page or to a gap.
3. Show the plan below. Stop. The working tree stays unchanged until Piotr approves it. Approval is an explicit yes, or a narrower plan he names. Done when: he has approved it.

```markdown
## Plan

Source: <path or URL>

Create:
- <slug> (<type>) — <why this page>

Update:
- <slug> — <why this page changes>

Waiting:
- <any further sources>
```

4. Write the approved pages in English under `wiki/src/content/wiki`. One idea to a page. Use the type from the plan. Set `updated` to today's calendar day. Set `status` to `draft` on a page this run creates, and leave an existing page's status as it is unless the approved plan changes it. When other pages exist, link each new page from an existing page's body with a wikilink. Done when: every approved page exists, and each new page has an inbound wikilink.
5. Update `index.md` so every page's line matches its title and summary. Append one `ingest` entry under the introduction in `log.md`. Use `+` for a new slug and `~` for a changed slug. Done when: `index.md` and `log.md` match `AGENTS.md`.
6. From `wiki/`, run `npm run typecheck`, `npm test`, and `npm run build`. Done when: all three exit 0.

A partial approval covers only the pages he named. Run the checks after those pages are written.
