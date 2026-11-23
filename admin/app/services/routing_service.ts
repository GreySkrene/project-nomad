export type OfflineRouteRequest = {
  locations: Array<{ latitude: number; longitude: number }>
  mode: 'driving' | 'walking' | 'cycling'
  priority: 'fastest' | 'shorter'
  highwayPreference: 'neutral' | 'avoid' | 'prefer'
  avoidTolls: boolean
  avoidFerries: boolean
  avoidUnpaved: boolean
  avoidTracks: boolean
}

type ValhallaManeuver = {
  instruction?: unknown
  length?: unknown
  time?: unknown
  begin_shape_index?: unknown
  end_shape_index?: unknown
}

type ValhallaLeg = {
  shape?: unknown
  maneuvers?: unknown
}

type ValhallaTrip = {
  summary?: Record<string, unknown>
  legs?: unknown
  warnings?: unknown
  status_message?: unknown
}

const DEFAULT_ROUTING_URL = 'http://routing:8002'
const MAX_DIRECT_DISTANCE_MILES = 1_000
const REQUEST_TIMEOUT_MS = 30_000

const finiteNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const greatCircleMiles = (
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number }
) => {
  const radians = (degrees: number) => (degrees * Math.PI) / 180
  const lat1 = radians(first.latitude)
  const lat2 = radians(second.latitude)
  const deltaLat = lat2 - lat1
  const deltaLon = radians(second.longitude - first.longitude)
  const a =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2
  return 3_958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const validateRouteSpan = (locations: OfflineRouteRequest['locations']) => {
  let directMiles = 0
  for (let index = 1; index < locations.length; index += 1) {
    directMiles += greatCircleMiles(locations[index - 1], locations[index])
  }
  if (directMiles > MAX_DIRECT_DISTANCE_MILES) {
    throw new Error(
      `Requested route spans about ${Math.round(directMiles)} miles, beyond the installed regional routing limit.`
    )
  }
}

export const toValhallaRouteRequest = (request: OfflineRouteRequest) => {
  const costing =
    request.mode === 'walking' ? 'pedestrian' : request.mode === 'cycling' ? 'bicycle' : 'auto'
  const useHighways =
    request.highwayPreference === 'avoid' ? 0 : request.highwayPreference === 'prefer' ? 1 : 0.5

  const costingOptions: Record<string, boolean | number> = {
    shortest: request.priority === 'shorter',
    use_ferry: request.avoidFerries ? 0 : 0.5,
  }

  if (costing === 'auto') {
    costingOptions.use_highways = useHighways
    costingOptions.use_tolls = request.avoidTolls ? 0 : 0.5
    costingOptions.use_tracks = request.avoidTracks ? 0 : 0.5
    costingOptions.exclude_unpaved = request.avoidUnpaved
  }

  return {
    locations: request.locations.map((location) => ({
      lat: location.latitude,
      lon: location.longitude,
      type: 'break',
    })),
    costing,
    costing_options: { [costing]: costingOptions },
    units: 'miles',
    language: 'en-US',
    directions_type: 'instructions',
    alternates: request.locations.length === 2 ? 1 : 0,
  }
}

const normalizeManeuvers = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value.map((raw) => {
    const maneuver = (raw ?? {}) as ValhallaManeuver
    return {
      instruction: typeof maneuver.instruction === 'string' ? maneuver.instruction : 'Continue',
      distanceMiles: finiteNumber(maneuver.length),
      timeSeconds: finiteNumber(maneuver.time),
      beginShapeIndex: finiteNumber(maneuver.begin_shape_index),
      endShapeIndex: finiteNumber(maneuver.end_shape_index),
    }
  })
}

export const normalizeValhallaResponse = (value: unknown, snapshotDate: string | null) => {
  if (!value || typeof value !== 'object') throw new Error('Routing engine returned invalid data.')
  const root = value as { trip?: unknown; alternates?: unknown }
  const trip = root.trip as ValhallaTrip | undefined
  if (!trip || !Array.isArray(trip.legs)) throw new Error('Routing engine returned no route legs.')

  const legs = (trip.legs as ValhallaLeg[]).map((leg) => {
    if (typeof leg.shape !== 'string') throw new Error('Routing engine omitted route geometry.')
    return { shape: leg.shape, maneuvers: normalizeManeuvers(leg.maneuvers) }
  })
  const summary = trip.summary ?? {}

  return {
    summary: {
      distanceMiles: finiteNumber(summary.length),
      timeSeconds: finiteNumber(summary.time),
      hasHighway: summary.has_highway === true,
      hasToll: summary.has_toll === true,
      hasFerry: summary.has_ferry === true,
    },
    legs,
    warnings: Array.isArray(trip.warnings) ? trip.warnings : [],
    snapshotDate,
    liveConditionsIncluded: false,
  }
}

export class RoutingService {
  private readonly baseUrl = (process.env.ROUTING_URL || DEFAULT_ROUTING_URL).replace(/\/$/, '')
  private readonly snapshotDate = process.env.ROUTING_SNAPSHOT_DATE || null

  async health() {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2_000)
    try {
      const response = await fetch(`${this.baseUrl}/status`, { signal: controller.signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const status = (await response.json()) as Record<string, unknown>
      return {
        available: true,
        version: typeof status.version === 'string' ? status.version : null,
        snapshotDate: this.snapshotDate,
        coverage: 'Utah and Idaho',
        liveConditionsIncluded: false,
      }
    } catch {
      return {
        available: false,
        version: null,
        snapshotDate: this.snapshotDate,
        coverage: 'Utah and Idaho',
        liveConditionsIncluded: false,
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  async route(request: OfflineRouteRequest) {
    validateRouteSpan(request.locations)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch(`${this.baseUrl}/route`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toValhallaRouteRequest(request)),
        signal: controller.signal,
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          body &&
          typeof body === 'object' &&
          typeof (body as { error?: unknown }).error === 'string'
            ? (body as { error: string }).error
            : `Routing engine returned HTTP ${response.status}.`
        throw new Error(message)
      }
      return normalizeValhallaResponse(body, this.snapshotDate)
    } finally {
      clearTimeout(timeout)
    }
  }
}
