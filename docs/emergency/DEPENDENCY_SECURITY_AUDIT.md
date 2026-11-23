# Dependency security audit

Audit date: 2026-11-23 (America/Denver)

Scope: `admin` production dependencies, measured with
`npm audit --omit=dev`. This is a package-advisory audit, not a claim that every
remaining advisory is exploitable through NOMAD.

## Result

| Production dependency state | Critical | High | Moderate | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Before remediation | 3 | 20 | 29 | 7 | 59 |
| After tested remediation | 0 | 2 | 18 | 0 | 20 |

The all-dependency tree, including build and test tooling excluded from the runtime
image, reports 35 package-level findings: 11 high and 24 moderate. The production
image itself reports the 20-row result above.

No `npm audit fix --force` operation was used. Package-major changes were made only
where the application path was inspected and tested.

## Remediated packages

- `maplibre-gl` 4.7.1 -> 6.19.0. This removes the critical DOM sanitizer bypass.
  NOMAD now uses the v6 ESM namespace import and emits the MapLibre worker as a local,
  versioned Vite asset. A 12-second deployed Edge render displayed the offline vector
  map, saved pins, controls, attribution, and safety warning without runtime exceptions.
- `sharp` 0.34.5 -> 0.35.5. This removes the inherited libvips/libheif/librsvg high
  findings. The Linux image generated a PNG successfully after deployment.
- `tar` 7.5.16 -> 7.5.23, removing the critical archive parsing/decompression findings.
- `systeminformation` 5.31.7 -> 5.33.24, including the command-injection fix.
- `@openzim/libzim` 4.0.0 -> 4.7.0. The native module builds and imports in NOMAD's
  supported Linux container. Its installer remains unsupported on native Windows.
- `axios` 1.18.1 -> 1.21.1; `fast-xml-parser` 5.7.0 -> 5.12.1;
  `mysql2` 3.22.5 -> 3.24.6; `compression` 1.8.1 -> 1.8.2;
  `postcss` 8.5.15 -> 8.5.33; `yauzl` 3.2.0 -> 3.4.0;
  `@scalar/api-reference` 1.62.4 -> 1.83.0; and Vite 6.4.3 -> 6.4.6.
- Non-breaking transitive remediation updated packages including `proxy-addr`.

## Remaining findings

The two remaining high package rows are `@adonisjs/lucid` and its transitive
`@faker-js/faker`. The published npm remediation upgrades Lucid from 21 to 22 and is
a framework-major migration. NOMAD production source contains no Faker import or
`helpers.fake` call, which reduces direct reachability of that specific Faker issue,
but does not erase the advisory. Lucid is used by the application, so its major upgrade
requires a dedicated database/auth/session regression pass.

The 18 moderate rows are primarily the existing Adonis 6 framework family and direct
packages whose patched releases require major upgrades, including `stream-json`.
They remain recorded rather than being force-upgraded.

Until those migrations are tested, keep NOMAD local/LAN-only and do not expose port
8080 to the public internet.

## Verification

- TypeScript type-check: passed.
- Focused routing, Browse, and search tests: 27/27 passed.
- Vite/Adonis production build: passed.
- Docker `npm ci` and production build on Node 22: passed with no engine mismatch.
- Native Linux libzim import: passed.
- Native Linux Sharp PNG generation: passed (96-byte test image).
- Deployed MapLibre v6 browser render: passed with offline PMTiles and no exceptions.
- Live West Jordan-to-Marysvale route: 181.2968 miles plus one alternate.

Relevant advisories include the
[MapLibre sanitizer bypass](https://github.com/advisories/GHSA-jrc7-96c5-q579),
[node-tar decompression issue](https://github.com/advisories/GHSA-23hp-3jrh-7fpw),
and [Faker helper issue](https://github.com/advisories/GHSA-qxc2-j82w-r537).
