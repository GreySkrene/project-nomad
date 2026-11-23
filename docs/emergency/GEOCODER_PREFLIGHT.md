# Offline address-search preflight

Last updated: 2026-11-23 (America/Denver)

## Outcome

Do **not** download the prebuilt Photon USA index on this laptop yet. The official
download service has no Utah, Idaho, or western-state database extract. Its smallest
relevant prebuilt database is the whole USA: **10,615,473,970 compressed bytes
(9.89 GiB)** for Photon 1.x, updated 2026-11-17. North America is 15,747,482,383 bytes.
Photon's own update procedure requires the old and new databases to coexist while
they are swapped, so safe updates need substantially more than the compressed size.
The installed size and idle memory have not been measured on this laptop and must not
be guessed.

The correct next experiment is a bounded **Utah-only Nominatim address-style import**
using the already downloaded Utah PBF, followed by Utah+Idaho only if the measured
pilot passes. Nominatim is less naturally typo-tolerant than Photon, so typo handling
must be tested explicitly and may require a small local street/place suggestion layer.

No geocoder was downloaded or installed during this preflight.

## Verified official capabilities and constraints

### Photon

Photon documents search-as-you-type, typo tolerance, location bias, bounding-box
filtering, and reverse geocoding. It requires Java 21 or newer. Its official setup
guide recommends SSD/NVMe and warns that a planet database is roughly 95 GB with at
least 64 GB RAM recommended for smooth operation. Those planet figures are not used
as an estimate for USA; they establish that actual regional measurements are required.

The GraphHopper-sponsored official dump service currently exposes prebuilt database
dumps for Planet, North America, USA, Canada, and Mexico, but no state-level USA
subregions. Photon 1.x dumps are tied to the matching major software version. The
prebuilt dumps support English, German, French, and local languages but not structured
search or full geometry output.

Sources:

- <https://github.com/komoot/photon>
- <https://download1.graphhopper.com/public/north-america/usa/>
- <https://download1.graphhopper.com/public/north-america/>

### Nominatim

Nominatim's official import guide explicitly recommends precomputed extracts for
smaller regions. Its `address` import style includes administrative data, streets,
addresses, and house numbers without the extra POI scope of the full style. If live
updates are unnecessary, `--no-updates`/`nominatim freeze` can remove update-only data,
although the full temporary import space is still required. Nominatim supports local
forward and reverse API endpoints.

The official guide states a 2 GB minimum for installation, while also warning that
imports are RAM-intensive because PostgreSQL and osm2pgsql run together. Planet-scale
figures are not applicable to this two-state pilot. The pilot must record its own
peak RAM, duration, temporary bytes, final bytes, idle memory, and idle CPU.

Sources:

- <https://nominatim.org/release-docs/latest/admin/Import/>
- <https://nominatim.org/release-docs/latest/admin/Installation/>

## Laptop and input measurements

Measured immediately before this decision:

- physical RAM: **15.2 GiB**;
- free physical RAM with the current desktop/services active: **2.9 GiB**;
- Windows C: free space: **165.2 GiB**;
- WSL filesystem: **847 GiB free** (this is a sparse virtual disk and is not a promise
  that Windows can safely consume that amount);
- retained Utah PBF: **172,200,193 bytes**;
- retained Idaho PBF: **130,765,499 bytes**.

The routing directory exposes both `source/` and root-level names for those PBFs, but
they are **hard links, not duplicate data**. On 2026-11-23 each pair had the same inode
and a link count of two; `du` charged only the `source/` name. The installer creates
these links deliberately because the verified originals live under `source/` while
the Valhalla entry script searches the routing root. Removing a name would recover
zero allocated bytes and could break a rebuild, so neither name is a cleanup target.
The Utah Nominatim pilot can read the retained `source/utah-latest.osm.pbf` directly.

## Pilot acceptance gates

1. Pin the exact Nominatim image/software version and keep its API private to NOMAD's
   Docker network.
2. Use the existing Utah PBF first; do not download the USA Photon dump.
3. Stop or cap nonessential services during import so the 15.2 GiB machine does not
   swap heavily or destabilize the working emergency library.
4. Record image bytes, input bytes, peak temporary bytes, final database bytes, import
   time, peak RAM, idle RAM/CPU, and measured wall power if available.
5. Test exact and misspelled forms of real targets: house numbers, streets, cities,
   hospitals, fuel, landmarks, duplicate names, and out-of-coverage queries.
6. Required examples include West Jordan, Riverton, Marysvale, Ogden, and corridor
   addresses. Idaho/Rexburg tests begin only after the Utah pilot passes.
7. Confirm that a selected result becomes a map pin or route endpoint, while raw
   coordinates and saved pins remain available when an address is absent.
8. Label the result as an offline snapshot; never imply current road access, closures,
   evacuation status, hazards, or traffic.
9. Keep the service stopped by default if its idle memory/power cost is material. The
   map and saved routes must remain usable without it.

## Decision boundary

Proceeding to the Utah import needs approval for a new database service and its Docker
image, even though it can reuse the existing PBF and should not require a large map
download. The prebuilt USA Photon download remains a separate large-download decision.
