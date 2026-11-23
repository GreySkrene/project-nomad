# Utah and Idaho offline-routing preflight

Measured: 2026-11-23 (America/Denver)

This is a sizing and reproducibility checkpoint. It does **not** claim that route
calculation is installed, and no OSM extract, Valhalla image, or routing graph was
downloaded or built during this preflight.

## Current capacity

| Measurement | Observed value |
| --- | ---: |
| Windows C: capacity | 951.65 GB |
| Windows C: free | 157.52 GB |
| `/opt/project-nomad/storage` | 79 GB |
| ZIM archives | 37 GB |
| PMTiles maps | 34 GB |
| Kolibri | 6.3 GB |
| Uploaded original documents | 938 MB |
| Qdrant | 137 MB |
| Docker images | 9.996 GB |
| Docker build cache | 14.8 GB, of which 10.43 GB was reported reclaimable |

The WSL virtual filesystem reported 849 GB available, but the Windows host's
157.52 GB free space is the meaningful physical ceiling. No cleanup was performed.

The requested NOMAD-content ceiling is approximately 100 GB. At 79 GB installed,
the content library has about 21 GB of policy headroom even though the physical disk
has substantially more free space.

## Verified current inputs

Geofabrik's current official pages reported:

| Input | Current size | Freshness at check |
| --- | ---: | --- |
| `utah-latest.osm.pbf` | 164 MB | Modified about 17 hours earlier; data about one day old |
| `idaho-latest.osm.pbf` | 125 MB | Modified about eight hours earlier |
| Combined compressed PBF input | **289 MB** | Snapshot, not live road conditions |

Sources: [Geofabrik Utah](https://download.geofabrik.de/north-america/us/utah/),
[Geofabrik Idaho](https://download.geofabrik.de/north-america/us/idaho/).
Both publishers provide adjacent MD5 files; the implementation should also record a
local SHA-256 after download.

The latest released Valhalla version was verified as 3.9.1. The official multi-arch
container tag exists and resolves to:

- image: `ghcr.io/valhalla/valhalla:3.9.1`
- index digest: `sha256:4fd114eb1d26b8fc2f43bcb3df234c1b63a0bf13c277405e5943d5361dc575de`
- amd64 manifest: `sha256:18cb42988e03c70dc4bc4ca095a259ec4db5e5df928be65956fc1c64c280b47a`
- compressed amd64 layers: 240,336,248 bytes (229.2 MB)

Sources: [Valhalla 3.9.1 release](https://github.com/valhalla/valhalla/releases/tag/3.9.1),
[official container package](https://github.com/valhalla/valhalla/pkgs/container/valhalla),
and the live OCI manifest inspected from GHCR on the measurement date.

## Build allowance and decision

The exact Utah/Idaho tile size, temporary space, build duration, and peak RAM cannot
be known without doing the bounded build. Valhalla's official Mjolnir documentation
confirms that OSM extracts are transformed into a separate hierarchical routing graph;
the PMTiles already installed by NOMAD cannot substitute for it.

For the proof of concept, reserve these conservative limits:

| Item | Allowance |
| --- | ---: |
| Two PBF inputs | 0.3 GB |
| Compressed container download | 0.23 GB |
| Installed image/layers | up to 1 GB |
| Persistent graph, config, admin/timezone data | up to 3 GB pending measurement |
| Temporary build workspace | up to 4 GB pending measurement |
| **Peak new physical space** | **up to 8 GB** |
| **Expected retained NOMAD content after build** | **up to about 82 GB** |

The 3 GB graph and 4 GB temporary allowances are safety budgets, not measured graph
sizes. The build must stop and report rather than silently exceed them. After a
successful build, record actual source bytes, graph bytes, image bytes, duration,
peak RAM, and query/idle resource use and replace these allowances with measurements.

Conclusion: the bounded Utah/Idaho proof of concept fits both the 100 GB content
ceiling and current physical free space. Expanding beyond Utah and Idaho remains a
separate approval decision.

## Required implementation safeguards

1. Pin Valhalla 3.9.1 by digest rather than `latest`.
2. Keep the route service private to the NOMAD Docker network.
3. Store the graph in a dedicated persistent directory under NOMAD storage.
4. Download both PBFs with resumable transfer, validate publisher MD5, and record
   SHA-256 locally.
5. Enforce the 8 GB preflight allowance before starting the build.
6. Do not start LM Studio or require a GPU.
7. Keep the service optional and controllable through the NOMAD launcher.
8. Preserve the existing PMTiles, Kiwix, Kolibri, databases, and content volumes.

