# Project NOMAD Offline Emergency System — Setup Report

Report date: 2026-11-23 (America/Denver)
Status: core services and content are installed; safety acceptance and fully disconnected/reboot testing are not complete

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
| LM Studio | Windows port 1234 | Connected from NOMAD | Local and LM Link inference/embeddings |

All eleven NOMAD containers, including the private routing service, were running when
checked. NOMAD admin and routing reported healthy; the remaining previously installed
services retained their verified state. Kiwix 3.8.2, Kolibri 0.19.5, and FlatNotes
5.5.5 were shown as available updates; they have not been applied or compatibility-tested.

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

Kiwix, Kolibri, NOMAD RAG, and maps are separate search interfaces. NOMAD does not currently provide one universal search across all four.

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

NOMAD citations identify the stored title/file/path. PDF page numbers are not preserved during extraction, so page-number citations are unavailable.

## 9. Capability boundaries

| Requirement | Verified behavior |
|---|---|
| Completely offline libraries | Kiwix, Kolibri, maps, source files, and local models are stored locally |
| Universal search | Not available: RAG, Kiwix, Kolibri, and maps use separate interfaces |
| RAG citations | Stored filename/path citations work |
| PDF page citations | Not supported |
| Safety-critical generated answers | Not accepted; source verification required |
| Map pan/zoom | Installed; final disconnected regional visual check pending |
| Map routing/address search | Utah/Idaho calculation is installed for pins, map clicks, coordinates, waypoints, modes, and preferences; address search remains unavailable until a separate offline geocoder is measured and installed |
| Satellite map layer | Not present |
| Live alerts/closures/fires/volcano status | Cannot be supplied by offline data; live verification required |
| Authentication | NOMAD has no built-in authentication; do not expose it to the internet |

## 9A. Local interface upgrade

On 2026-11-16 the selected Night Operations + Field Manual interface was compiled into the local Docker image `project-nomad-local:night-manual-20261116` and assigned only to the `admin` service. The existing MySQL database, Redis, storage mount, Kiwix, Kolibri, maps, Qdrant, FlatNotes, and downloaded content were not replaced.

The upgraded interface provides a compact dark operations header, responsive command tiles, Night Ops as the default for new browsers, a retained Day Ops toggle, paper-style documentation panels, and clearer source-record styling. Because NOMAD AI is paused and did not pass safety acceptance, the dashboard no longer offers an actionable AI tile or floating chat button; it shows a disabled status card instead.

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
application chrome. Thirteen focused routing tests, TypeScript, and the production
Vite/Adonis build passed. Deployed headless-Edge QA selected the alternate, rendered
the paper view from page one, hid the map chrome, generated a 57,456-byte PDF, and
reported no browser console errors. Physically disconnected printing remains part of
final acceptance.

The production Docker build completed its Vite and TypeScript compilation. Live HTTP checks returned 200 for the home page, maps, documentation, Kiwix, and Kolibri; `/api/health` returned `{"status":"ok"}`. Rendered browser QA was performed for both the dashboard and Field Manual documentation in dark mode. A rollback copy of the prior Compose file is stored at `/opt/project-nomad/compose.yml.pre-night-manual-20261116`.

The local image is intentionally pinned with `pull_policy: never`. A future official NOMAD update may replace or bypass the customized image, so rebuild/review this interface against the new upstream version before changing that pin.

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

A broad Windows unit run passed 597 of 610 tests. The 13 failures included
Linux-only `libzim` native-binding imports, tests requiring a populated Adonis
server environment, Japa tests invoked under Node's runner, a Windows path
normalization assertion, and a temporary-file lock. These are not counted as a
clean suite pass. The running Linux image and the final public branch are not
the same build: the laptop remains on its tested local v1.35.1 image until a
separate upgrade is approved and retested.

`npm audit --omit=dev` reported 60 advisories in the current upstream production
dependency tree (3 critical, 21 high, 29 moderate, and 7 low). Their practical
reachability in NOMAD has not been triaged. This reinforces the existing rule:
keep NOMAD on a trusted local machine/LAN and never expose it directly to the
public internet. Automated force-upgrades were not applied because several
suggested fixes are major-version changes.

## 11. Update procedure

When internet is available:

1. Back up `RESOURCE_MANIFEST.csv`, `resources/official/SHA256SUMS.txt`, `NOMAD_SAFETY_PROMPT.md`, and the launcher.
2. Review NOMAD release notes before updating; do not assume newer container images are compatible.
3. Check curated ZIM/map catalogs and official agencies for newer versions. Replace only verified updates.
4. Record source URL, publication/version date, actual bytes, hash, and license/offline basis.
5. Remove a replaced item from RAG before indexing its verified replacement to avoid duplicate retrieval.
6. Rerun the fixed acceptance questions and compare against original source passages.
7. Never treat stored road closures, weather alerts, evacuation orders, wildfire perimeters, recalls, or volcano status as current.
