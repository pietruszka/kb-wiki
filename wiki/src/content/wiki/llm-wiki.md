---
type: concept
title: LLM wiki
summary: A wiki whose pages are written and revised by a language model, from sources a person chooses to keep.
tags:
  - knowledge-base
  - llm
sources:
  - title: Personal knowledge management (Wikipedia)
    url: https://en.wikipedia.org/wiki/Personal_knowledge_management
updated: 2026-11-27
status: stable
---

An LLM wiki stores a claim on a page. A chat stores it in a transcript that the next session does not reliably keep. The page stays, and the next question starts from it.

The model does the drafting. It reads what was filed, writes one page per idea, and points at related pages with a [[backlink|wikilink]]. Standing instructions for that agent are filed as [[cursor-rules|Cursor rules]]. A person reads the page, corrects it, and files the correction back. The build then checks that every link names a real page.

That is a different bargain from [[retrieval-vs-compiled-wiki|retrieval]]. Retrieval searches for passages when the question arrives. A compiled page pays the writing cost once and stands until a source changes and the page is revised.

Four page types keep the wiki from turning into a pile of untitled notes. A concept names an idea, like this page. A comparison sets two approaches side by side. An entity names a person, tool, paper, or company, such as [[obsidian|Obsidian]]. A source, such as the note on the [[slip-box|slip box]], summarizes one document and does not wander off into a second topic.

## What the build checks

Each page declares its type, title, summary, tags, sources, the date it was updated, and a status of draft, stable, or stale. The status is a claim about the page. Draft means the judgment is still open. Stale means the page has not been rechecked. Stable means it was reviewed, and nothing filed since then contradicts it.

Links are written in the body, as a slug or as a slug with a label:

```
[[llm-wiki]]
[[llm-wiki|LLM wiki]]
```

A target that is not a page fails the build. The error names the file and the missing target. A link written as code is an example, not a reference, so it is left alone.
