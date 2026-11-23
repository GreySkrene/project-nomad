# Project NOMAD completion plan

Last updated: 2026-11-19 (America/Denver)

Status key: `[x]` verified complete, `[-]` in progress, `[ ]` not started, `[!]` blocked or needs a decision.

## Resume here: replacement and removal queue

The usefulness audit is complete. The next session should improve the installed
library rather than repeat the inventory scan. Replacement is transactional: identify
and license-check a candidate, download it, validate its real content (not merely its
file/checksum), test it offline through the user interface, update the manifests and
audit records, and only then remove the superseded resource. Ask before any large
download and show the exact deletion target before deleting data.

1. [x] **LibreTexts Medicine** — replaced with Oregon State's 2025 *Anatomy &
   Physiology 2e*: 2,070 readable pages, 677,097 extracted words, substantive Chemical,
   Cellular, and Tissue chapters, and 1,539 figure captions. The 133,118,779-byte PDF
   passed offline UI download/hash validation. It is browse-only because the source's
   current terms do not authorize LLM ingestion. The defective 1,192,567,339-byte ZIM
   and both public catalog/profile entries were removed.
2. [x] **OpenZIM Medical Library (`zimgit-medicine`)** — replaced with 80 current,
   readable PDFs from Hesperian and WHO (1,552 pages; 54,473,646 bytes). Every page was
   extraction-audited; emergency-care, first-aid, dental, childbirth, and transport
   chapters were spot-checked. Hesperian is labeled austere supplemental guidance;
   current official clinical guidance takes precedence. The defective 70,179,585-byte
   ZIM and its catalog/profile entries were removed.
3. [x] **Lenovo Legion Go** — installed the complete Lenovo-authored 40-page 8APU1 /
   type 83E1 guide (obtained from a mirror because Lenovo's support download blocked
   automation). All pages are readable and the 65 W charging, battery, Quiet 8 W, and
   troubleshooting sections were verified. The six-page landing-page capture was
   removed after the replacement passed offline UI download/hash validation.
4. [x] **Canada detailed map repair** — repeated nationwide overlay attempts were
   stopped after the source CDN reset range-request connections at different points.
   The original map already passed zoom-15 samples across the rest of Canada, so a
   targeted British Columbia overlay was the smaller reliable repair. The verified
   `ca-british-columbia_20261118_z15.pmtiles` archive is 2,617,262,221 bytes, serves
   through NOMAD with range requests, and returns zoom-15 tiles for Vancouver,
   Burnaby, Victoria, and Kelowna. The existing 33,788,916,131-byte continental map
   remains installed and no download job remains active.
5. [ ] **Supplemental/noise review** — decide whether Gardening Stack Exchange and the
   other Q&A archives earn their storage after coherent replacements are in place.
   They are labeled supplemental, not core. Remove only with explicit target review.
6. [-] **Cleanup after replacements** — the 239-byte verification artifact is removed;
   inventories, manifests, hashes, Kiwix, and Qdrant are reconciled. The remaining
   cleanup gate is the physically disconnected/reboot acceptance test.

Do not disturb LM Studio during this work unless the user explicitly releases it from
the separate project. Content and UI validation do not require local generation.

## A. Correct the current installation and records

- [x] Audit live Docker, Kiwix, Kolibri, map, RAG, LM Studio, and download-job state.
- [x] Confirm no NOMAD download jobs are active or queued.
- [x] Reconcile `RESOURCE_MANIFEST.csv` with files actually installed in Kiwix, maps, and Kolibri.
- [x] Update `NOMAD_SETUP_REPORT.md` so completed downloads are no longer described as pending.
- [x] Replace the invalid eCFR access-denied capture with a genuine official FRS regulation source.
- [ ] Record hashes/validation evidence for the large installed ZIM and PMTiles resources where practical.
- [x] Perform the content-level usefulness/completeness audit tracked in `CONTENT_AUDIT.md`; all 74 inventory rows now have evidence-based roles/statuses, with final hands-on media playback reserved for offline acceptance.
- [x] LibreTexts Medicine and zimgit-medicine were replaced and removed transactionally;
  the complete evidence is recorded in the replacement manifests and audit JSON files.
- [x] Audit Gardening Stack Exchange against coherent gardening and plant references; Gardenology is installed/validated as the encyclopedia and Q&A is labeled supplemental.

## B. Emergency knowledge base and citations

- [x] Inventory exactly which resources are currently indexed in Qdrant.
- [x] Import the original authoritative emergency set through NOMAD's supported RAG path; after cleanup 43 user documents / 3,921 chunks remain indexed and 82 validated replacements are directly browsable in Manual mode.
- [ ] Index the highest-value authoritative ZIMs that are not already indexed.
- [ ] Avoid duplicate embeddings for sources already present.
- [x] Test retrieval with medical, water, winter outage, earthquake, and Rexburg hazard questions.
- [x] Verify that each answer cites a real stored source and inspect the corresponding stored passages.
- [x] Document the limitation that NOMAD does not preserve PDF page numbers.

## C. Regional emergency coverage

- [x] Audit official material for West Jordan/Riverton and Salt Lake Valley; add the 2025 Salt Lake County MJHMP.
- [x] Audit official material for Davis and Weber counties; add the current published Davis plan and Weber 2024 plan.
- [x] Audit official material for Marysvale and Piute County; add the Six County 2020 plan plus state hazard material.
- [x] Audit official material for Rexburg and Madison County; add the Madison County 2019 plan and Idaho 2023 state plan.
- [~] Add official corridor, flood, wildfire, landslide, earthquake, liquefaction,
  and evacuation-planning documents that are genuinely downloadable. Added and
  hash-validated the official Idaho highway map, ITD I-15 eastern Idaho corridor
  fact sheet, and 2026 Davis County wildfire evacuation presentation. They remain
  live Document Library as browseable `pending_decision` originals. Manual sync
  queued zero embedding jobs, so LM Studio remained untouched and indexing is
  deliberately deferred.
- [x] Label live-only road, fire, evacuation, volcano, weather, outbreak, recall,
  and contamination information clearly on the offline library and map surfaces.

## D. Equipment library

- [x] Jackery Explorer 600 v2 JE-600A packet.
- [x] Lenovo Legion Go 8APU1 packet — complete 40-page Lenovo-authored user guide,
  PSREF, and sourced offline-power card installed; incomplete capture removed.
- [x] Midland ER10VP packet.
- [x] General butane, battery, generator, carbon-monoxide, and equipment-maintenance guidance.
- [!] Exact butane stove manual — model confirmation required.
- [!] Motorola Talkabout T475 manual — ownership confirmation required.
- [!] ZOUPW solar panel manual — F100W versus F110W confirmation required.
- [!] Power-bank manuals — model numbers required.
- [!] Flashlight manual — model number required.
- [!] Backpack and first-aid-kit manuals — ownership/model confirmation required.

## E. LM Studio and power-aware AI

- [x] Investigate how NOMAD discovers LM Studio models and how loading/unloading currently works.
- [x] At user request, unload NOMAD's laptop-local Qwen/Nomic models while leaving the separate-project LM Link model untouched.
- [x] Pause launcher LM Studio integration: Start/Stop no longer changes the server or any models, and model buttons are disabled.
- [x] Show locally installed models separately from models available through LM Link/remote machines.
- [x] Add safe optional load/unload controls if NOMAD's supported integration permits them.
- [x] Define and functionally test a local-only emergency fallback model (`qwen/qwen3-4b-2507`).
- [ ] Test the local fallback model with RAG while completely offline.
- [ ] Measure or estimate idle and generation power use.

## F. Launcher and Windows usability

- [x] Diagnose the generic pinned-taskbar icon: the project had no executable or form icon configured.
- [x] Add Project NOMAD's official application mark and rebuild both launcher executables.
- [x] Verify the rebuilt executable exposes a 32x32 shell icon and document taskbar re-pinning.
- [ ] Verify Start, Open, status, and Stop Everything after a Windows reboot.
- [ ] Decide whether an optional login/startup shortcut is desirable.

## G. Maps and navigation

- [x] USA, Canada, and Mexico vector coverage is valid through zoom 15 in sampled
  target areas. The original extract's Vancouver/Burnaby gap is repaired by the
  verified British Columbia zoom-15 overlay.
- [x] Confirm separate Mountain-region download is redundant; no active duplicate job exists.
- [x] Programmatically retrieve offline zoom-15 tiles for West Jordan, Riverton, Ogden, Marysvale, Rexburg, both travel corridors, representative Canada, and Mexico locations; final visual disconnected test remains in section H.
- [x] Fix country extracts to retain original land geometry alongside the coastal
  buffer; regression test passes. Full-country extraction then exposed intermittent
  CDN connection resets, so the completed British Columbia overlay was verified with
  exact Vancouver, Burnaby, Victoria, and Kelowna zoom-15 tile reads. The original
  archive remains installed for continental coverage.
- [x] Investigate offline routing feasibility. NOMAD already has persistent pins,
  coordinate entry, MapLibre route-display capability, and local APIs, but PMTiles
  are rendering tiles rather than a connected routing graph. A separate local routing
  engine and separate address index are therefore required. Valhalla is the preferred
  engine because its run-time costing supports driving/walking/cycling, alternatives,
  turn instructions, and preferences for highways, tolls, ferries, tracks, and
  unpaved roads without rebuilding a profile for each request.
- [ ] **Routing phase 1 — bounded proof of concept (no large download without
  approval):** preflight current free space and estimate the Utah + Idaho OSM PBF,
  Valhalla graph, temporary build space, container image, and update headroom. Keep
  the installed library under the requested 100 GB ceiling and preserve enough free
  disk for Windows/Docker operation.
- [ ] Add Valhalla as an optional, local-only Docker service with pinned image/version,
  persistent routing-data storage, health check, restart policy, and a documented
  start/stop path through the NOMAD launcher. It must not require internet after its
  data build and must not run the GPU or LM Studio.
- [ ] Build and integrity-check a Utah + Idaho routing graph first. Confirm routes for
  West Jordan/Riverton to Marysvale and Salt Lake Valley to Rexburg, including a route
  that crosses the state boundary. Record source date, PBF bytes, graph bytes, build
  duration, peak RAM, and idle/query power impact before expanding coverage.
- [ ] Add validated backend proxy endpoints for route requests and routing health.
  Limit coordinates, waypoint counts, route length, timeouts, and accepted options;
  keep the routing container private to NOMAD's Docker network rather than exposing
  it directly to the LAN.
- [ ] Add a map route planner that can choose saved pins, clicked points, or entered
  coordinates as start/destination/waypoints. Draw the selected and alternate routes,
  fit the map to the result, and show distance, estimated time, and a readable
  turn-by-turn list.
- [ ] Add route modes and controls: driving, walking, cycling; fastest versus shorter;
  avoid/prefer highways; avoid tolls, ferries, unpaved roads, and tracks. Label
  avoidance settings as preferences rather than guarantees and explain when no route
  is available within the installed graph.
- [x] Add the truthful route-planner UI foundation: saved-pin or validated-coordinate
  endpoints, endpoint swapping, driving/walking/cycling modes, fastest/shorter and
  highway/toll preferences, and durable browser-local draft state. Route calculation
  remains visibly disabled until the separate local routing graph/service is installed;
  clicked points, waypoints, results, directions, and additional avoidances remain unfinished.
- [ ] Make routes useful during outages: save named routes and route settings locally,
  export/print directions and GPX where practical, preserve the last successful route,
  and display the routing-data snapshot date. Never imply that the result includes
  live closures, evacuation orders, traffic, fires, weather, or road damage.
- [ ] **Routing phase 2 — measured regional expansion:** after the Utah/Idaho proof
  passes, preflight a western-state graph that covers practical alternate corridors.
  Show exact download/build/storage estimates and obtain approval before expanding.
  Do not build all of North America while the current 100 GB ceiling applies: current
  raw OSM extracts alone are about 18.2 GB before routing graphs and temporary files.
- [ ] **Address-search phase 3:** evaluate a prebuilt regional Photon index first for
  autocomplete, typo tolerance, forward address search, and reverse geocoding. Measure
  its compressed, installed, update, RAM, and idle-power costs on this 16 GB laptop.
  If a suitable regional index is unavailable or too large, compare a Utah/Idaho
  Nominatim import with a deliberately limited local place/street index; do not add a
  full-country geocoder by assumption.
- [ ] Integrate address suggestions only after offline tests prove that house numbers,
  streets, cities, landmarks, misspellings, duplicate place names, and out-of-coverage
  queries behave honestly. Let a selected result become a pin or route endpoint, and
  retain coordinate/pin routing as the reliable fallback when an address is absent.
- [ ] Add automated tests for request validation, routing-option translation, route
  geometry, unavailable-service behavior, no-route/out-of-region responses, and stale
  snapshot warnings. Then perform a physically disconnected UI test, Windows reboot,
  launcher Start/Stop test, and realistic corridor/avoid-highway comparisons before
  marking routing dependable.
- [ ] Keep satellite imagery optional; NOMAD's current map interface has no satellite layer.

## H. Final offline acceptance test

- [ ] Restart Windows and launch NOMAD without internet access.
- [ ] Open NOMAD, Kiwix, Kolibri, maps, and authoritative source documents.
- [x] Run the five realistic emergency test questions and evaluate accuracy/citations; citations worked, but generated answers failed safety acceptance.
- [—] Local-only LM Studio outage test deferred while LM Studio is reserved for a separate project; NOMAD currently operates without AI.
- [ ] Test iPhone LAN access only if restricted LAN exposure is approved.
- [ ] Measure power use in library-only, small-model, and large-model modes.
- [x] Enable Kolibri guest access and route the NOMAD Education Platform tile directly to anonymous Learn mode.

## I. UI investigation and redesign concepts (after content stabilizes)

- [x] Audit the current NOMAD UI and its safety-critical workflows.
- [x] Review high-quality offline knowledge, document-search, mapping, and local-AI interfaces.
- [x] Produce six concrete UI concepts as standalone offline HTML previews in `ui-examples/`, with a rendered and verified comparison index.
- [x] Compare accessibility, emergency readability, search, citations, offline-state visibility, and power controls.
- [x] User selected Style 2 (Night Operations) plus Style 3 (Field Manual) as the visual direction.
- [x] Implement and deploy the hybrid UI in a local v1.35.1 Docker image.
- [x] Make Night Operations the default for new browsers while preserving the Day Ops toggle and stored user preference.
- [x] Add Field Manual document surfaces and source-record styling; render-test dark-mode document contrast.
- [x] Remove the actionable AI tile and floating chat control while NOMAD AI is paused; show a non-interactive paused status card instead.
- [x] Verify the live home, maps, docs, Kiwix, and Kolibri endpoints after deployment.
- [x] Add and deploy a model-independent Browse Library: need-based categories,
  honest source-format notes, common-search shortcuts, real offline Kiwix cover/
  article/media metadata, and 13 useful document sets with direct original-file access.
- [x] Perform hands-on user review and collect any layout/content refinements; the
  Browse Library was reviewed and accepted on 2026-11-19.
- [x] After content acceptance, inspect the presentation of every installed resource
  in its real offline reader. Improve collection landing pages, backgrounds,
  typography, spacing, chapter navigation, image treatment, and quick-reference
  formatting to match Night Operations + Field Manual where technically safe. All
  18 Kiwix entry pages return 200; seven representative reader families were
  render-inspected; NOMAD now labels reader/visual formats and repairs compact
  Wikipedia's poor default entry point. Original source CSS remains unchanged. The
  audit concluded that blanket reader CSS injection would be brittle and could obscure
  authoritative warnings or diagrams, so the maintainable presentation pass is complete.
- [x] Document which presentation layers NOMAD controls directly versus Kiwix,
  Kolibri, embedded PDFs, and archived-site CSS; prefer maintainable theme adapters
  and per-source fixes over modifying original authoritative content. See
  `READER_PRESENTATION_AUDIT.md`.

## K. Public, reproducible personal-project fork

- [x] Define the emergency-family Kiwix selection in a machine-readable profile with exact filenames, URLs, sizes, and rationale.
- [x] Verify/download the profile archives through the official Kiwix service; Gardenology was added after the content audit exposed the Q&A-only gardening gap. Two rejected medical ZIMs were later removed, leaving 18 accepted/supplemental archives.
- [x] Add a dependency-free installer that previews, size-gates, queues, and monitors missing ZIMs through NOMAD's supported API.
- [x] Document storage tradeoffs, map/Kolibri setup, safety boundaries, and content that is intentionally excluded from Git.
- [x] Update the main README to distinguish this family emergency profile from upstream Project NOMAD.
- [x] Rebase the public profile branch onto upstream commit `f633b36` so current map, download, catalog, and security fixes are included.
- [x] Run a clean production build, TypeScript typecheck, and focused sparse-PMTiles progress tests on the rebased branch.
- [x] Finish and validate the illustrated Wikibooks and Best of Wikipedia upgrades; verify published SHA-256 hashes, image/detail metadata, local serving, and removal of the two superseded Wikipedia archives.
- [x] Audit the public diff for credentials, personal paths, oversized payloads, and source/licensing concerns.
- [!] Current upstream's production dependency tree reports 60 npm advisories (3 critical, 21 high); exploitability in NOMAD has not been triaged. Keep the service LAN-only and do not apply `npm audit fix --force` without compatibility testing.
- [x] Publish the reviewed work to the public GitHub fork at `https://github.com/GreySkrene/project-nomad`.

## J. Resumable checkpoint — 2026-11-19 America/Denver

- [x] No NOMAD download jobs are active or queued; no duplicate map jobs needed cancellation.
- [x] Continental map is detailed at all primary Utah/Idaho/Mexico samples; the
  Vancouver/Burnaby defect found on 2026-11-19 is repaired by the verified British
  Columbia zoom-15 overlay.
- [x] Seven regional plans were downloaded, PDF-signature/EOF checked, SHA-256 recorded, added to `RESOURCE_MANIFEST.csv`, and indexed.
- [x] After cleanup the indexed user-document set contains 43 files and 3,921 chunks; 82 validated replacements are pending a Manual decision; active jobs: 0.
- [x] The accidental `robots.txt` upload and its vector were removed through NOMAD's API.
- [x] RAG failure root cause fixed: LM Studio now listens on the private WSL adapter and local Nomic Embed Text v1.5 is loaded; a direct request returned a 768-dimension vector.
- [x] Rebuilt launcher no longer manages LM Studio at all; Start/Stop leave both local and LM Link models untouched.
- [x] Rebuilt `NOMAD Launcher.exe` and `NOMAD Launcher Updated.exe` are 125,952 bytes and passed a responsive-launch smoke test.
- [x] Updated `NOMAD_SETUP_REPORT.md` with current storage/download/index state.
- [x] Ran the five retrieval/citation test questions and inspected cited Qdrant source passages.
- [!] Safety decision: deterministic source search, vetted quick references, and original-file access are the emergency core; AI is optional and must be verified.
- [x] Completed the first three replacement/removal transactions at the top of this
  plan, including offline UI/hash checks before deletion.
- [x] Fixed and deployed the Manual-ingest sync defect: a sync no longer silently
  queues bundled documentation while reporting zero queued files. Live regression:
  zero active jobs before and after sync, `filesQueued: 0`.
- [x] Fixed repeated orphan cleanup caused by zero-count Qdrant facet tombstones;
  two consecutive live syncs now report clean/in-sync with no jobs.
- [x] Added a dashboard Document Library entry so stored originals remain directly
  browsable/downloadable while AI and LM Studio are paused.
- [x] Replaced the search-only information lookup with Browse + Search views. Live
  verification: 18/18 Kiwix archives expose titles, covers, and media metadata;
  125 saved documents are available to the browse UI; original-file download returned 200.
- [x] Audited the real entry page for all 18 installed Kiwix archives (18/18 HTTP
  200), visually checked seven representative reader families, added reader-format
  and visual-coverage cues, and repaired the compact Wikipedia browse landing page.
- [x] Fixed the unsafe single-archive title-search default. Search now queries every
  installed Kiwix archive, ranks literal medical/title matches first, limits source
  crowding, labels each result's source, and survives an individual archive failure.
  A headless live regression for `splint` returned WikiMed's `Splint (medical)` and
  MedlinePlus's `How to make a splint` instead of the previous unrelated Best-of-
  Wikipedia names. Ten focused tests, TypeScript, formatting, production build,
  health check, and live browser behavior passed.
- [x] Treat basic emergency-topic discoverability as a release gate, not merely file
  presence. The first regression topic, `splint`, is independently covered by
  MedlinePlus, WikiMed, complete compact Wikipedia, and Wikibooks. Both exact-title
  and task-oriented results are now reachable from the default search. Apply the same
  content-plus-discoverability check to CPR, choking, bleeding, burns, fractures,
  shock, wound care, water purification, carbon monoxide, and emergency heat during
  the final disconnected acceptance test.
- [ ] After replacements: confirm exact models for equipment manuals still marked
  `[!]`, then perform reboot and physically disconnected acceptance tests.
- [x] Investigated the current UI, produced six redesign concepts, and recorded the user's Style 2 + Style 3 selection.
- [x] 2026-11-16: deployed the selected Night Operations + Field Manual hybrid and verified the production build and live endpoints.
