# Family Emergency Library Profile

This fork turns Project NOMAD into a practical family emergency reference for
periods without internet or cellular service. The build favors trustworthy,
searchable sources over collecting the largest possible archive.

The profile is designed around a **100 GiB content ceiling**. Its measured
installed target is approximately **77 GiB**:

| Content | Approximate size | Purpose |
|---|---:|---|
| Kiwix libraries | 38 GiB after the illustrated upgrades | Medicine, official preparedness, repair, food, and general reference |
| USA/Canada/Mexico vector map | 32 GiB | Detailed offline road and terrain viewing through zoom 15 |
| Kolibri education | 6.3 GiB | Selected science, practical-skills, and Khan Academy material |
| Authoritative source documents | 0.7 GiB | Official emergency plans, manuals, and quick references |

The exact Kiwix selection, URLs, byte sizes, and rationale are stored in
[`collections/emergency-family-library.json`](collections/emergency-family-library.json).
The broader document inventory is in [`RESOURCE_MANIFEST.csv`](RESOURCE_MANIFEST.csv),
and locally saved authoritative files can be checked against
[`resources/official/SHA256SUMS.txt`](resources/official/SHA256SUMS.txt).

## Reproduce the Kiwix library

Install and start Project NOMAD, then run the standard-library-only helper from
the repository root:

```bash
# Show exactly what would be queued.
python3 install/install_emergency_library.py --dry-run

# Queue missing archives through NOMAD's supported API and monitor progress.
python3 install/install_emergency_library.py --wait
```

The script:

- checks NOMAD health and the installed Kiwix inventory;
- skips exact files that are already installed or actively downloading;
- refuses by default to queue more than 40 GiB in one run;
- sends downloads through NOMAD so its queue, progress reporting, Kiwix
  registration, and interrupted-download behavior remain in use; and
- writes no downloaded content into the Git checkout.

Use `--nomad-url http://DEVICE_IP:8080` when running the helper from another
computer. Review the JSON profile before running it: snapshots age, URLs move,
and the best selection for another family may differ.

## Why two Wikipedia editions?

The complete illustrated English Wikipedia is roughly 119 GB by itself, which
does not fit this build. The profile combines:

1. **Complete English Wikipedia (mini)** for breadth across the whole
   encyclopedia, without images or full article detail.
2. **Best of Wikipedia (maxi)** for full-detail illustrated coverage of a much
   smaller high-value subset.

This provides broad lookup coverage and a good illustrated core without using
the entire storage budget on one source. The tiny Top 100 mini archive is not
part of the reproducible profile because it adds no meaningful coverage.

## Maps and education

Maps and Kolibri channels are managed separately from Kiwix, so the helper does
not automate them.

- In **NOMAD Maps**, select the United States, Canada, and Mexico as one detailed
  extract. The tested PMTiles archive is 33,788,916,131 bytes and renders
  vector detail through zoom 15.
- The map is not satellite imagery and cannot provide live closures, current
  fires, evacuation orders, address search, or turn-by-turn routing.
- The tested Kolibri selection includes PhET, Blockly Games, School of Thought,
  Khan Academy, and Sikana. The recorded Khan import is partial because its
  importer skipped 370 upstream files.

## Authoritative documents

The local installation has a curated `official-emergency` collection containing
44 intentional files and 3,922 indexed passages. It covers first aid, water,
power outages, generator and carbon-monoxide safety, radiological incidents,
communications, equipment, Utah, Idaho, and county hazard plans.

The PDFs are deliberately **not committed**. Some are large, some have
source-specific reuse terms, and public Git repositories are a poor update
channel for emergency guidance. The manifest records what was selected and why;
obtain current copies from the named primary agency before relying on them.

## Safety and capability boundaries

- Kiwix, Kolibri, maps, and NOMAD's document collection remain separate search
  systems; there is no verified universal search across all four.
- Stored snapshots are historical. Live weather, road, fire, evacuation,
  contamination, recall, and volcano status require a working live source.
- Local small-model AI failed the project's fixed safety acceptance queries by
  altering medical and water-treatment instructions. The emergency workflow is
  therefore source search, vetted quick-reference cards, and the original
  document. AI is optional and paused in this profile.
- NOMAD has no built-in authentication and should not be exposed directly to
  the public internet.

See [`NOMAD_SETUP_REPORT.md`](NOMAD_SETUP_REPORT.md) for the measured machine
state and [`NOMAD_COMPLETION_PLAN.md`](NOMAD_COMPLETION_PLAN.md) for remaining
offline acceptance tests.

