# Project NOMAD Offline Emergency System — Setup Report

Report date: 2026-11-25 (America/Denver)
Status: core services and content are installed; safety acceptance and fully disconnected/reboot testing are not complete

Large-archive integrity baseline: all 18 installed ZIMs and three PMTiles archives
have exact sizes and full-file SHA-256 values in `INSTALLED_ARCHIVE_HASHES.csv`
(verified 2026-11-23; 70.84 GiB total).

## 1. Host and installation

| Item | Verified value |
|---|---|
| Laptop | Lenovo Legion 82UG |
| Operating system | Windows 11 Home, build 26200 |
| Processor | AMD Ryzen 9 6900HX, 8 cores / 16 threads |
| Memory | 16 GB DDR5 |
| Graphics | AMD Radeon RX 6800S; Windows reported about 4 GB dedicated VRAM |
| Project NOMAD | v1.35.1, commit `54ee30a44902e5c252b477f8685c26ec3064ab72` |
| Linux/container host | Ubuntu 24.04.5 LTS under WSL2; Docker Engine 29.9.3; Compose v5.7.0 |
| Local AI host | Windows-native LM Studio, CLI 1.3.3; NOMAD integration paused at user request |

NOMAD is reached at `http://localhost:8080`. On 2026-11-13 its health endpoint returned `{"status":"ok"}` and its LM Studio remote-status endpoint returned `configured: true, connected: true`.

## 2. Installed services

| Component | Version/image | Verified state | Purpose |
|---|---|---|---|
| NOMAD admin | Local UI build based on Project NOMAD v1.35.1 | Healthy | Main interface and service control |
| MySQL | 8.0 container | Healthy | NOMAD database |
| Redis | 7-alpine container | Healthy | Queue/cache |
| Qdrant | v1.16 container | Running; RAG health online | Vector retrieval |
| Kiwix Server | 3.8.1 | Running on port 8090 | Offline ZIM libraries |
| Kolibri Gen 2 | 0.19.4 | Running on ports 8310/8311; guest access enabled | Offline education without a required learner login |
| FlatNotes | 5.5.4 | Running on port 8200 | Offline notes |
| Offline maps | Protomaps/PMTiles | Installed | Pan/zoom vector map |
| Offline routing | Valhalla 3.9.1, immutable image digest | Healthy; private Docker port only | Utah/Idaho driving, walking, and cycling routes |
| LM Studio | Windows port 1234 | NOMAD integration paused; not touched during current work | Optional local and LM Link inference/embeddings |

All eleven NOMAD containers, including the private routing service, were running when
checked. NOMAD admin and routing reported healthy; the remaining previously installed
services retained their verified state. Kiwix 3.8.2, Kolibri 0.19.5, and FlatNotes
5.5.5 were shown as available updates; they have not been applied or compatibility-tested.

The 2026-11-23 production dependency hardening pass reduced `npm audit --omit=dev`
from 59 package rows (3 critical and 20 high) to 20 (0 critical and 2 high), without
using `npm audit fix --force`. MapLibre 6.19.0, Sharp 0.35.5, libzim 4.7.0, tar 7.5.23,
systeminformation 5.33.24, and the other pinned fixes passed the Linux image build and
live checks. The remaining paired Lucid/Faker high finding requires a coordinated
Node 24/Core 7/Assembler 8/Lucid 22/Auth 10/Session 8 migration; a Lucid-only upgrade
is incompatible with the tested Node 22/Core 6 runtime. Details are in
`DEPENDENCY_SECURITY_AUDIT.md`.

On 2026-11-25 a repeatable live search audit queried all 18 installed Kiwix libraries
for CPR, choking, bleeding, burns, splints, shock, wound care, water, carbon-monoxide
poisoning, and power outages. All 18 libraries responded and all ten gates surfaced an
accepted emergency source. Intent-aware ranking now places WikiMed/MedlinePlus ahead
of ambiguous general titles for clear medical queries and Ready.gov/CDC ahead for clear
civil-emergency queries. The deployed regressions include WikiMed's *Splint (medical)*
and *Shock (circulatory)* first, Ready.gov first for water and power outages, and no
change to literal ranking for unrelated terms.

## 3. Storage and downloaded content

Measured logical storage under `/opt/project-nomad/storage` is approximately **80.4 GiB**, below the requested 100 GB ceiling:

| Content | Measured size/state |
|---|---:|
| Kiwix ZIM libraries | 18 files; 39,637,891,458 bytes (36.92 GiB) |
| Maps | about 34 GiB, including the 2.44 GiB British Columbia repair overlay |
| Kolibri Gen 2 | about 6.3 GiB |
| RAG uploads / directly browsable documents | about 905 MiB after validated replacements |
| Utah/Idaho routing source, graph, and support databases | 1,500,639,490 bytes (about 1.40 GiB) |

The detailed continental PMTiles file is 33,788,916,131 bytes and contains USA, Canada, and Mexico vector data through zoom 15. The audit retrieved detailed tiles at every primary Utah/Idaho/Mexico sample, but confirmed missing high-zoom coverage in Vancouver and Burnaby. The extraction geometry is fixed. Repeated full-Canada repair attempts encountered source-CDN connection resets, so the known gap was repaired with a smaller 2,617,262,221-byte British Columbia overlay from the 2026-11-18 source build. PMTiles verification, live HTTP range serving, style integration, and exact zoom-15 reads for Vancouver, Burnaby, Victoria, and Kelowna passed. There are no active download jobs. These are vector maps, not satellite imagery, and they do not provide live closures or address search. A separate local Valhalla graph now provides Utah/Idaho turn-by-turn routes from pins, map clicks, or coordinates.

Kolibri contains selected PhET, Blockly Games, School of Thought, Khan Academy, and Sikana material. Physical-file checks found zero missing selected files in four channels. Khan is partial: 1,455 nodes are available and 26 of 11,612 attached file records are unavailable; all 26 are subtitles or thumbnails. Sikana's 505-node practical subset includes navigation, cooking, insulation/energy, solar, basic electricity, DIY, agriculture, and gardening.

No NOMAD download jobs were active or queued at the verified checkpoint. No redundant Mountain-region map job remained to cancel. The superseded no-picture Best of Wikipedia archive and tiny Top 100 mini archive were removed only after the illustrated replacement passed metadata, HTTP-serving, and checksum validation.

## 4. Offline libraries

Kiwix contains 18 installed ZIM files, including compact complete Wikipedia, illustrated Best of Wikipedia, Wikipedia Medicine/WikiMed, MedlinePlus, NHS Medicines, CDC travel health, military medicine, LibrePathology, iFixit, Ready.gov, illustrated Wikibooks, Gardenology, and selected repair, cooking, Q&A, and vehicle-maintenance references. Installed Kiwix content totals 39,637,891,458 bytes. The defective LibreTexts and zimgit-medicine archives were removed only after their replacements passed content, offline UI, and hash validation. `CONTENT_AUDIT.md` records the role and limitations of every remaining archive.

The two illustrated upgrades were independently validated on 2026-11-18. Kiwix catalog metadata reports `_pictures:yes` and `_details:yes`; each local content route returns a valid redirect; and the locally computed SHA-256 values match Kiwix's published hashes:

- Best of Wikipedia maxi: `1b455d589e026d541ad6917ad1911b787448424a4d455e0f1a9531f065839c09`
- Wikibooks maxi: `835014cde2c385f80a6388847fb8962429966a3a64a03b58552f1684cc83e7c8`

NOMAD provides one ranked title-search surface across all installed Kiwix archives,
and Kiwix articles now stay inside a persistent NOMAD reader with the same search
available. Kolibri, saved PDF/Markdown documents, NOMAD RAG, and maps still have
separate indexes; there is no universal search across all content types.

The Browse Library now labels each article collection as Emergency core, Practical
reference, Background reference, or Supplemental. Stack Exchange archives are visibly
supplemental community Q&A rather than being presented as coherent emergency manuals.

## 5. Official emergency knowledge base

The existing indexed user-document set now contains **43 files**, **3,921 chunks**, and **752,215,160 source bytes** after the incomplete Legion capture and the 239-byte verification artifact were deleted. Eighty-two validated replacements are directly browsable and await a Manual indexing decision; no embedding was attempted while LM Studio is reserved. The indexed set includes official medical/first-aid, water, radiological, food/power, generator/CO, radio, equipment, Utah, Idaho, county, earthquake, and Yellowstone documents.

Seven regional plans were validated as PDFs, hashed, manifested, and indexed:

- Salt Lake County Multi-Jurisdictional Hazard Mitigation Plan (2025)
- Weber County Pre-Disaster Mitigation Plan (2024)
- Davis County plan (adopted/current published version, 2022)
- Six County Region plan covering Piute County/Marysvale (2020)
- Utah Enhanced State Hazard Mitigation Plan (2024)
- Madison County Multi-Hazard Mitigation Plan (2019; adopted 2020)
- Idaho State Hazard Mitigation Plan (2023)

Original SHA-256 values are in `resources/official/SHA256SUMS.txt`. The invalid access-denied eCFR capture was quarantined and replaced by a validated official FRS XML snapshot plus an indexed family-radio quick reference.

### 5A. Medical replacement transaction — 2026-11-19

Three rejected/incomplete resources were replaced without using LM Studio:

- Oregon State's 2025 *Anatomy & Physiology 2e* (133,118,779 bytes; 2,070
  pages) replaces the defective LibreTexts reader. Chemical, Cellular, and Tissue
  chapters and figure content are substantive. It remains browse-only because the
  source's current terms prohibit LLM ingestion without permission.
- Eighty official Hesperian/WHO PDFs (54,473,646 bytes; 1,552 pages) replace the
  blank mixed-content zimgit medical bundle. All files and all pages were extraction-
  audited. Hesperian works are labeled austere supplements; WHO/current official
  clinical guidance takes precedence.
- A complete Lenovo-authored 40-page Legion Go 8APU1 guide replaces the six-page
  interactive landing-page capture. Lenovo's support record identifies the guide;
  the copy was retrieved from a mirror after the official download blocked automation.

NOMAD's own file-download endpoint returned exact SHA-256 matches for the anatomy
text, Legion guide, a first-aid chapter, and WHO quick cards. Only then were the two
defective ZIMs (1,262,746,924 bytes total) and incomplete Legion capture removed.
The 80-file source/hash/license ledger is `MEDICAL_REPLACEMENT_FILES.csv`.

The replacement files are visible in the Document Library with Manual ingest state;
no embedding model is required to open or download them. A sync defect was also fixed:
bundled NOMAD docs previously bypassed Manual mode and silently queued jobs while the
API reported `filesQueued: 0`. After deploying the correction, a live sync showed zero
active jobs before and after and reported `filesQueued: 0`. LM Studio was not started,
queried, loaded, or unloaded during this work.

Cleanup also exposed Qdrant facet tombstones: deleted sources remained as facet labels
with a count of zero, causing NOMAD to claim it had purged the same three orphans on
every sync. The scanner now ignores zero-count facet hits and deletion requests wait
for Qdrant completion. Two consecutive live syncs now report simply “already in sync,”
with `filesQueued: 0` and no active jobs.

## 6. Equipment library

Completed and indexed packets:

- Jackery Explorer 600 v2 / JE-600A official manual and quick reference
- Lenovo Legion Go 8APU1 complete 40-page Lenovo-authored user guide, PSREF, and
  offline-power reference; the incomplete six-page capture was removed
- Midland ER10VP official material and quick reference
- General official butane, battery, generator, carbon-monoxide, and maintenance guidance

Exact manuals remain blocked on model/ownership confirmation for the butane stove, Motorola T475, ZOUPW F100W versus F110W solar panel, power banks, flashlight, backpack, and first-aid kit.

## 7. LM Studio and launcher

Locally installed models include Qwen3 4B/8B variants, Gemma 4 variants, Granite 4.1 8B, Qwen VL, and Nomic Embed Text v1.5. LM Link also exposes models on two larger peers when those machines are available.

The earlier local RAG import failure was traced to two verified conditions: LM Studio listened only on Windows loopback, which the WSL container could not reach, and the installed Nomic model was not loaded under NOMAD's expected identifier. A direct embedding request later returned a 768-dimension vector, and the original queue completed. On 2026-11-14, NOMAD's LM Studio integration was deliberately paused so LM Studio can be used by a separate project. The NOMAD-local Qwen and Nomic models were unloaded; the user's remote LM Link model was left untouched.

`launcher/NOMAD Launcher.exe` provides Start, Open, status, and Stop Everything. It keeps WSL alive while open. Its LM Studio controls are disabled, and Start/Stop explicitly leave the LM Studio server and every local or LM Link model untouched. The rebuilt executable has the NOMAD application icon. Windows may require unpinning and re-pinning the taskbar item to refresh the cached icon.

## 8. AI/RAG safety acceptance

The five fixed emergency queries completed on local Qwen models and returned real stored-file citations. The generated answers did **not** pass safety acceptance. Verified examples include:

- Qwen3 4B changed FEMA's “battery-powered lights” into nonexistent “battery-powered heaters.”
- Qwen3 4B substituted infant chest thrusts for the indexed over-one-year child choking procedure.
- Qwen3 8B restored abdominal thrusts but added unsupported hands-only CPR and a conflicting delayed-call condition.
- The water answer conflated the EPA's different bleach doses for 6% and 8.25% products.
- Rexburg answers missed indexed Madison County volcanic-geology passages and made unsupported hazard/location claims.

The supported `NOMAD.md` prompt was configured with an emergency-answer policy that prohibits invented procedures, numbers, device capabilities, and live-status claims. Retesting proved that prompt instructions alone do not make the small models reliable enough for safety-critical use.

**Current safety decision:** deterministic source search, vetted quick-reference pages, and direct original-file access are the emergency core. AI is currently disabled for NOMAD. Earlier Qwen3 4B and 8B tests remain documented, but neither model is accepted as an authoritative medical or safety system.

NOMAD RAG citations identify the stored title/file/path. PDF page numbers are not
preserved during extraction, so generated/RAG citations still cannot supply a proven
page number. The original-document reader separately tracks the visible PDF page and
can copy a title, page number, and deep link for manual source citations.

## 9. Capability boundaries

| Requirement | Verified behavior |
|---|---|
| Completely offline libraries | Kiwix, Kolibri, maps, source files, and local models are stored locally |
| Universal search | Partial: all installed Kiwix archives share ranked title search and a persistent reader; PDF/Markdown, RAG, Kolibri, and maps remain separate |
| RAG citations | Stored filename/path citations work |
| PDF page citations | Supported in the original-document PDF reader; not recoverable from existing RAG chunks |
| Safety-critical generated answers | Not accepted; source verification required |
| Map pan/zoom | Installed; final disconnected regional visual check pending |
| Map routing/address search | Utah/Idaho calculation is installed for pins, map clicks, coordinates, waypoints, modes, and preferences; address search remains unavailable until a separate offline geocoder is measured and installed |
| Satellite map layer | Not present |
| Live alerts/closures/fires/volcano status | Cannot be supplied by offline data; live verification required |
| Authentication | NOMAD has no built-in authentication; do not expose it to the internet |

## 9A. Local interface upgrade

On 2026-11-16 the selected Night Operations + Field Manual interface was compiled into the local Docker image `project-nomad-local:night-manual-20261116` and assigned only to the `admin` service. The existing MySQL database, Redis, storage mount, Kiwix, Kolibri, maps, Qdrant, FlatNotes, and downloaded content were not replaced.

The upgraded interface provides a compact dark operations header, responsive command tiles, Night Ops as the default for new browsers, a retained Day Ops toggle, paper-style documentation panels, and clearer source-record styling. Because NOMAD AI is paused and did not pass safety acceptance, the dashboard no longer offers an actionable AI tile or floating chat button; it shows a disabled status card instead.

On 2026-11-25 the admin service was upgraded to
`project-nomad-local:library-reader-20261125`. Article cards, ranked title matches,
and Kiwix full-text results now open in a persistent NOMAD reader rather than
replacing the interface. The reader retains source identity, Library navigation, a
live-information warning, original-view access, and ranked/spelling-aware search
across the installed archives. Focused URL/ranking/browse tests passed 17/17, along
with TypeScript, the production build, and the native Docker build. Live Chromium
inspection loaded the real WikiMed `Splint (medicine)` child frame and returned its
article text; the in-reader `splint` query produced four WikiMed results with the
medical article first. A follow-up added a saved-document reader: Markdown uses a
safe Field Manual presentation, and PDFs open through a PDF-only same-origin inline
endpoint inside the same persistent shell. Live checks loaded the real AHA CPR/
choking Markdown guide and the 52,241,264-byte Idaho State Hazard Mitigation Plan.
The PDF endpoint returned `application/pdf`, `inline`, and `SAMEORIGIN`; a non-PDF
returned 415, traversal outside uploads returned 404, and the original download route
remained `attachment` plus `DENY`. A follow-up bundled pinned PDF.js 5.4.296 and
replaced the browser-owned PDF frame with NOMAD page navigation, zoom, deterministic
full-document search, page-deep links, and copyable page citations. The worker is
part of the offline production bundle (1,046,214 bytes). Focused tests passed 12/12,
TypeScript passed, and the production build completed. Live browser QA opened the
17-page Jackery manual at page 3, rendered its PDF canvas, found `solar input` on page
8 despite PDF layout gaps, navigated there, and rewrote the deep link to `page=8`.
The deployed admin image is `project-nomad-local:pdf-reader-20261125`; its rollback
Compose file is `/opt/project-nomad/compose.yml.pre-pdf-reader-20261125`.
Search-result links preserve
the query when opening a saved manual; rendered Markdown/text selects the first
passage and offers Find next. PDF page state is reader-owned but is not retroactively
present in existing RAG chunks. Kolibri is still separate,
and this does not create a universal index across content types. Only the admin
container was recreated; the rollback Compose file is
`/opt/project-nomad/compose.yml.pre-library-reader-20261125`.

The next deployed slice added saved-manual passage search to the same Library Search
tab. It reuses text already present in the local Qdrant knowledge index but performs
deterministic lexical matching only: no LLM, LM Studio, Ollama, or query embedding is
called. It uses AND semantics for multi-word queries, phrase/title boosts, and one
best result per source, with a filename-only fallback if indexed text is unavailable.
Live `solar input` validation searched 43 indexed saved documents and returned the
Explorer 600 v2 quick reference first with its 16–60 V, 10.5 A, 200 W limits in the
excerpt. The endpoint reported a complete (not partial) local index. Kiwix search is
still separate, and sources outside the managed-upload boundary are future work.

Both persistent readers now share device-local Recent and Saved References. The
Library Browse screen shows six entries from each list by default with Show all/less
controls, and saved items can be removed without deleting any source content. Stored links are limited to
the two internal NOMAD reader routes; external or malformed values are discarded.
This feature requires no login, network, model, or server-side profile and therefore
continues to work in the low-power offline workflow.

On 2026-11-19 the same pinned local image was rebuilt with a **Document Library**
dashboard tile. It opens stored source files directly and explicitly states that AI
indexing is optional, so the emergency document workflow remains usable while LM
Studio is reserved for another project. The production build and TypeScript check
passed, and the deployed Manual-ingest sync regression check queued zero jobs.

On 2026-11-23 the Maps page gained a truthful offline route planner. It
stores start/destination choices and route preferences in the browser and can use
saved NOMAD pins, validated coordinates, or direct map clicks. It supports up to
three ordered waypoints and locally saved named route setups, plus the planned
travel modes and avoidance preferences. A pinned private Valhalla 3.9.1 service now
calculates the route, draws it on the map, fits the view, and returns distance, time,
and turn-by-turn maneuvers with the installed snapshot date. The last successful
route survives a browser reload and can be saved as readable directions or a GPX
track. The backend limits
coordinates, waypoints, route span, and request time and does not expose Valhalla to
the host or LAN. Avoidance controls are explicitly preferences: the test route to
Rexburg still required highway segments with `use_highways=0`. The prior Compose file
is retained at `/opt/project-nomad/compose.yml.pre-routing-20261123` for rollback.
Connected browser QA displayed the 258.5-mile Riverton-to-Rexburg route and all 37
maneuvers with no console errors, restored that route after a browser reload, and
produced both `.txt` directions and a `.gpx` track download. The Information Lookup APIs simultaneously returned
18 Kiwix libraries and 158 stored documents; delayed browser QA then rendered all 18
library cards and six visible Supplemental labels.

The 2026-11-23 follow-up traced a missing UI capability to the backend response
normalizer: the request already asked Valhalla for one alternate, and the live engine
returned it, but NOMAD discarded the top-level `alternates` array. The verified
West-Jordan-area-to-Rexburg sample returned a 250.745-mile primary route and a
262.9084-mile alternate. NOMAD now validates and preserves both, displays the
non-selected route as a muted dashed line, lets the user select either summary, and
persists that selection across reloads. Text and GPX exports use the selected route.
A dedicated print view adds route endpoints, mode/preferences, snapshot date, the
no-live-conditions warning, and full turn-by-turn directions without printing the map
application chrome. Seventeen focused routing tests, TypeScript, and the production
Vite/Adonis build passed. Deployed headless-Edge QA selected the alternate, rendered
the paper view from page one, hid the map chrome, generated a 57,456-byte PDF, and
reported no browser console errors. Physically disconnected printing remains part of
final acceptance.

Routing failures are separated by cause. If the private engine is down or returns a
server failure, NOMAD reports a temporary outage with HTTP 503. If Valhalla cannot
attach a point to the installed graph or find a connected path, NOMAD returns HTTP 422
with an explicit Utah/Idaho coverage explanation and suggests checking that points are
near mapped roads or trails or relaxing route preferences. This prevents an engine
outage from looking like bad user input and prevents raw Valhalla wording from implying
nationwide routing coverage.

The deployed regression used a Las Vegas coordinate pair outside the installed graph
and received the expected HTTP 422 local-coverage guidance. A following in-coverage
West Jordan-to-Marysvale request still succeeded with a 181.2968-mile primary route,
one alternate, the 2026-11-23 snapshot label, and `liveConditionsIncluded: false`.
Only `nomad_admin` was recreated for this update; the routing engine and stored content
services remained running.

Address-search preflight found that the official Photon service has no Utah/Idaho or
western-state prebuilt database. The smallest applicable Photon 1.x dump is the whole
USA at 10,615,473,970 compressed bytes, and Photon requires overlapping old/new
databases for safe updates. It was not downloaded. The laptop measured 15.2 GiB RAM,
2.9 GiB currently free, and 165.2 GiB free on C:. The safer next experiment is a
measured Utah-only Nominatim `address` import using the retained 172,200,193-byte PBF,
with the 130,765,499-byte Idaho extract added only after the pilot passes. Exact gates
and sources are in `GEOCODER_PREFLIGHT.md`; address search is still unavailable today.
The root and `source/` PBF names are verified hard links, not duplicate storage; keep
both names because the routing installer and Valhalla entry path intentionally use
them, while a geocoder pilot can reuse the `source/` name.

The production Docker build completed its Vite and TypeScript compilation. Live HTTP checks returned 200 for the home page, maps, documentation, Kiwix, and Kolibri; `/api/health` returned `{"status":"ok"}`. Rendered browser QA was performed for both the dashboard and Field Manual documentation in dark mode. A rollback copy of the prior Compose file is stored at `/opt/project-nomad/compose.yml.pre-night-manual-20261116`.

The local image is intentionally pinned with `pull_policy: never`. A future official NOMAD update may replace or bypass the customized image, so rebuild/review this interface against the new upstream version before changing that pin.

On 2026-11-25 the admin service was upgraded to
`project-nomad-local:truthful-library-20261125`. Saved-document lexical matching now
uses exact normalized words with controlled plural handling, eliminating the live
`splint`/`splinters` false positive without affecting the verified `solar input`,
`boil water`, and `choking` results. The Command Center's Document Library opens the
model-independent library; emergency tools precede education and maintenance tools;
and the global readiness label reflects the live Kiwix service rather than making an
unconditional offline claim. Library inventories now distinguish loading, failed,
retryable, and truly empty states. If a user follows an internal cross-origin Kiwix
link, Save reference is disabled with an explanation and a return-to-tracked-article
control so NOMAD cannot silently store the wrong citation. TypeScript, 13 focused
tests, native production build, Docker production build, live API checks, deliberate
failure-state browser QA, and a real WikiMed internal-navigation check passed. Only
the admin container was recreated; LM Studio and stored-content services were not
touched. Rollback Compose file:
`/opt/project-nomad/compose.yml.pre-truthful-library-20261125`.

The follow-on model-free search deployment is
`project-nomad-local:lexical-library-20261125`. Its resumable builder indexed 85/85
Manual-state PDF originals into 3,667 page/chunk records (7.8 MB on disk) without
changing ingest state or contacting LM Studio. Combined with existing Qdrant text,
the live API reports passage search for 127 of 128 stored originals and title search
for all 128. The graphical `Idaho-Official-Highway-Map.pdf` is the title-only case;
it opens normally for visual use. Live `splint` results include WHO Basic Emergency
Care page 191 and its quick cards page 4, while `cellular level` links to the complete
Oregon State Anatomy & Physiology replacement at page 5. The service was healthy
after the admin-only deployment. Rollback Compose file:
`/opt/project-nomad/compose.yml.pre-lexical-library-20261125`.

The repeatable `npm run audit:emergency-search` release gate now checks both search
surfaces for CPR, choking, bleeding, burns, fractures/splints, shock, wound care,
water purification, carbon monoxide, and emergency heat. Its 2026-11-25 post-index
run passed 10/10: all 18 Kiwix libraries responded, every topic surfaced an accepted
article source and a trusted saved original, and the document endpoint reported no
partial-index condition. This is a discoverability check, not independent validation
of every instruction inside each source.

On the final deployment, the ten saved-document release-gate queries had a measured
median response time of 1.30 seconds and maximum of 1.50 seconds; every response was
complete and reported 127 passage-searchable originals. This favors the existing
bounded index over a more memory-heavy optimization until disconnected testing shows
a real usability problem.

The latest pinned image is `project-nomad-local:search-integrity-20261125`. It adds
the dual-surface release gate, explicit title-only index reporting, and readable
Hesperian split-book labels. The live index recheck identified exactly one title-only
file (`Idaho-Official-Highway-Map.pdf`); a live `splint` query displayed the WHO
source at page 191, *Where There Is No Doctor* part 10 at page 25, and *Where There
Is No Dentist* part 7 at page 28. Rollback Compose file:
`/opt/project-nomad/compose.yml.pre-search-integrity-20261125`.

The new `install/test_offline_readiness.ps1` local-only acceptance harness passed
10/10 in its connected baseline: NOMAD, zero download jobs, 18-archive Kiwix inventory,
Kiwix reader, Kolibri guest learning page, two map archives, the Utah/Idaho routing
snapshot, a real West Jordan-to-Marysvale route, saved-document search, and the WHO
page-191 reader/original path. This is
not yet the required offline proof; rerun the same script only after a Windows reboot
and physical network disconnection. The harness never invokes AI. The final build
left 41.4 GiB free on C:; Docker reported 60.6 GB build cache, 46.81 GB reclaimable.
No cache was pruned.

### Supplemental Q&A storage decision

The 2026-11-23 storage review reconciled the five installed Stack Exchange archives
against their content-level audit rather than their download status. They total
3,705,549,249 bytes (3.45 GiB). Home Improvement, Mechanics, and Cooking remain useful
as clearly labeled secondary troubleshooting sources. Gardening Q&A and Woodworking
Q&A are removal candidates totaling 1,039,754,662 bytes (0.97 GiB): Gardenology now
covers the encyclopedia role much more compactly, and Woodworking had little direct
emergency value. No archive was deleted. Exact paths, rationale, and post-removal
checks are in `SUPPLEMENTAL_STORAGE_REVIEW.md`; explicit target approval remains the
cleanup gate.

Kolibri's supported device setting `allow_guest_access` is enabled. NOMAD's Education Platform tile opens `/en/learn/` directly, bypassing Kolibri's optional sign-in landing page for normal use. The existing Kolibri administrator account was deliberately preserved for future content and facility administration.

## 10. Tests still required

1. Reboot Windows and verify launcher Start, Open, status, and Stop Everything.
2. Physically disconnect networking and open NOMAD, Kiwix, Kolibri, maps, and original documents.
3. Test street-level map rendering in Salt Lake Valley, Davis/Weber, Marysvale/Piute, Rexburg/Madison, and connecting corridors.
4. Confirm local embedding/search with both LM Link peers unavailable.
5. Measure library-only, 4B, and 8B power draw.
6. Repeat the installed route-planner tests after a Windows reboot with networking
   physically disconnected; address search remains a later measured phase.
7. Test restricted iPhone LAN access only after explicit approval; NOMAD has no authentication.

## 10A. Public fork verification

The reproducible emergency-profile branch was rebased onto upstream commit
`f633b36` on 2026-11-18. On that branch:

- `tsc --noEmit` passed;
- the three pure sparse-PMTiles progress tests passed;
- the production Vite/Adonis build completed successfully; and
- the Kiwix installer profile parsed and dry-ran successfully against the live
  NOMAD API.

The final 2026-11-25 broad Windows unit run passed 708 of 721 tests. The 13
failures remain harness/platform-specific: Linux-only `libzim` native-binding
imports, tests requiring a booted/populated Adonis environment, one Windows path
normalization assertion, and one temporary-file lock. These are not counted as a
clean suite pass. The focused search, reader, route, readiness, and dark-contrast
tests pass, and the running Linux production image completed its own build.

The current hardened production tree reports 20 package rows (0 critical, 2 high,
18 moderate), down from 59 rows before remediation. The remaining high rows are the
paired Lucid/Faker result described above. Keep NOMAD on a trusted local machine/LAN
and never expose it directly to the public internet. Automated force-upgrades were not
applied because the published remediation crosses the Node and Adonis framework
generation boundary.

## 11. Update procedure

When internet is available:

1. Back up `RESOURCE_MANIFEST.csv`, `resources/official/SHA256SUMS.txt`, `NOMAD_SAFETY_PROMPT.md`, and the launcher.
2. Review NOMAD release notes before updating; do not assume newer container images are compatible.
3. Check curated ZIM/map catalogs and official agencies for newer versions. Replace only verified updates.
4. Record source URL, publication/version date, actual bytes, hash, and license/offline basis.
5. Remove a replaced item from RAG before indexing its verified replacement to avoid duplicate retrieval.
6. Rerun the fixed acceptance questions and compare against original source passages.
7. Never treat stored road closures, weather alerts, evacuation orders, wildfire perimeters, recalls, or volcano status as current.
