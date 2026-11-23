# Supplemental Q&A storage review

Last updated: 2026-11-23 (America/Denver)

This review decides whether the five installed Stack Exchange archives justify their
space in an emergency-first library. It does not treat a valid download, a large
article count, or occasional useful answers as proof that a collection belongs in the
core library. Community answers remain secondary sources and must not override current
official safety, medical, electrical, fuel, food-safety, or vehicle guidance.

## Evidence used

- The live Kiwix API reports all five files installed and readable.
- `CONTENT_INVENTORY.csv` supplies the measured on-disk bytes.
- `CONTENT_AUDIT.md` records the content-level samples and structural findings.
- `content-audit-gardening.json` contains the exhaustive gardening scan.
- `READER_PRESENTATION_AUDIT.md` records the working reader entry points and roles.

The five archives occupy **3,705,549,249 bytes (3.45 GiB)** total.

## Decisions

| Archive | Bytes | Emergency value | Decision |
|---|---:|---|---|
| Home Improvement Q&A | 2,086,024,326 | Frozen-pipe and generator answers were directly verified. Broad plumbing, building, and household troubleshooting can be useful when professional help is unavailable, although hazardous work must be cross-checked. | **Keep as supplemental.** Its size is material, but its verified infrastructure scope is difficult to replace with one coherent source. Do not index it into safety-critical RAG by default. |
| Motor Vehicle Maintenance & Repair Q&A | 341,672,133 | Working vehicle troubleshooting reference; not manufacturer service data and not a substitute for the exact vehicle manual. | **Keep as supplemental.** Small enough relative to its practical breadth. Add model-specific manuals when vehicle details are known. |
| Cooking Q&A | 238,098,128 | Useful technique and substitution troubleshooting, but not authoritative canning or food-safety guidance. FOSS Cooking provides a coherent recipe surface but is much smaller. | **Keep as supplemental.** The 0.22 GiB cost is modest; keep it visibly subordinate to USDA/CDC guidance. |
| Gardening & Landscaping Q&A | 933,097,375 | The exhaustive scan found 35,431 HTML pages, including 10,504 under 250 text characters and 15,943 with external links. It is not a coherent growing guide or plant encyclopedia. Gardenology now supplies 44,083 searchable plant/garden articles in 112,499,438 bytes. | **Removal candidate.** Gardenology covers the encyclopedia role at about one-eighth the size. Current USU Extension growing guides are still a separate gap; this Q&A archive does not fill it coherently. |
| Woodworking Q&A | 106,657,287 | Functional specialist Q&A, but the audit found no useful `emergency` title hit and little direct value for the family emergency workflows. iFixit, DIY Q&A, Wikibooks, and Sikana already cover broader repair and practical instruction. | **Removal candidate.** Low harm and modest space recovery; retain only if hobby/offline enrichment is desired. |

## Exact proposed deletion set

Do not delete until the user approves these exact live targets:

1. `/app/storage/zim/gardening.stackexchange.com_en_all_2026-10.zim`
   — 933,097,375 bytes.
2. `/app/storage/zim/woodworking.stackexchange.com_en_all_2026-10.zim`
   — 106,657,287 bytes.

Total recoverable space: **1,039,754,662 bytes (0.97 GiB)**.

If approved, deletion must be transactional: remove each file through NOMAD's supported
Kiwix path, rescan the library, confirm the two titles disappear while all retained
libraries still open, update `emergency-family-library.json`, `RESOURCE_MANIFEST.csv`,
`CONTENT_INVENTORY.csv`, the Browse catalog/tests, and the setup report, then push the
reproducible profile change. Neither archive is currently required by the authoritative
document library or the routing system.

## Retained supplemental set

The retained Home Improvement, Mechanics, and Cooking Q&A archives total
**2,665,794,587 bytes (2.48 GiB)**. They should remain tagged `Supplemental`, excluded
from default safety-critical RAG ingestion, and periodically reassessed when coherent
official or manufacturer-authored replacements are installed.
