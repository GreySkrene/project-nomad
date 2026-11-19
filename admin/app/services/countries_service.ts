import { access, readFile, writeFile, mkdir } from 'fs/promises'
import { join, resolve } from 'path'
import { createHash } from 'crypto'
import { tmpdir } from 'os'
import logger from '@adonisjs/core/services/logger'
import type { Country, CountryCode, CountryGroup } from '../../types/maps.js'
import { buildCountryRegionFeatures } from '../utils/country_region.js'

interface NEFeature {
  type: 'Feature'
  properties: Record<string, any>
  geometry: unknown
}

interface NEFeatureCollection {
  type: 'FeatureCollection'
  features: NEFeature[]
}

const COUNTRY_GEOJSON_PATH = join(
  process.cwd(),
  'resources',
  'geodata',
  'ne_50m_admin_0_countries.geojson'
)

// Natural Earth country polygons are land-only (no territorial waters), so a
// strict intersect leaves tiles fully over the ocean out of the extract —
// coastal cities render as grey off their coast. Inflate each polygon outward
// by ~11 km to pull in adjacent tiles without ballooning the extract size.
const REGION_BUFFER_DEGREES = 0.1

const GROUP_ORDER = [
  'north-america',
  'south-america',
  'europe',
  'africa',
  'asia',
  'oceania',
]

const GROUP_META: Record<string, { id: string; name: string; description: string }> = {
  'North America': {
    id: 'north-america',
    name: 'North America',
    description: 'All countries in North America and the Caribbean.',
  },
  'South America': {
    id: 'south-america',
    name: 'South America',
    description: 'All countries in South America.',
  },
  Europe: {
    id: 'europe',
    name: 'Europe',
    description: 'All countries in Europe.',
  },
  Africa: {
    id: 'africa',
    name: 'Africa',
    description: 'All countries in Africa.',
  },
  Asia: {
    id: 'asia',
    name: 'Asia',
    description: 'All countries in Asia.',
  },
  Oceania: {
    id: 'oceania',
    name: 'Oceania',
    description: 'Australia, New Zealand, and Pacific island nations.',
  },
}

export class CountriesService {
  private static instance: CountriesService | null = null
  private loadPromise: Promise<void> | null = null
  private countries: Country[] = []
  private byCode: Map<CountryCode, { country: Country; feature: NEFeature }> = new Map()
  private groups: CountryGroup[] = []

  static getInstance(): CountriesService {
    if (!this.instance) {
      this.instance = new CountriesService()
    }
    return this.instance
  }

  private async ensureLoaded(): Promise<void> {
    if (this.byCode.size > 0) return
    if (!this.loadPromise) {
      this.loadPromise = this.load()
    }
    await this.loadPromise
  }

  private async load(): Promise<void> {
    const raw = await readFile(COUNTRY_GEOJSON_PATH, 'utf8')
    const fc = JSON.parse(raw) as NEFeatureCollection

    // Natural Earth reuses a sovereign state's ISO_A2 for its dependencies
    // (e.g. AU covers both Australia and Australian territories). Sort so the
    // sovereign mainland wins the ISO-code slot, and skip any subsequent
    // same-code dependency — otherwise the "AU" entry ends up being some tiny
    // island territory.
    const sortedFeatures = [...fc.features].sort((a, b) => typeRank(a) - typeRank(b))

    const countries: Country[] = []
    const byCode = new Map<CountryCode, { country: Country; feature: NEFeature }>()
    const groupCodes: Record<string, CountryCode[]> = {}

    for (const feature of sortedFeatures) {
      const p = feature.properties
      const code = resolveIso2(p)
      if (!code) continue
      if (byCode.has(code)) continue

      const continent = typeof p.CONTINENT === 'string' ? p.CONTINENT : 'Other'
      if (continent === 'Antarctica' || continent === 'Seven seas (open ocean)') continue

      const country: Country = {
        code,
        code3: resolveIso3(p) ?? code,
        name: typeof p.NAME === 'string' ? p.NAME : code,
        continent,
        subregion: typeof p.SUBREGION === 'string' ? p.SUBREGION : continent,
        population: typeof p.POP_EST === 'number' ? p.POP_EST : 0,
      }

      countries.push(country)
      byCode.set(code, { country, feature })

      if (GROUP_META[continent]) {
        const groupId = GROUP_META[continent].id
        if (!groupCodes[groupId]) groupCodes[groupId] = []
        groupCodes[groupId].push(code)
      }
    }

    countries.sort((a, b) => a.name.localeCompare(b.name))

    const groups: CountryGroup[] = GROUP_ORDER.flatMap((groupId) => {
      const meta = Object.values(GROUP_META).find((m) => m.id === groupId)
      if (!meta) return []
      const codes = (groupCodes[groupId] ?? []).slice().sort()
      if (codes.length === 0) return []
      return [{ id: meta.id, name: meta.name, description: meta.description, countries: codes }]
    })

    this.countries = countries
    this.byCode = byCode
    this.groups = groups

    logger.info(
      `[CountriesService] Loaded ${countries.length} countries across ${groups.length} groups`
    )
  }

  async list(): Promise<Country[]> {
    await this.ensureLoaded()
    return this.countries
  }

  async listGroups(): Promise<CountryGroup[]> {
    await this.ensureLoaded()
    return this.groups
  }

  /** Throws when a supplied code does not map to a known country. */
  async resolveCodes(codes: CountryCode[]): Promise<CountryCode[]> {
    await this.ensureLoaded()
    const normalized = [...new Set(codes.map((c) => c.toUpperCase()))].sort()
    const unknown = normalized.filter((c) => !this.byCode.has(c))
    if (unknown.length > 0) {
      throw new Error(`Unknown country code(s): ${unknown.join(', ')}`)
    }
    return normalized
  }

  /**
   * Filename is keyed on a hash of the sorted ISO codes + buffer size so
   * repeated calls with the same selection reuse the same path, and bumping
   * the buffer auto-invalidates stale files.
   */
  async writeRegionFile(codes: CountryCode[]): Promise<string> {
    await this.ensureLoaded()
    const resolved = await this.resolveCodes(codes)
    // v2 retains the original land polygon alongside the approximate coastal
    // buffer. The old buffer-only format could self-intersect around complex
    // coastlines and remove real land (verified in Vancouver/Burnaby).
    const key = `v2:b${REGION_BUFFER_DEGREES}:${resolved.join(',')}`
    const hash = createHash('sha1').update(key).digest('hex').slice(0, 12)

    const dir = resolve(tmpdir(), 'nomad-pmtiles-regions')
    await mkdir(dir, { recursive: true })
    const filepath = join(dir, `region-${hash}.geojson`)

    try {
      await access(filepath)
      return filepath
    } catch {}

    const fc = {
      type: 'FeatureCollection',
      features: resolved.flatMap((code) => {
        const entry = this.byCode.get(code)!
        return buildCountryRegionFeatures(
          code,
          entry.country.name,
          entry.feature.geometry,
          REGION_BUFFER_DEGREES
        )
      }),
    }

    await writeFile(filepath, JSON.stringify(fc))
    return filepath
  }
}

function typeRank(f: NEFeature): number {
  const t = typeof f.properties.TYPE === 'string' ? f.properties.TYPE : ''
  if (t === 'Sovereign country') return 0
  if (t === 'Country') return 1
  if (t === 'Sovereignty') return 2
  if (t === 'Disputed') return 3
  if (t === 'Dependency') return 4
  return 5
}

function resolveIso2(p: Record<string, any>): CountryCode | null {
  // Natural Earth's ISO_A2 sometimes holds political escapes like "CN-TW" for
  // Taiwan or "-99" for countries involved in disputes. Only accept clean
  // 2-letter codes; fall back to ISO_A2_EH (which reliably has the real code).
  const primary = typeof p.ISO_A2 === 'string' ? p.ISO_A2 : null
  if (primary && /^[A-Z]{2}$/i.test(primary)) return primary.toUpperCase()
  const fallback = typeof p.ISO_A2_EH === 'string' ? p.ISO_A2_EH : null
  if (fallback && /^[A-Z]{2}$/i.test(fallback)) return fallback.toUpperCase()
  return null
}

function resolveIso3(p: Record<string, any>): string | null {
  const primary = typeof p.ISO_A3 === 'string' ? p.ISO_A3 : null
  if (primary && primary !== '-99') return primary.toUpperCase()
  const fallback = typeof p.ISO_A3_EH === 'string' ? p.ISO_A3_EH : null
  if (fallback && fallback !== '-99') return fallback.toUpperCase()
  const adm = typeof p.ADM0_A3 === 'string' ? p.ADM0_A3 : null
  if (adm && adm !== '-99') return adm.toUpperCase()
  return null
}

