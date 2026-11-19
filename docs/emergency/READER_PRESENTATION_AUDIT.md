# Offline reader presentation audit

Audited: 2026-11-19 (America/Denver)

This audit records what a person actually sees after leaving NOMAD's curated
Browse Library. It prevents the dashboard from implying that every source uses a
single NOMAD reader or a uniform visual design.

## Verification performed

- Enumerated all 18 installed ZIM archives from the live NOMAD API.
- Opened every archive's real entry URL through the local Kiwix server.
- All 18 entry pages returned HTTP 200 completely from local services.
- Recorded each final redirect, HTML title, stylesheet count, and image count.
- Rendered representative pages at 1440 x 1000 in a headless browser for the
  official-site, repair-manual, encyclopedia, textbook, plant-reference, and Q&A
  reader families.
- Confirmed that the compact Wikipedia archive contains a proper `Main_Page`.
  Its archive metadata instead opened `User:The other Kiwix guy/Landing`, so
  NOMAD now deliberately routes Browse Contents to `Main_Page`.

## Installed collection results

| Installed archive | Actual reader | Entry result | Visual/usefulness note |
| --- | --- | --- | --- |
| `www.ready.gov_en_2024-12.zim` | Archived official site | 200, Ready.gov home | Fully styled and illustrated; the archived seasonal hero is not necessarily the most urgent emergency topic, so NOMAD's topic shortcuts remain important. |
| `wikipedia_en_medicine_maxi_2026-10.zim` | Wiki medical textbook/encyclopedia | 200, Open Textbook of Medicine | Illustrated reference; broad background, not a first-response substitute. |
| `medlineplus.gov_en_all_2025-01.zim` | Archived official consumer-health site | 200, MedlinePlus home | Clear topic navigation and offline images. |
| `nhs.uk_en_medicines_2025-12.zim` | Archived medicine reference | 200, Medicines A to Z | Strong alphabetical navigation; mostly text-first. |
| `wwwnc.cdc.gov_en_all_2024-11.zim` | Archived official CDC site | 200, Travelers' Health | Styled pages and media; primarily travel/infectious-disease background. |
| `librepathology_en_all_maxi_2026-09.zim` | Wiki clinical study reference | 200, Main Page | Illustrated but clinician/learner-oriented, not emergency instructions. |
| `irp.fas.org_en_military-medicine_2026-10.zim` | Military document index | 200, Military Medicine | Sparse legacy layout with very limited media; advanced material. |
| `ifixit_en_all_2025-12.zim` | Step-by-step repair-manual site | 200, iFixit home | Excellent visual categories and extensive offline media. |
| `diy.stackexchange.com_en_all_2026-10.zim` | Community Q&A archive | 200, highest-voted questions | Coherent, styled question index; supplemental advice, not a code-compliant manual. |
| `mechanics.stackexchange.com_en_all_2026-10.zim` | Community Q&A archive | 200, highest-voted questions | Useful troubleshooting discussions; vehicle and author dependent. |
| `woodworking.stackexchange.com_en_all_2026-10.zim` | Community Q&A archive | 200, highest-voted questions | Useful supplemental shop knowledge, not a structured manual. |
| `foss.cooking_en_all_2026-11.zim` | Recipe collection | 200, Home | Small, text-focused recipe site with no images on its entry page. |
| `cooking.stackexchange.com_en_all_2026-10.zim` | Community Q&A archive | 200, highest-voted questions | Technique troubleshooting; supplemental rather than a coherent cookbook. |
| `gardenology.org_en_all_2026-09.zim` | Plant and garden encyclopedia | 200, Main Page | Dated but coherent categories, cultivation links, and plant images. |
| `gardening.stackexchange.com_en_all_2026-10.zim` | Community Q&A archive | 200, highest-voted questions | Problem solving only; correctly labeled supplemental beside Gardenology. |
| `wikipedia_en_top_maxi_2026-06.zim` | Illustrated encyclopedia selection | 200, Wikipedia index | Strong visual overview but intentionally incomplete article coverage. |
| `wikipedia_en_all_mini_2026-06.zim` | Compact complete encyclopedia | 200, corrected Main Page | Broad text coverage with deliberately limited images; NOMAD repairs the poor default landing page. |
| `wikibooks_en_all_maxi_2026-10.zim` | Chapter-based open textbooks | 200, Main Page | Coherent subject shelves, chapter navigation, and offline images. |

## Presentation ownership and safe customization

| Surface | Who controls it | Safe NOMAD approach |
| --- | --- | --- |
| Browse Library, filters, summaries, badges, shortcuts | NOMAD | Fully theme with Night Operations and Field Manual styles. |
| Kiwix shelf and article pages | Kiwix plus the archived source HTML/CSS | Keep source content intact. Improve NOMAD entry links, source labels, and reader expectations; do not rewrite authoritative articles. |
| Original PDF manuals and reports | Browser PDF viewer plus the original PDF | Provide grouped landing cards and direct original-file access. Preserve page numbers, diagrams, signatures, and source layout. |
| Kolibri courses and exercises | Kolibri and channel authors | Link directly to anonymous Learn mode. Avoid fragile CSS injection into the learning application. |
| Offline maps | NOMAD MapLibre page and downloaded vector tiles | Theme NOMAD controls and labels, while preserving map contrast and cartographic meaning. |

## Changes resulting from this audit

- Every article card now states its real reader format and whether offline visual
  media is included, limited, or text-first.
- The compact complete-Wikipedia card opens the useful Main Page rather than the
  archive's obscure metadata-selected user page.
- Tooltips clarify that Browse Contents opens the original Kiwix presentation.
- No authoritative document or archived source CSS was modified.

## Remaining visual work

The representative reader families are readable and functional. Per-source CSS
injection is not recommended: it would be brittle, could hide warnings or diagrams,
and would make it harder to verify that an authoritative source remains unaltered.
Future polish should stay on NOMAD-owned landing pages unless a specific archive has
a demonstrated accessibility defect that can be fixed with a narrowly tested adapter.
