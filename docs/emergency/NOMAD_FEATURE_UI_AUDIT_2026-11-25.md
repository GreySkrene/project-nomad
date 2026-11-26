# Project NOMAD feature and UI audit — 2026-11-25

Scope: every current user-facing surface in the emergency-family fork. The review
traced the visible action to its route, client state, API/service path, persistence,
and representative tests. It did not start LM Studio, expose NOMAD to the LAN,
delete content, or initiate downloads.

Status key: `pass`, `improved`, `follow-up`, `optional`, `paused`.

| Surface | Real job | Persistence / backend | Audit result | Status |
|---|---|---|---|---|
| Command Center | Reach the right offline capability quickly | Server service inventory plus model-independent local routes | Emergency core is ordered before maintenance. Added immediate first-aid, water, outage, map, and system-check actions; added Household Readiness and System Readiness. Renamed the misleading app-install “Supply Depot” surface. | improved |
| Header readiness badge | Disclose whether local information is usable | Kiwix service state | The badge is truthfully scoped to the local library and now opens the full capability report. It must not be read as proof of physical network disconnection. | improved |
| System Readiness | Check every outage-critical local capability | `/api/health`, services, ZIM, RAG, map, routing, drug, and download APIs | New partial-failure-safe report distinguishes ready, attention, and intentionally optional AI. It discloses snapshot/live-data limits and the remaining physical-disconnection test. | improved |
| Household Readiness | Estimate operational duration from actual supplies | Browser-local versioned JSON with explicit export/import | New deterministic food, water, medication, rotation, outage-timer, portable-power, and daily-ration workflows. Power calculations expose battery Wh, usable percentage, watts, hours/day, quantity, and daily Wh; the confirmed 640 Wh Jackery is an editable default. The ration worksheet divides recorded package totals across target days and explicitly rejects meal-plan/nutrition semantics. Assumptions are visible; no AI or medical inference. Sensitive personal records are deliberately excluded until encrypted storage is designed. | improved |
| Offline Backup | Preserve emergency workflow state across browser resets | Browser-local allowlist plus user-downloaded JSON | New unified export/preview/selective-restore flow covers household readiness, saved/recent references, map view, route drafts/plans, and last route state. Unknown keys are ignored, size is bounded, replacement requires confirmation, and the UI warns that location/supply data is unencrypted. Server-side maps, documents, pins, Notes, and Kolibri data are explicitly excluded. | improved |
| Printable Emergency Summary | Use the household plan while conserving laptop power or away from the UI | Reads the same validated browser-local planner state; browser print/PDF only | New concise coverage, priority-action, outage-timer, ration, power-load, and inventory sheet. Print CSS removes navigation, forces high-contrast paper output, and repeats the limitations. No server upload or AI is involved. | improved |
| Information Library Browse | Understand installed collections and open useful material | Kiwix inventory and curated local metadata | Roles, topics, formats, visual coverage, common searches, loading/error/empty states, and original readers are present. | pass |
| Information Library Search | Find the right article or saved passage despite spelling problems | All 18 Kiwix title indexes, spelling service, 127/128 document passage index | Ranking and source diversity are tested. Fixed URL quick actions so saved-document results execute automatically rather than merely prefilling the form. | improved |
| Saved/recent references | Return to important source material | Browser local storage | Correctly blocks false bookmarks after untracked cross-origin Kiwix navigation. Export/sync is still absent; browser clearing can remove the list. | follow-up |
| Kiwix reader | Keep search/navigation context around a third-party reader | NOMAD wrapper plus Kiwix iframe | Source identity, back/search controls, save state, and cross-origin limitation are disclosed. Some archive-native styling remains intentionally isolated. | pass |
| PDF/Markdown document reader | Read exact originals and page citations | Same-origin managed files and PDF.js | Page navigation, zoom, in-document find, inline source, and exact-page deep links are present. | pass |
| Maps | Inspect downloaded terrain/roads and place pins | PMTiles plus persisted map markers | Snapshot warning is prominent. Coordinate entry formerly failed silently; it now gives an accessible example/error and labels icon-only controls. Address lookup remains a planned geocoder feature. | improved |
| Route planner | Calculate and preserve offline directions | Private Valhalla service; draft/plans/last route in browser storage | Modes, preference controls, alternatives, turn list, GPX/text/print export, boundary errors, stale snapshot warning, and no-live-data disclosure are present and tested. Browser-local plans still need unified backup. | pass |
| Drug search | Read the actual offline FDA label for a named product | Local 262,904-row FDA label database | Search, filters, label detail, boxed warnings, source date, loading/error/empty states, and update state are present. | pass |
| Situation-to-label matching | Discover FDA labels whose indications mention a situation | Curated term spine + FDA indication full-text matching | Safety banner was accurate but visible result copy called matches “treatments/options.” All user copy now says FDA label match and explicitly rejects treatment recommendation semantics. | improved |
| Label-warning comparison | Place each selected drug’s own interaction section side by side | URL-driven IDs + local FDA database | Correctly discloses that this is not a cross-drug interaction checker; selection limit, loading, error, removal, empty, and mobile stacking exist. | pass |
| Education Platform | Open installed courses without a login stop | Separate Kolibri service, anonymous Learn route | Guest entry works; the external reader keeps its own UI by design. Final physical-disconnection media playback remains required. | follow-up |
| Notes | Keep local free-form notes | Separate FlatNotes service | Works offline and is intentionally separate. It is not structured household-planning storage and should not be presented as such. | pass |
| Easy Setup | Install core capabilities safely | Install APIs, jobs, preflights, and manifests | Progress, resource estimates, failures, and capability selection exist. The add-on destination is now called Apps & Services in visible onboarding copy. | improved |
| Apps & Services (`/supply-depot`) | Install/manage optional containers | Docker-backed service catalog and lifecycle APIs | Search, categories, install state, preflight, logs, stats, edit, update, uninstall, and custom apps exist. Renamed in primary UI so it cannot be confused with household supplies. | improved |
| Map/content managers | Download, inspect, retry, or remove large content | Download jobs, manifests, map/ZIM services | Progress and management controls exist. Destructive operations remain separate from the emergency Command Center. Large-download approval remains a process requirement. | pass |
| Updates | Apply core/app/content updates when connected | Update services and opt-in scheduling | Explicit status and opt-in controls exist. Emergency use remains independent of an update check. | pass |
| System / Advanced / API | Diagnose and configure the installation | System info, KV settings, service APIs | Appropriate maintenance surfaces. They stay subordinate to emergency workflows. | pass |
| Models / Chat | Optional generated answers | Ollama/remote-compatible integration | Intentionally paused for this installation. No emergency workflow introduced a dependency on it. | paused |
| Benchmark | Measure system/model performance | Benchmark jobs and stored results | Useful for maintenance, not emergency response. Kept outside the primary workflow. | optional |
| Documentation / support / legal | Explain operation and provenance | Bundled Markdoc pages | Offline and reachable. User-facing app-management naming should continue to be reconciled in older general documentation without rewriting historical release notes. | follow-up |
| Error pages | Recover from missing routes/server errors | Inertia error routes | Provide a safe route back; no emergency data mutation occurs. | pass |
| Windows launcher | Start, open, inspect, and stop the stack | Windows executables + WSL/Docker scripts | Icon and process controls were previously fixed. Reboot and physically disconnected Start/Open/Stop verification is still the release gate. | follow-up |

## Remaining priority findings

1. Perform the rebooted, physically disconnected launcher and reader test.
2. Add optional authenticated encryption to the new unified browser-local backup
   before using it for sensitive household data or any approved LAN exposure.
3. Measure library-only and routing power draw.
4. Run the bounded Utah geocoder pilot; coordinate/pin routing remains the honest
   fallback.
5. Add structured family communication and evacuation-plan fields only after the
   privacy/export design is reviewed.
6. Continue small authoritative material additions; do not substitute more Q&A or
   large generic collections for task-oriented official guides.

## Mobile and accessibility verification

The repeatable Edge DevTools audit now checks every listed surface at a true
390×844 device viewport for horizontal overflow, duplicate element IDs, and visible
interactive controls without accessible names. It also verifies populated planner
persistence, backup discovery, and the text extracted from the printed emergency
summary. The audit found and fixed unlabeled controls in Offline Backup, Apps &
Services, Chat, drug interaction comparison, model/content search, and update
settings; it also fixed long documentation tables forcing a 423-pixel minimum
viewport. First-party surfaces now pass these checks.

The bundled Scalar API Reference can still render a duplicate generated anchor and
unnamed vendor controls (its display toggle and optional Ask Agent inputs vary with
render timing). The runner reports these separately as dependency-owned findings
rather than hiding them or claiming NOMAD fixed third-party markup. The API reference
remains optional maintenance UI and is not on an emergency workflow.

## Safety decisions retained

- AI is optional and paused.
- FDA situation matches are label text, not treatment selection.
- Food/water coverage is arithmetic from editable user entries, not a guarantee of
  nutrition, potability, package safety, or medical suitability.
- The outage timer uses general time windows and is not a temperature sensor.
- Maps and routes never claim current closures, traffic, weather, fires, evacuation
  orders, or road damage.
- A connected green readiness report is not proof of offline operation.
