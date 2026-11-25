# Log

Append-only record of changes to the wiki. Add each new entry directly under this introduction, above the older entries. Do not edit an entry after it is written.

An entry is a level-2 heading and a body:

`## [YYYY-MM-DD] action | subject`

The date is a real calendar day. The action is `ingest`, `query`, `lint`, or `update`. The subject is one line. The body is the text until the next entry, and it must not be empty. A heading that does not match, an unknown action, a date that is not a real day, or an empty body fails the build and names the line.

A body line that starts with `+`, `~`, `!`, or `>` is a detail: added, changed, a warning, or filed. Other lines are the note. The README has the same rules.

## [2026-11-25] lint | Sample pages pass

The build checks frontmatter and resolves every wikilink. The five sample pages pass.

0 warnings

## [2026-11-25] ingest | Filed the November sample pages

Filed the concept pages and the slip-box source. Each page names its sources and links to the others with wikilinks.

+ llm-wiki
+ backlink
+ slip-box

## [2026-11-20] ingest | Retrieval versus a compiled wiki

Filed the comparison as a draft. Retrieval searches when the question arrives. A compiled page is written first and revised when a source changes. The boundary is still open.

+ retrieval-vs-compiled-wiki

## [2026-10-02] update | Obsidian

Filed the entity page and marked it stale. The durable claim is local Markdown and links in both directions. Product details are not on a review schedule.

~ obsidian
