# Offline content usefulness and completeness audit

Last updated: 2026-11-18 (America/Denver)

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
- [-] **Gardenology replacement candidate** — installed from the official Kiwix
  catalog (112,499,438 bytes). Checksum is valid; all 55,938 user entries scanned with
  zero HTML read errors; 44,083 articles are declared, title and full-text indexes
  work, and representative pages cover plant profiles, vegetable gardening, compost,
  propagation, plant lists, and hardiness zones. Some pages expose old source text or
  template errors, so regional/current USU Extension guides are still required.
- [-] **MedlinePlus, NHS Medicines, and WikiMed** — core medical candidates. Local
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
- [-] **CDC Travelers' Health** — valid official CDC snapshot with useful water
  disinfection and infectious-disease pages, but its scope is travel medicine; treat
  it as supplemental rather than comprehensive emergency-health guidance.
- [ ] **Libre Pathology** — structurally valid (14,426 entries scanned, valid checksum,
  zero HTML read errors), but its role is pathology education rather than practical
  emergency response. Usefulness decision remains pending.

## Kiwix archives — 20 installed, 40,900,638,382 bytes

- [ ] `cooking.stackexchange.com_en_all_2026-10.zim` — 238,098,128 bytes
- [ ] `diy.stackexchange.com_en_all_2026-10.zim` — 2,086,024,326 bytes
- [ ] `foss.cooking_en_all_2026-11.zim` — 30,424,458 bytes
- [-] `gardening.stackexchange.com_en_all_2026-10.zim` — 933,097,375 bytes; reported mismatch: Q&A is not a plant encyclopedia or coherent gardening guide
- [-] `gardenology.org_en_all_2026-09.zim` — 112,499,438 bytes; structurally validated replacement candidate, usefulness review in progress
- [ ] `ifixit_en_all_2025-12.zim` — 3,570,695,757 bytes
- [ ] `irp.fas.org_en_military-medicine_2026-10.zim` — 64,986,090 bytes
- [ ] `librepathology_en_all_maxi_2026-09.zim` — 95,279,611 bytes
- [!] `libretexts.org_en_med_2025-01.zim` — 1,192,567,339 bytes; title-only book/chapter routes reproduced
- [ ] `mechanics.stackexchange.com_en_all_2026-10.zim` — 341,672,133 bytes
- [ ] `medlineplus.gov_en_all_2025-01.zim` — 1,944,841,111 bytes
- [ ] `nhs.uk_en_medicines_2025-12.zim` — 16,946,183 bytes
- [ ] `wikibooks_en_all_maxi_2026-10.zim` — 4,739,739,728 bytes
- [ ] `wikipedia_en_all_mini_2026-06.zim` — 12,531,679,311 bytes
- [ ] `wikipedia_en_medicine_maxi_2026-10.zim` — 1,864,210,320 bytes
- [ ] `wikipedia_en_top_maxi_2026-06.zim` — 8,357,329,540 bytes
- [ ] `woodworking.stackexchange.com_en_all_2026-10.zim` — 106,657,287 bytes
- [ ] `www.ready.gov_en_2024-12.zim` — 2,429,921,822 bytes
- [ ] `wwwnc.cdc.gov_en_all_2024-11.zim` — 178,326,622 bytes
- [ ] `zimgit-medicine_en_2024-08.zim` — 70,179,585 bytes

## Maps

- [ ] `custom-ea2908b0_20261106_z15.pmtiles` — 33,788,916,131 bytes; USA,
  Canada, and Mexico vector extract through zoom 15. Container validity was tested
  previously; disconnected street/detail sampling across target routes is pending.
- [ ] `world.pmtiles` — 15,055,414 bytes; low-detail world overview. Audit whether it
  adds useful fallback coverage or is unnecessary beside the continental extract.

## Kolibri education library

- [x] Enumerated every installed channel directly from Kolibri's database:
  Blockly Games v10 (505 nodes), Khan Academy US v5 (34,488 nodes), PhET v18
  (1,195 nodes), School of Thought v2 (51 nodes), and Sikana English v24
  (3,430 nodes).
- [!] Khan Academy is incomplete. The import log records 404s, timeouts, and
  checksum mismatches, then `370 files are skipped` and exit status 1. The channel
  requires node-level availability and playback testing before it can be accepted.
- [ ] Audit every channel's node/file counts, skipped imports, navigation, emergency
  relevance, and offline playback. Known warning to verify: the Khan import reportedly
  skipped 370 upstream files.
- [ ] Decide whether each channel belongs in a 100 GiB emergency system; entertainment
  or general education alone is not sufficient justification.

## Authoritative documents and equipment files

- [-] The live master inventory is `CONTENT_INVENTORY.csv`: 74 rows comprising 20
  ZIMs, two maps, 45 physical knowledge documents, five Kolibri channels, the Kiwix
  search page, and the derived Qdrant index.
- [!] The 45th knowledge document is a 239-byte `verification-rag.txt` test artifact
  in its own `verification` collection. It was still active; it is now reversibly
  disabled from retrieval. File/vector deletion awaits explicit approval.
- [ ] Reconcile all 45 physical files in `/opt/project-nomad/storage/kb_uploads`
  against `RESOURCE_MANIFEST.csv` and `resources/official/SHA256SUMS.txt`.
- [ ] Validate every PDF structurally, extract page counts/text coverage, identify
  image-only or truncated pages, and check that stated publisher/date match the file.
- [ ] Review emergency usefulness and offline self-containment file by file, including
  all regional hazard plans, manuals, quick references, and equipment documents.
- [ ] Verify the 44-file/3,922-chunk Qdrant collection maps to originals without orphan,
  accidental, or duplicate entries. Qdrant vectors are derived data, not independent
  information sources.

## Replacement rules

- Do not retain a weak collection just because it has already downloaded.
- Prefer coherent primary-source handbooks, extension-service guides, government
  manuals, and well-maintained open encyclopedias over uncurated Q&A.
- Never remove an installed source until its replacement has been sourced, licensed,
  downloaded, validated, tested offline, and approved when the download is large.
- Record actual publication/snapshot dates and label time-sensitive guidance.

## Next audit order

1. Finish exhaustive LibreTexts Medicine structure/content measurements and identify
   a complete replacement or a reason to remove it.
2. Audit Gardening Stack Exchange and compare it with coherent open gardening/plant
   references from authoritative sources.
3. Audit safety-critical medical and preparedness archives.
4. Audit repair/food/reference archives, maps, Kolibri channels, and every uploaded
   document.
