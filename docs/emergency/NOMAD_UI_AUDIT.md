# Project NOMAD UI audit and concept direction

Date: 2026-11-13

## Current interface findings

- The home screen is a grid of equally weighted app tiles. It has no global search, no prominent offline-readiness state, no emergency-priority ordering, and no direct path to saved quick-reference cards.
- The AI Assistant is presented as a primary capability and describes itself as fully local, but the interface does not warn that tested local models can distort safety-critical retrieved text.
- Sources appear after generated answers instead of being the dominant interaction. The current citation component exposes title/path but not a side-by-side passage preview or PDF page number.
- Knowledge Base controls live inside the chat workflow, making document retrieval feel subordinate to generation.
- Maps accept coordinates and markers, but NOMAD has no offline address search, route calculation, or live-closure awareness.
- Kiwix, Kolibri, RAG, drug reference, and maps remain separate searches. The home screen does not explain that boundary.
- The current visual style has good large targets and consistent branding, but large equal tiles consume most of the first screen and conceal the highest-value emergency actions.

## Useful patterns from other interfaces

- Kiwix uses library/book filtering and remembers the active filter, a useful pattern for switching between medical, repair, and general collections.
- Paperless-ngx emphasizes global full-text search, filters, document metadata, and direct document viewing.
- Open WebUI exposes retrieved citations and extracted document text; its entire-document option is a useful precision pattern for short critical guides.
- Organic Maps treats offline place search, routes, downloaded-region visibility, and navigation as first-class states.

## Six concepts prepared

1. **Emergency Console** — recommended starting shell; global search, urgent categories, offline state, and optional AI.
2. **Evidence Search** — retrieval-only default with exact passages and source preview side by side.
3. **Family Quick Guide** — large touch targets and plain-language problem categories for stressful use.
4. **Field Map** — saved family places/routes, terrain, regional plans, and explicit stale/live-data warnings.
5. **Library Desk** — authority/date/status metadata and filters for managing the complete offline collection.
6. **Guided Answer** — deterministic step cards assembled from exact passages, with source conflicts shown and AI off by default.

## Recommendation

Combine **Emergency Console** as the home screen, **Evidence Search** as the default search result, and **Guided Answer** only for carefully curated critical procedures. Keep **Family Quick Guide** as a simplified mode. Treat **Field Map** as a launcher into NOMAD's viewer plus a separate offline routing application. **Library Desk** should be the maintenance/catalog view rather than the everyday emergency screen.
