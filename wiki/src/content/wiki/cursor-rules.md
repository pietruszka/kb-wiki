---
type: concept
title: Cursor rules
summary: Project, user, and team rules plus AGENTS.md are injected at the start of Agent context, so always-on rules cost tokens on every turn, while glob and description scoping keep the rest off the prompt until needed.
tags:
  - llm
  - cost
  - prompting
  - coding-agents
sources:
  - title: Rules (Cursor docs)
    url: https://cursor.com/docs/rules
  - title: Rules (Cursor help)
    url: https://cursor.com/help/customization/rules.md
  - title: Customize Cursor (Cursor docs)
    url: https://cursor.com/docs/customize-cursor
  - title: Using Agent in CLI (Cursor docs)
    url: https://cursor.com/docs/cli/using
  - title: Slash commands (Cursor CLI docs)
    url: https://cursor.com/docs/cli/reference/slash-commands
  - title: Cursor CLI changelog
    url: https://cursor.com/docs/cli/changelog
updated: 2026-11-27
status: draft
---

Cursor rules are persistent instructions for Agent. When a rule applies, its body is included at the start of the model context. They do not affect Cursor Tab, Inline Edit, or Bugbot. The CLI uses the same rules system as the editor, and also applies root `AGENTS.md` and `CLAUDE.md` alongside `.cursor/rules`. Claims below are from Cursor docs and help pages read on 2026-11-27. The product changes often.

Cursor describes four kinds of rule:

- **Project rules** — `.cursor/rules/*.mdc` files, version-controlled and scoped to the repo.
- **User Rules** — global preferences, used by Agent (Chat) in every project.
- **Team Rules** — managed from the dashboard, on Team and Enterprise plans.
- **`AGENTS.md`** — a plain markdown alternative, without frontmatter.

## Project rules

Project rules must use the `.mdc` extension. A plain `.md` file in `.cursor/rules` is ignored. You can name the file anything, and you can group files in folders under `.cursor/rules/` (for example `.cursor/rules/frontend/components.mdc`). The help page says a flat `.cursor/rules/` folder is simpler, but nested subfolders there still work. Cursor identifies rules by full path, so two files with the same name in different folders can both apply.

The CLI changelog (14 May 2026) also says `.cursor/rules` directories in subdirectories are discovered everywhere, matching the IDE, so a monorepo can keep `packages/shell/.cursor/rules/` next to that package. A later changelog (v2026.10.22) and the IDE release notes say that when the agent edits or creates a file in a subdirectory, it receives that directory's nested `AGENTS.md` and nested always-apply rules, even if it never read a file there first. Each such rule is added once per conversation. The Rules reference page itself does not document per-package `.cursor/rules` folders, and it does not spell out how glob, intelligent, or manual rules in those folders are scoped.

## When a project rule is included

The type dropdown sets three frontmatter fields: `alwaysApply`, `description`, and `globs`. Official names and the matching frontmatter are:

| Rule type | Frontmatter | When it is included |
| --- | --- | --- |
| Always Apply | `alwaysApply: true` | Every chat session. `globs` and `description` are ignored. |
| Apply to Specific Files | `alwaysApply: false` and a `globs` value | When a matching file is in context. |
| Apply Intelligently | `alwaysApply: false`, a `description`, and no `globs` | Agent reads the description and pulls the rule in when it judges it relevant. |
| Apply Manually | `alwaysApply: false`, no `description`, no `globs` | Only when you `@`-mention the rule in chat (for example `@my-rule`). |

Official examples write `globs` as a comma-separated string (`globs: src/components/**/*.tsx`, or `docs/**/*.md, docs/**/*.mdx`). If both `globs` and `description` are set and `alwaysApply` is false, the official table treats that as Apply to Specific Files.

```md
---
globs: src/components/**/*.tsx
alwaysApply: false
---

- Use named exports, not default exports
```

## File references in a rule

A mention such as `@migration-template.sql` tells Agent where to look. Agent reads the file with its tools when it needs the content. The file is not inlined into the prompt. This is the same in the editor, the CLI, and Cloud Agents. Put anything that must always be in context in the rule body itself.

## User Rules, Team Rules, and precedence

User Rules are set in **Customize → Rules** (sidebar). They apply across all projects and are meant for style or conventions you always want. Help docs say account User Rules sync with your Cursor account. Rule files in `~/.cursor/rules` stay on that machine and do not sync. User Rules are not applied to Inline Edit.

Team Rules are free-form text, not `.mdc` files. They can have glob patterns; without a glob they apply to every conversation. Admins can enforce a rule so members cannot turn it off.

When guidance conflicts, official docs give this order: **Team Rules → Project Rules → User Rules**. All applicable rules are merged, and earlier sources win. That list does not mention `AGENTS.md` or a legacy `.cursorrules` file. The CLI docs say root `AGENTS.md` and `CLAUDE.md` are applied as rules alongside `.cursor/rules`.

## AGENTS.md and CLAUDE.md

`AGENTS.md` is plain markdown, with no `description`, `globs`, or `alwaysApply`. Cursor supports it in the project root and in subdirectories. Nested files are applied when you work with files in that directory or its children. Instructions are combined with those from parent directories, and the more specific file takes precedence.

Help docs say Cursor reads `CLAUDE.md` the same way it reads `AGENTS.md`, and that `CLAUDE.md` is always applied to every conversation.

## Legacy `.cursorrules`

The Rules reference page no longer mentions a root `.cursorrules` file. The help page still does: it calls that file legacy, says it will be deprecated, and tells you to create an Always Apply project rule, copy the contents over, then delete `.cursorrules`. It does not state in so many words that a leftover file is still injected today.

## Creating and inspecting rules

Official ways to create a project rule:

- `/create-rule` in Agent chat
- Customize → Rules → Add Rule
- Command palette (`Cmd+Shift+P` or `Ctrl+Shift+P`) → **New Cursor Rule**, as described on the help page

The current documented settings path is **Customize → Rules**, not an older "Rules and Memories" label.

## Context cost

Always Apply project rules and User Rules are sent on every turn, including a greeting with no files attached. Apply to Specific Files and Apply Intelligently stay out of the prompt until their conditions match, which is the main way to keep starting context small. Official advice is to keep a rule under 500 lines and to split large rules into focused files.

In Cursor CLI, `/context` shows what is filling the window, broken down by category. The command was added in the CLI changelog (v2026.06.09). The slash-command reference page still omitted it on 2026-11-27, but it works in current CLI builds.

A measurement on 2026-11-27, in `~/Documents` on Cursor Agent v2026.11.22, after a bare `hi` with Grok 4.5 Low, showed 12.9K of 256K (5.1%) already used:

| Category | Tokens | Share of the window |
| --- | --- | --- |
| Skills | 4.3K | 1.7% |
| Tool definitions | 3.3K | 1.3% |
| Rules | 2.9K | 1.1% |
| Subagents | 1.0K | 0.4% |
| MCP | 719 | 0.3% |
| System prompt | 506 | 0.2% |
| Conversation | 88 | 0.0% |

The Rules line is the one this page can shrink. User Rules are easy to miss because they are not in the repo; a long User Rule is a likely source of a 2.9K Rules bucket in a folder that has no project `.mdc` files. Tool definitions, the system prompt, and built-in skills are Cursor's own context and are not trimmed by editing rules.

## Practical habits

- Prefer `globs` or Apply Intelligently for stack-specific guidance. Reserve Always Apply and User Rules for short, universal instructions.
- Split domain rules into focused `.mdc` files rather than one large always-on file.
- Do not use `@path` as a way to force a file into every prompt; paste the lines that must always be present into the rule body.
- After a change, start a fresh session, say something short, and run `/context` to see whether the Rules line moved.
