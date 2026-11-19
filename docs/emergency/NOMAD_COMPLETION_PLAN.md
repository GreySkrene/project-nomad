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

1. [ ] **LibreTexts Medicine** — source and validate a complete open anatomy and
   physiology reference that actually contains its chapter bodies, figures, and
   navigation. Re-test the Unit 1 Chemical, Cellular, and Tissue chapters offline.
   Once the replacement passes, remove
   `libretexts.org_en_med_2025-01.zim` (1,192,567,339 bytes) and its catalog/profile
   entry. Do not present the current archive as an acceptable medical textbook.
2. [ ] **OpenZIM Medical Library (`zimgit-medicine`)** — replace its blank reader and
   mixed outdated/unverified works with authoritative, readable sources. WikiMed,
   MedlinePlus, NHS Medicines, CDC, and LibrePathology already cover portions of the
   need but do not by themselves prove equivalent coverage. After a gap comparison
   and offline validation, remove `zimgit-medicine_en_2024-08.zim` (70,179,585 bytes).
3. [ ] **Lenovo Legion Go** — obtain a genuinely complete official offline manual.
   Verify model applicability, page/content completeness, and charging/power sections;
   then replace the six-page interactive landing-page capture and re-index the PDF.
4. [ ] **Canada detailed map repair** — build a corrected Canada overlay or continental
   replacement using the fixed extraction geometry. Verify zoom-15 Vancouver and
   Burnaby tiles plus the existing Utah/Idaho/Mexico samples before removing the
   current 33,788,916,131-byte map. This is a large download and requires approval.
5. [ ] **Supplemental/noise review** — decide whether Gardening Stack Exchange and the
   other Q&A archives earn their storage after coherent replacements are in place.
   They are labeled supplemental, not core. Remove only with explicit target review.
6. [ ] **Cleanup after replacements** — remove the disabled 239-byte RAG verification
   artifact, regenerate `CONTENT_INVENTORY.csv` and `RESOURCE_MANIFEST.csv`, refresh
   hashes, reconcile Kiwix/Qdrant, and repeat the disconnected acceptance tests.

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
- [!] LibreTexts Medicine is proven defective; replacement/removal is queued in the
  resume section above.
- [x] Audit Gardening Stack Exchange against coherent gardening and plant references; Gardenology is installed/validated as the encyclopedia and Q&A is labeled supplemental.

## B. Emergency knowledge base and citations

- [x] Inventory exactly which resources are currently indexed in Qdrant.
- [x] Import the local authoritative emergency PDFs and guides through NOMAD's supported RAG path (44 intentional files indexed; 3,922 chunks; zero active or failed jobs).
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
- [ ] Add official corridor, flood, wildfire, landslide, earthquake, liquefaction, and evacuation-planning documents that are genuinely downloadable.
- [ ] Label live-only road, fire, evacuation, volcano, and weather information clearly.

## D. Equipment library

- [x] Jackery Explorer 600 v2 JE-600A packet.
- [!] Lenovo Legion Go 8APU1 packet — PSREF and sourced offline-power card are useful, but the saved six-page "user guide" is only an interactive landing-page capture and needs replacement.
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

- [!] USA, Canada, and Mexico vector map is valid and detailed through zoom 15 in sampled target areas, but Vancouver/Burnaby detailed tiles are missing from the existing extract.
- [x] Confirm separate Mountain-region download is redundant; no active duplicate job exists.
- [x] Programmatically retrieve offline zoom-15 tiles for West Jordan, Riverton, Ogden, Marysvale, Rexburg, both travel corridors, representative Canada, and Mexico locations; final visual disconnected test remains in section H.
- [x] Fix future country extracts to retain original land geometry alongside the coastal buffer; regression test passes. Existing archive still needs a corrected Canada overlay/replacement.
- [ ] Select a separate offline routing/address-search application if desired.
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
- [ ] Perform hands-on user review and collect any layout/content refinements.

## K. Public, reproducible personal-project fork

- [x] Define the emergency-family Kiwix selection in a machine-readable profile with exact filenames, URLs, sizes, and rationale.
- [x] Verify/download all 20 current profile archives through the official Kiwix service; Gardenology was added after the content audit exposed the Q&A-only gardening gap.
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
- [!] Continental map is detailed at all primary Utah/Idaho/Mexico samples, but the 2026-11-19 audit disproved full Canadian completeness at Vancouver/Burnaby; future extraction code is fixed, existing data is not yet repaired.
- [x] Seven regional plans were downloaded, PDF-signature/EOF checked, SHA-256 recorded, added to `RESOURCE_MANIFEST.csv`, and indexed.
- [x] `official-emergency` contains 44 intentional indexed files and 3,922 chunks; active jobs: 0; failed jobs: 0.
- [x] The accidental `robots.txt` upload and its vector were removed through NOMAD's API.
- [x] RAG failure root cause fixed: LM Studio now listens on the private WSL adapter and local Nomic Embed Text v1.5 is loaded; a direct request returned a 768-dimension vector.
- [x] Rebuilt launcher no longer manages LM Studio at all; Start/Stop leave both local and LM Link models untouched.
- [x] Rebuilt `NOMAD Launcher.exe` and `NOMAD Launcher Updated.exe` are 125,952 bytes and passed a responsive-launch smoke test.
- [x] Updated `NOMAD_SETUP_REPORT.md` with current storage/download/index state.
- [x] Ran the five retrieval/citation test questions and inspected cited Qdrant source passages.
- [!] Safety decision: deterministic source search, vetted quick references, and original-file access are the emergency core; AI is optional and must be verified.
- [ ] Next: execute the replacement/removal queue at the top of this plan, beginning
  with LibreTexts Medicine and `zimgit-medicine`.
- [ ] After replacements: confirm exact models for equipment manuals still marked
  `[!]`, then perform reboot and physically disconnected acceptance tests.
- [x] Investigated the current UI, produced six redesign concepts, and recorded the user's Style 2 + Style 3 selection.
- [x] 2026-11-16: deployed the selected Night Operations + Field Manual hybrid and verified the production build and live endpoints.
