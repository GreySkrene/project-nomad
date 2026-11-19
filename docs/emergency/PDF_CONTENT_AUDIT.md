# Installed PDF content audit

Last updated: 2026-11-19 (America/Denver)

All 37 installed PDFs were opened, SHA-256 hashed, and scanned page by page with
`admin/scripts/audit_pdf_library.mjs`. The scan covered 6,068 pages: all 37 files
were readable. The machine evidence, including page-level text counts and embedded
metadata, is in `evidence/content-audit-pdfs.json`.

An empty extracted-text page is not automatically missing content. Maps, covers,
photographs, and divider pages can be image-only. The status below combines the
structural scan, publisher/source, actual contents, and emergency role. It does not
assert that every medical statement remains current.

Status key: **core** = directly useful emergency reference; **regional** = useful
planning/hazard evidence but not a live alert or quick-action guide; **supplement** =
useful with a stronger source; **weak** = downloaded item does not fulfill the role
its name suggests.

| Installed PDF | Pages | Status | What the audit actually found |
|---|---:|---|---|
| CDC Backcountry Water Treatment | 1 | core | Complete CDC decision sheet; 2,020 extractable characters. Covers boiling, filtering, and disinfection limits. Embedded creation date is 2023-07-17. |
| CDC Make Water Safe During an Emergency | 1 | core, mislabeled | Complete CDC sheet; 1,484 characters. The installed filename says 2025, but embedded CDC metadata dates it 2022-10-04. |
| CDC Radiation Response Briefing Manual | 44 | supplement, mislabeled | Substantial 72,735-character manual aimed at officials and public-health decision makers. Two graphical/blank-text pages. The document says July/December 2020, not 2024. It is not a concise household fallout guide. |
| CPSC Battery Safety | 4 | core-general | Complete captured CPSC safety page; general battery advice, not model-specific power-bank instructions. |
| CPSC Butane Tabletop Cooking Appliances | 46 | supplement | Complete 2003 CPSC engineering/research report. It documents overheating hazards, oversized cookware, inverted grates, and standards; it is not the user manual for the family's exact stove. |
| CPSC Camping Equipment Carbon Monoxide Safety | 1 | core | Complete official warning on deadly CO hazards from fuel-burning camping equipment. |
| CPSC Portable Fuel Container Safety | 8 | core-general | Complete official captured safety page; useful handling guidance, not a specific canister/stove manual. |
| Davis County PDM Plan | 321 | regional | Readable adopted plan with 582,410 text characters. Pages 296–320 have no extractable text and appear in the appendix/map region; retain as regional planning evidence, not a live evacuation source. |
| EPA Emergency Disinfection of Drinking Water | 2 | core | Complete official 2017 instructions with 6,235 characters; high-value household water reference. |
| FEMA Family Emergency Communication Plan | 2 | core, mislabeled | Complete fillable plan. Embedded metadata dates it 2017-06-26, so the 2025 filename is a capture/check date rather than publication date. |
| FEMA Power Outage Info Sheet | 2 | core | Complete December 2023 FEMA sheet; concise outage, food, generator, medication, and CO precautions. |
| Idaho Geologic Map of Rexburg | 1 | regional | Complete high-resolution 2016 map with extractable labels; useful static geology, not current incident information. |
| Idaho Madison County Seismic Map | 45 | regional-historical | Complete 2011 map product based on an older hazard model; useful context only and must not be represented as current shaking probability. |
| Idaho State Hazard Mitigation Plan | 1,223 | regional | Readable 2.29-million-character 2023 plan. Seventy-eight pages have no extracted text, largely consistent with graphics/dividers; broad planning reference, not a quick-response manual. |
| Jackery Explorer 600 v2 JE-600A Manual | 46 | core-equipment | Complete model-specific manual with 74,250 characters. Covers controls, charging, solar limits, storage, troubleshooting, and safety. Highest-value equipment file. |
| Jackery Explorer 600 v2 Product Guide | 14 | supplement | Complete rendered manufacturer page; useful additional current product/support context but secondary to the 46-page manual. |
| Lenovo Legion Go User Guide | 40 | core-equipment | Complete Lenovo-authored guide for 8APU1 / type 83E1: 60,698 extracted characters and zero empty pages. Verified 65 W charging, battery, Quiet 8 W, thermal/power modes, and troubleshooting. Retrieved from a mirror because Lenovo's official support download blocked automation; official Lenovo support records identify the guide. |
| Lenovo Legion Go PSREF | 8 | supplement | Complete 10,181-character specification sheet. Useful for hardware and charging specifications, not offline-operation instructions. |
| Madison County Multi-Hazard Mitigation Plan | 424 | regional | Readable 2019 plan with 872,014 characters. Covers Rexburg/Madison County hazards; not current alerts or evacuation orders. |
| Midland ER10 Owner's Manual | 2 | core-equipment | Complete compact manual with 6,809 characters: controls, batteries, alert mode, seven NOAA frequencies, clock, scanning, and flashlight. |
| Midland ER10VP Spec Sheet | 2 | supplement | Complete product specification sheet; useful model confirmation but not a substitute for the owner's manual. |
| NOAA Weather Radio National Brochure | 4 | core-general | Complete NOAA brochure with 39,772 extractable characters; supports NWR concepts and reception but local transmitter status still requires live verification. |
| NWS Weather Preparedness for Schools | 16 | low-priority | Complete 2025 NWS school-planning material. Credible, but less directly useful to a household than hazard-specific guides. |
| Putting Down Roots in Earthquake Country | 40 | core-regional | Complete 2022 Utah earthquake preparedness handbook with 98,454 characters; high-value local preparedness source. |
| Salt Lake County MJHMP | 458 | regional | Readable current county plan with 828,488 characters and no empty-text pages; useful local risk/jurisdiction detail, not live emergency status. |
| Six County Region PDM Plan | 706 | regional | Readable 2020 plan with 1,048,104 characters; covers Piute County/Marysvale. Large planning source, not a quick-action guide. |
| UGS Landslide Hazards PI-98 | 4 | core-regional | Complete concise official hazard explainer. |
| UGS Liquefaction Hazards PI-100 | 4 | core-regional | Complete concise official hazard explainer, particularly relevant to the Salt Lake Valley. |
| UGS Rockfall Hazards PI-94 | 3 | core-regional | Complete concise official hazard explainer. |
| UGS Shallow Groundwater PI-105 | 4 | core-regional | Complete concise official hazard explainer. |
| UGS Wildfires and Debris Flows PI-90 | 4 | core-regional | Complete concise official explainer, but its embedded date is 2007; retain with newer wildfire guidance. |
| USDA Food Safety During Power Failure | 1 | core | Complete concise official sheet with refrigerator/freezer and discard guidance. |
| USFA Portable Generator Safety | 1 | core | Complete concise official five-step generator/CO safety sheet. |
| USGS Yellowstone 2024 Annual Report | 56 | supplement-regional | Complete 2024 scientific monitoring report published later; valuable background, but it cannot provide the current volcano alert level. |
| Utah Enhanced State Hazard Mitigation Plan | 770 | regional | Readable statewide plan with 1.51 million characters. Five image/blank-text pages; useful risk assessment, not a household response guide. |
| WHO Managing Complications in Pregnancy and Childbirth | 492 | professional-only | Readable 2017 clinical manual with 622,246 characters. Detailed and credible but written for trained clinicians; nine image/blank-text pages and it must not be presented as lay first aid. |
| Weber County PDM Plan | 1,302 | regional | Readable plan with 1.99 million characters and no empty-text pages; useful county risk detail, not live orders. |

## Confirmed gaps and corrective actions

- Rename or display dates from source metadata/content rather than treating capture
  dates as publication dates. The CDC water, CDC radiation, and FEMA communication
  filenames currently overstate recency.
- The incomplete six-page Legion Go capture was removed after the complete
  40-page guide passed content and offline UI/hash validation.
- Obtain the exact butane-stove model before adding a model-specific operating manual.
  The CPSC report is valuable safety evidence but not operating instructions.
- Keep regional mitigation plans, but surface concise household action guides ahead
  of thousand-page planning documents during emergency searches.
- Add a current household-facing radiological/fallout sheltering guide alongside the
  2020 CDC decision-maker manual.
