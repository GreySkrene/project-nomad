# Offline content usefulness and completeness audit

Last updated: 2026-11-19 (America/Denver)

> **Audit-tool safety:** `admin/scripts/audit_zim_library.mjs` performs an exhaustive
> libzim walk. Run it on one archive at a time in an isolated or stopped-service
> environment; a large archive can exhaust the live NOMAD WSL instance.

This is the resumable, item-by-item audit requested for the installed Project NOMAD
content. It supersedes any earlier statement that a collection is useful merely
because its file downloaded or Kiwix can open it.

Status key: `[x]` audited and acceptable, `[-]` audit in progress, `[!]` confirmed
defect or replacement needed, `[ ]` not yet audited. A download/integrity check alone
does not earn `[x]`.

## Audit standard

Each source must pass four separate checks:

1. **Physical integrity**: expected file, nonzero size, readable container/PDF/database,
   checksum or internal integrity test where available.
2. **Content completeness**: pages/chapters actually contain their promised content;
   structural scans identify empty or title-only entries, broken navigation, missing
   media, and imports that silently skipped files.
3. **Emergency usefulness**: actionable offline value, appropriate breadth, credible
   provenance, understandable organization, and a clear role in this family library.
4. **Offline self-containment**: essential instructions do not depend on following web
   links. External citations are fine when the useful material is present locally.

For very large encyclopedias, every entry can be machine-scanned for structural
properties, but millions of articles cannot honestly be manually read. Those archives
will receive an exhaustive structural scan plus a recorded, risk-based human content
sample. Small targeted emergency collections receive a substantially deeper review.

## Immediate verified findings

- [x] **Kiwix search landing page** — deployed title-first offline search. Live
  `cloud` suggestions return `Cloud` first in illustrated Best of Wikipedia.
  Offline spelling correction maps `culumbonimbus` to `cumulonimbus`. Evidence:
  `evidence/kiwix-smart-search-live.png`.
- [x] **Duplicate bootstrap cause** — a Kiwix force-reinstall always downloaded
  `wikipedia_en_100_mini_2026-01.zim`, even when a real library existed. Source was
  corrected to bootstrap only an empty library; the exact 4,537,782-byte duplicate
  was removed; the library was then 19 ZIMs and is now 20 after the audited
  Gardenology candidate was added.
- [!] **LibreTexts Medicine** — confirmed content-packaging defect, not corruption.
  The valid-checksum archive contains 23,171 HTML article entries; 23,160 are tiny
  meta-refresh stubs into a JavaScript reader. Testing the actual reader for OpenStax
  Anatomy Unit 1 produced inconsistent content after 15 seconds: Chemical rendered a
  heading and one paragraph with no sections; Cellular rendered its overview and six
  subsection cards; Tissue rendered only its title. Screenshots and the complete scan
  are stored in `evidence/libretexts-*-15s.png` and
  `evidence/content-audit-libretexts.json`.
- [!] **Gardening Stack Exchange** — physically healthy but wrongly positioned as a
  core gardening resource. Its metadata explicitly calls it Q&A. The exhaustive scan
  found 35,431 HTML pages, 10,504 under 250 text characters, and 15,943 pages with at
  least one external link. Keep, if at all, only as supplemental troubleshooting.
- [x] **Gardenology replacement candidate** — installed from the official Kiwix
  catalog (112,499,438 bytes). Checksum is valid; all 55,938 user entries scanned with
  zero HTML read errors; 44,083 articles are declared, title and full-text indexes
  work, and representative pages cover plant profiles, vegetable gardening, compost,
  propagation, plant lists, and hardiness zones. Some pages expose old source text or
  template errors, so regional/current USU Extension guides are still required.
- [x] **MedlinePlus, NHS Medicines, and WikiMed** — core medical candidates. Local
  searches found directly relevant choking (including infant), burn, dehydration,
  paracetamol, ibuprofen, bleeding, and burn articles. Representative pages contain
  substantial offline text. MedlinePlus and NHS completed exhaustive scans with valid
  checksums and zero HTML read errors; WikiMed is being reviewed through Kiwix because
  direct node-libzim enumeration destabilized WSL.
- [!] **Military Medicine** — the archive opens, but its landing page is a historical
  list dominated by 1957–2007 military manuals (including 1957 bandaging/splinting,
  1970 emergency childbirth, and a 1982 Special Forces handbook). Keep only as clearly
  labeled historical/austere supplemental material; it fails the current civilian
  clinical-guidance requirement.
- [!] **OpenZIM Medical Library (`zimgit-medicine`)** — unusable through its normal
  interface: the spinner remains blank after 30 seconds although its bundled database
  is present. The 12 PDFs mix useful but dated works with unverified austere medicine
  and a Traditional Chinese Medicine tongue-diagnosis book. This is not acceptable as
  a safety-critical core collection.
- [x] **CDC Travelers' Health** — valid official CDC snapshot with useful water
  disinfection and infectious-disease pages, but its scope is travel medicine; treat
  it as supplemental rather than comprehensive emergency-health guidance.
- [x] **Libre Pathology** — structurally valid (14,426 entries scanned, valid checksum,
  zero HTML read errors), but its role is pathology education rather than practical
  emergency response. Retain only as low-priority education.
- [x] **Ready.gov** — useful official preparedness core. The December 2024 snapshot
  contains 2,437 articles and 3,573 media items. Local pages for earthquake, flood,
  wildfire, power outage, emergency water, household chemicals, hazmat, heat, winter,
  radiation, planning, and kits opened with substantial actionable text. It is static,
  is not a clinical manual, and cannot supply current alerts or orders.
- [x] **The two Wikipedias are complementary** — the 2026-06 complete mini archive
  provides 19,183,502 compact text articles with almost no media; the 2026-06 Best of
  Wikipedia archive provides a smaller curated set with richer text and images.
  `Cumulonimbus` was present in both: 2,749 extracted characters/no images in mini
  versus 14,725 characters/18 images in Best of Wikipedia.
- [x] **Uploaded PDF structural audit** — all 37 PDFs opened successfully and all
  6,068 pages were scanned. File-by-file usefulness decisions are in
  `PDF_CONTENT_AUDIT.md`; evidence is `evidence/content-audit-pdfs.json`. Confirmed
  defects include a nearly empty Legion Go landing-page capture and filenames that
  misstate actual document dates.

## Kiwix archives — 18 installed, 39,637,891,458 bytes

- [x] `cooking.stackexchange.com_en_all_2026-10.zim` — healthy searchable Q&A;
  supplemental troubleshooting, not authoritative food-safety or canning guidance.
- [x] `diy.stackexchange.com_en_all_2026-10.zim` — substantial frozen-pipe and
  generator answers verified; secondary advice that requires safety cross-checking.
- [x] `foss.cooking_en_all_2026-11.zim` — coherent recipes, including working rice
  and bean pages; useful for shelf-stable cooking, not food-safety authority.
- [x] `gardening.stackexchange.com_en_all_2026-10.zim` — healthy Q&A but supplemental
  only; not a plant encyclopedia or coherent growing guide.
- [x] `gardenology.org_en_all_2026-09.zim` — valid searchable 44,083-article plant
  encyclopedia; supplement with current Utah State University Extension guidance.
- [x] `ifixit_en_all_2025-12.zim` — broad illustrated repair reference. The Legion Go
  result is only device/chip identification, and no Jackery-specific guide was found.
- [!] `irp.fas.org_en_military-medicine_2026-10.zim` — historical/austere supplement
  only; dominated by 1957–2007 manuals, not current civilian clinical advice.
- [x] `librepathology_en_all_maxi_2026-09.zim` — structurally healthy pathology
  education; low emergency priority and not a first-aid reference.
- [x] `libretexts.org_en_med_2025-01.zim` — removed after confirmation that 23,160 of
  23,171 reader pages were redirects/stubs and after its replacement passed offline
  UI/hash validation.
- [x] `mechanics.stackexchange.com_en_all_2026-10.zim` — working vehicle
  troubleshooting; supplemental community advice, not model-specific service data.
- [x] `medlineplus.gov_en_all_2025-01.zim` — core consumer medical reference; valid
  checksum, 14,940 HTML pages, zero read errors, and useful emergency-topic pages.
- [x] `nhs.uk_en_medicines_2025-12.zim` — core medication supplement; valid checksum,
  1,996 HTML pages, zero read errors, and substantial common-medicine guidance.
- [x] `wikibooks_en_all_maxi_2026-10.zim` — working illustrated First Aid Training,
  Wilderness First Aid, Survival Kit, and Outdoor Survival books; variable quality.
- [x] `wikipedia_en_all_mini_2026-06.zim` — complete broad text encyclopedia with
  19.18 million compact articles; intentionally almost image-free.
- [x] `wikipedia_en_medicine_maxi_2026-10.zim` — broad WikiMed snapshot with useful
  sampled bleeding and burn pages; encyclopedia, not professional medical care.
- [x] `wikipedia_en_top_maxi_2026-06.zim` — illustrated curated encyclopedia with
  875,265 articles and 613,801 media items; complements complete mini.
- [x] `woodworking.stackexchange.com_en_all_2026-10.zim` — functional specialist Q&A,
  but low emergency priority and no useful `emergency` title hit in the audit sample.
- [x] `www.ready.gov_en_2024-12.zim` — official preparedness core with locally complete
  hazard/action pages. Static snapshot; no live alerts.
- [x] `wwwnc.cdc.gov_en_all_2024-11.zim` — valid CDC Travelers' Health snapshot;
  useful but narrower than general emergency medicine.
- [x] `zimgit-medicine_en_2024-08.zim` — removed after its blank reader and mixed
  dated/unverified 12-title bundle were documented and its replacements passed
  offline UI/hash validation.

## Validated medical replacements — 82 installed files

- [x] Oregon State *Anatomy & Physiology 2e* (2025) — 133,118,779 bytes and 2,070
  readable pages. All pages were extracted; the Chemical, Cellular, and Tissue
  chapters contain substantive bodies and figures. Stored browse-only because the
  source's current terms do not permit LLM ingestion without permission.
- [x] Hesperian *Where There Is No Doctor* (2025) — 32 official chapter/section PDFs,
  503 pages, all readable. Useful austere supplement; official current clinical
  guidance takes precedence over improvised or older field methods.
- [x] Hesperian *Where There Is No Dentist* (2024) — 14 official chapter/section PDFs,
  248 pages, all readable. Toothache, abscess, and bleeding guidance spot-checked.
- [x] Hesperian *A Book for Midwives* (2026) — 31 official chapter/section PDFs, 546
  pages, all readable. Birth danger signs, medical help, and transport sections
  spot-checked; not a substitute for professional obstetric care.
- [x] WHO *Basic Emergency Care* manual (2018), 2025 quick cards, and 2026 postpartum
  haemorrhage card — three official PDFs, 255 pages total, all readable. These are
  professional/first-contact references, not a replacement for emergency services.
- [x] The 80-file source URL, byte, SHA-256, publisher, role, and license ledger is
  `MEDICAL_REPLACEMENT_FILES.csv`; structural evidence is in
  `evidence/medical-replacements-pdf-audit.json`.

## Maps

- [!] `custom-ea2908b0_20261106_z15.pmtiles` — valid PMTiles v3 vector archive with
  71,881,331 addressed tiles, nine vector layers, and source data timestamped
  2026-11-06. Zoom-15 tiles were retrieved for West Jordan, Riverton, Ogden,
  Marysvale, Rexburg, both sampled travel corridors, Toronto, Mexico City, and most
  additional Canadian/Mexican cities. **Confirmed coverage defect:** downtown
  Vancouver is present at zoom 10 but absent at zooms 12, 14, and 15; central Burnaby
  is present at 12 but absent at 14/15, while nearby Victoria, Surrey, Bellingham, and
  Seattle have detailed tiles. Canada therefore cannot yet be called complete. Root
  cause was reproduced in `CountriesService`: the approximate coastal buffer excluded
  Vancouver/Burnaby even though the original Canada polygon contains them. Region
  generation now retains both original and buffered geometry, with a regression test.
  A corrected Canada-only zoom-15 overlay from the 2026-11-18 source build is actively
  extracting; the original continental archive remains installed until validation.
- [x] `world.pmtiles` — valid PMTiles v3 low-detail world overview through zoom 5.
  All 17 sampled North American locations returned tiles. Keep it as a small global
  fallback and low-zoom base; it does not replace street-level coverage.

Map evidence: `evidence/content-audit-maps.json`. These are OpenStreetMap-derived
vector maps, not satellite imagery. NOMAD currently provides offline display/pan/zoom,
not live closures, live incidents, address search, or turn-by-turn routing.

## Kolibri education library

- [x] Enumerated every installed channel directly from Kolibri's database:
  Blockly Games v10 (505 nodes), Khan Academy US v5 (34,488 nodes), PhET v18
  (1,195 nodes), School of Thought v2 (51 nodes), and Sikana English v24
  (3,430 nodes).
- [x] **Blockly Games** — all 505 nodes are available; 896 selected-node file records
  are available and zero are unavailable. Physical files exist. Stable programming
  education, but low emergency priority (310,676,617 available bytes).
- [!] **Khan Academy selected subset** — 1,455 of the channel's 34,488 catalog nodes
  are marked available. Of 11,612 file records attached to those selected nodes,
  11,586 are available and 26 are unavailable; every missing sample is a subtitle or
  thumbnail, not a primary video. The earlier import still ended with 370 skipped
  files/status 1, so call this usable partial education, not a complete channel.
  Installed topics are math, physics, biology, and electrical engineering.
- [x] **PhET** — all 1,195 nodes available; all 2,369 selected-node file records
  available, with physical files present. Useful offline science simulations, but low
  immediate emergency priority (4,705,347,030 available bytes).
- [x] **School of Thought** — all 51 nodes and all 98 file records available with
  physical files present. Logical-fallacy/cognitive-bias education; low emergency
  priority (109,236,718 bytes).
- [x] **Sikana selected practical subset** — 505 of 3,430 catalog nodes available;
  all 995 selected-node file records available and physical files present. Actual
  installed topics include navigation/compass/map reading, cooking, heating/insulation,
  solar, basic electricity, DIY, compost, small-scale agriculture, and gardening.
  This is the most directly useful Kolibri channel (2,278,386,123 available bytes).
- [x] Anonymous Learn mode responds at `/en/learn/`; the bare Kolibri root redirects
  to the authentication page, so NOMAD must continue linking directly to Learn mode.

Evidence: `evidence/content-audit-kolibri.json`. Physical-file verification checks
every distinct local file attached to an available node. Hands-on playback of a sample
from each media type remains part of the final disconnected acceptance test.

## Authoritative documents and equipment files

- [x] Added three official regional originals on 2026-11-19: the current ITD-linked
  Idaho highway-map file, ITD's two-page eastern Idaho I-15 corridor fact sheet, and
  Davis County's 2026 wildfire evacuation-zone presentation. All have valid PDF
  headers/EOF markers and recorded SHA-256 hashes. The highway map is image-based;
  the corridor sheet is an older static reference; evacuation orders, closures, and
  conditions must always be verified live when communications are available.
- [x] These three originals are registered in the live Document Library as
  `pending_decision`; all three download endpoints return HTTP 200. Manual-mode
  sync queued zero embedding jobs, so LM Studio remained untouched.

- [x] The live summary inventory is `CONTENT_INVENTORY.csv` (79 rows). The 80 new
  chapter-level medical files are individually recorded in
  `MEDICAL_REPLACEMENT_FILES.csv`, rather than collapsed into an unreviewable label.
- [x] The 239-byte `verification-rag.txt` test artifact and its vector were deleted
  after the planned replacement transactions completed.
- [x] Live RAG storage now contains 43 previously indexed user documents plus 82
  validated replacements awaiting a manual indexing decision. Manual mode allows
  all replacements to be opened/downloaded without starting an embedding model.
- [x] Validated all 37 PDFs: 37 readable, 6,068 pages scanned, per-page text coverage
  recorded, image/blank-text pages flagged, and source metadata compared with names.
  See `PDF_CONTENT_AUDIT.md` and `evidence/content-audit-pdfs.json`.
- [x] Reviewed all seven real Markdown quick references plus the test artifact. The
  quick cards are useful locally authored summaries; provenance claims were corrected
  in the repository. Their installed copies/Qdrant chunks still require a later sync
  because LM Studio is intentionally untouched/off for the user's other project.
- [x] The pre-replacement Qdrant evidence remains in
  `evidence/content-audit-qdrant.json`. After removal of the incomplete Legion capture
  and verification artifact, the live user-upload index has 43 files, 3,921 chunks,
  and 752,215,160 source bytes. The 82 replacements remain unindexed by design while
  LM Studio is reserved. Qdrant remains derived data, not an independent source.

## Replacement rules

- Do not retain a weak collection just because it has already downloaded.
- Prefer coherent primary-source handbooks, extension-service guides, government
  manuals, and well-maintained open encyclopedias over uncurated Q&A.
- Never remove an installed source until its replacement has been sourced, licensed,
  downloaded, validated, tested offline, and approved when the download is large.
- Record actual publication/snapshot dates and label time-sensitive guidance.

## Next action: replace rejected resources

The inventory-wide content audit is complete; do not restart it. Resume with the
transactional replacement/removal queue at the top of `NOMAD_COMPLETION_PLAN.md`.
LibreTexts Medicine, `zimgit-medicine`, the incomplete Legion Go manual, and the
defective Canadian map coverage are the first corrective targets. Preserve each old
file until a licensed replacement has been downloaded, content-validated, exercised
through the offline UI, and recorded in the manifests. Q&A collections remain
supplemental pending a storage-value decision rather than being mistaken for core
guides.
