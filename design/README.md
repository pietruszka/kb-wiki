# kb-wiki mockups

FigCraft source: `wiki.figcraft`. It was edited only through the FigCraft MCP. PNGs are in `png/`.

## Decisions (Piotr, 2026-11-25)

1. **Grid and scanlines on every page.** This includes reading pages: concept, mobile concept, log, and the search backdrop.
   - Spec: 56 px grid at `#FFFFFF09` and a 1 px every 4 px scanline at `#FFFFFF06`.
   - A 70% bg veil fades them behind the 620 px reading column (body 17/29, `#C9CED9`, 12.7:1).
   - Glow is for state only: focus, selection, live data.
2. **Dark and light themes both ship at launch.**
   - Light keeps the crisp grid, drawn in ink `#0B0D12` at 5% for the grid and 2% for scanlines.
   - Light text and accents:

     | Role | Value | Contrast on `#F5F7FA` |
     |---|---|---|
     | bg | `#F5F7FA` | |
     | text | `#0B0D12` | 18.1:1 |
     | body | `#2A3040` | 12.3:1 |
     | muted | `#555D70` | 6.1:1 |
     | accent text | `#0E7490` | 5.0:1 |
     | violet | `#6D3FE0` | 5.7:1 |
     | ok | `#047857` | |
     | warn | `#A15C07` | |
     | err | `#C0263C` | |

   - `#06B6D4` and `#7C3AED` are used only as tints, fills and glow.
   - All body text meets WCAG AA or better. The light tokens sit next to the dark ones in frame 07.
3. **Graph layout is computed at build time.**
   - `d3-force` runs at build (400 ticks, seed 42) and writes positions into `graph.json`.
   - The client canvas island only pans, zooms and highlights; it runs no physics. Frame 03 is annotated with this.
   - Below 768 px the map becomes a list view (frame 10): clusters ordered by link count, from the same `graph.json`.
4. **Only two page-type accents.**
   - Concepts are cyan (◆) and comparisons are violet (⇄).
   - Entities (●) and sources (▤, dashed outline) stay neutral and are told apart by glyph.
   - This applies everywhere: cards, catalog, graph, local graph, search, log chips and the mobile list.

## Frames

| # | Frame | PNG |
|---|---|---|
| 01 | Home / index: hero, SYS.STATUS HUD, log ticker, recent pages, catalog, pipeline | png/01-home-index.png |
| 02 | Concept page "LLM-as-judge": docs sidebar, 620 px article with veil, Mermaid, TOC, backlinks, local graph | png/02-concept-page.png |
| 03 | Knowledge graph: build-time layout annotation, filters, selected-node panel, minimap | png/03-knowledge-graph.png |
| 04 | Search with the ⌘K palette (Pagefind, client-side) | png/04-search-palette.png |
| 05 | log.md timeline: INGEST/QUERY/LINT entries and a raw log terminal | png/05-log-timeline.png |
| 06 | Mobile concept page, 390 wide (@2x) | png/06-mobile-concept@2x.png |
| 07 | Design tokens: dark and light colour, type, glow, page types, backdrop/HUD, light theme | png/07-design-tokens.png |
| 08 | Home / index, light | png/08-home-light.png |
| 09 | Concept page, light | png/09-concept-light.png |
| 10 | Mobile graph list view (< 768 px, @2x) | png/10-mobile-graph-list@2x.png |
| 11 | Mobile concept page, light (@2x) | png/11-mobile-concept-light@2x.png |

## Components

| Component | Id |
|---|---|
| `bg/hud-backdrop` | 8 |
| `bg/hud-backdrop-light` | 1177 |
| `bg/hud-field` (full-height grid and scanlines) | 1161 |
| `bg/hud-field-light` | 1169 |
| `nav/topbar` | 339 |
| `nav/topbar-light` | 1256 |
