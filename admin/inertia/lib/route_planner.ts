export type RouteTravelMode = 'driving' | 'walking' | 'cycling'
export type RoutePriority = 'fastest' | 'shorter'
export type HighwayPreference = 'neutral' | 'avoid' | 'prefer'
export type RoutePickTarget = 'start' | 'destination' | `waypoint:${string}`

export type RouteEndpoint = {
  kind: 'coordinates' | 'pin'
  value: string
}

export type RouteWaypoint = {
  id: string
  endpoint: RouteEndpoint
}

export type RouteDraft = {
  start: RouteEndpoint
  waypoints: RouteWaypoint[]
  destination: RouteEndpoint
  mode: RouteTravelMode
  priority: RoutePriority
  highwayPreference: HighwayPreference
  avoidTolls: boolean
  avoidFerries: boolean
  avoidUnpaved: boolean
  avoidTracks: boolean
}

export type SavedRoutePlan = {
  id: string
  name: string
  draft: RouteDraft
  savedAt: string
}

export type OfflineRouteHealth = {
  available: boolean
  version: string | null
  snapshotDate: string | null
  coverage: string
  liveConditionsIncluded: false
}

export type OfflineRouteOption = {
  summary: {
    distanceMiles: number
    timeSeconds: number
    hasHighway: boolean
    hasToll: boolean
    hasFerry: boolean
  }
  legs: Array<{
    shape: string
    maneuvers: Array<{
      instruction: string
      distanceMiles: number
      timeSeconds: number
      beginShapeIndex: number
      endShapeIndex: number
    }>
  }>
  warnings: unknown[]
  snapshotDate: string | null
  liveConditionsIncluded: false
}

export type OfflineRouteResult = OfflineRouteOption & {
  alternates: OfflineRouteOption[]
}

export const ROUTING_SNAPSHOT_STALE_DAYS = 180

export const routingSnapshotAgeDays = (snapshotDate: string | null, now = new Date()) => {
  if (!snapshotDate) return null
  const snapshot = new Date(`${snapshotDate}T00:00:00Z`)
  if (Number.isNaN(snapshot.getTime()) || Number.isNaN(now.getTime())) return null

  const ageDays = Math.floor((now.getTime() - snapshot.getTime()) / 86_400_000)
  return ageDays >= 0 ? ageDays : 0
}

export const routingSnapshotIsStale = (snapshotDate: string | null, now = new Date()) => {
  const ageDays = routingSnapshotAgeDays(snapshotDate, now)
  return ageDays !== null && ageDays > ROUTING_SNAPSHOT_STALE_DAYS
}

const normalizeOfflineRouteOption = (value: unknown): OfflineRouteOption | null => {
  if (!value || typeof value !== 'object') return null
  const result = value as Record<string, unknown>
  const summary = result.summary as Record<string, unknown> | undefined
  if (
    !summary ||
    typeof summary.distanceMiles !== 'number' ||
    typeof summary.timeSeconds !== 'number' ||
    typeof summary.hasHighway !== 'boolean' ||
    typeof summary.hasToll !== 'boolean' ||
    typeof summary.hasFerry !== 'boolean' ||
    !Array.isArray(result.legs)
  ) {
    return null
  }

  const legs = result.legs.filter((leg): leg is OfflineRouteOption['legs'][number] => {
    if (!leg || typeof leg !== 'object') return false
    const candidate = leg as Record<string, unknown>
    return (
      typeof candidate.shape === 'string' &&
      Array.isArray(candidate.maneuvers) &&
      candidate.maneuvers.every((maneuver) => {
        if (!maneuver || typeof maneuver !== 'object') return false
        const item = maneuver as Record<string, unknown>
        return (
          typeof item.instruction === 'string' &&
          typeof item.distanceMiles === 'number' &&
          typeof item.timeSeconds === 'number' &&
          typeof item.beginShapeIndex === 'number' &&
          typeof item.endShapeIndex === 'number'
        )
      })
    )
  })
  if (legs.length !== result.legs.length) return null

  return {
    summary: summary as OfflineRouteOption['summary'],
    legs,
    warnings: Array.isArray(result.warnings) ? result.warnings : [],
    snapshotDate: typeof result.snapshotDate === 'string' ? result.snapshotDate : null,
    liveConditionsIncluded: false,
  }
}

export const normalizeOfflineRouteResult = (value: unknown): OfflineRouteResult | null => {
  const primary = normalizeOfflineRouteOption(value)
  if (!primary || !value || typeof value !== 'object') return null
  const rawAlternates = (value as Record<string, unknown>).alternates
  const alternates = Array.isArray(rawAlternates)
    ? rawAlternates.map(normalizeOfflineRouteOption)
    : []
  if (alternates.some((alternate) => alternate === null)) return null

  return {
    ...primary,
    alternates: alternates as OfflineRouteOption[],
  }
}

export const EMPTY_ROUTE_DRAFT: RouteDraft = {
  start: { kind: 'coordinates', value: '' },
  waypoints: [],
  destination: { kind: 'coordinates', value: '' },
  mode: 'driving',
  priority: 'fastest',
  highwayPreference: 'neutral',
  avoidTolls: false,
  avoidFerries: false,
  avoidUnpaved: false,
  avoidTracks: false,
}

export const parseRouteCoordinates = (value: string) => {
  const parts = value.split(',').map((part) => part.trim())
  if (parts.length !== 2 || parts.some((part) => part === '')) return null

  const latitude = Number(parts[0])
  const longitude = Number(parts[1])
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null
  }

  return { latitude, longitude }
}

const isEndpoint = (value: unknown): value is RouteEndpoint => {
  if (!value || typeof value !== 'object') return false
  const endpoint = value as Record<string, unknown>
  return (
    (endpoint.kind === 'coordinates' || endpoint.kind === 'pin') &&
    typeof endpoint.value === 'string'
  )
}

const normalizeWaypoints = (value: unknown): RouteWaypoint[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter((waypoint): waypoint is Record<string, unknown> => {
      return Boolean(waypoint) && typeof waypoint === 'object'
    })
    .filter((waypoint) => typeof waypoint.id === 'string' && isEndpoint(waypoint.endpoint))
    .slice(0, 3)
    .map((waypoint) => ({
      id: waypoint.id as string,
      endpoint: waypoint.endpoint as RouteEndpoint,
    }))
}

export const normalizeRouteDraft = (value: unknown): RouteDraft => {
  if (!value || typeof value !== 'object') return EMPTY_ROUTE_DRAFT
  const draft = value as Record<string, unknown>

  return {
    start: isEndpoint(draft.start) ? draft.start : EMPTY_ROUTE_DRAFT.start,
    waypoints: normalizeWaypoints(draft.waypoints),
    destination: isEndpoint(draft.destination) ? draft.destination : EMPTY_ROUTE_DRAFT.destination,
    mode:
      draft.mode === 'walking' || draft.mode === 'cycling' || draft.mode === 'driving'
        ? draft.mode
        : 'driving',
    priority: draft.priority === 'shorter' ? 'shorter' : 'fastest',
    highwayPreference:
      draft.highwayPreference === 'avoid' || draft.highwayPreference === 'prefer'
        ? draft.highwayPreference
        : draft.avoidHighways === true
          ? 'avoid'
          : 'neutral',
    avoidTolls: draft.avoidTolls === true,
    avoidFerries: draft.avoidFerries === true,
    avoidUnpaved: draft.avoidUnpaved === true,
    avoidTracks: draft.avoidTracks === true,
  }
}

export const normalizeSavedRoutePlans = (value: unknown): SavedRoutePlan[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter((plan): plan is Record<string, unknown> => Boolean(plan) && typeof plan === 'object')
    .filter(
      (plan) =>
        typeof plan.id === 'string' &&
        typeof plan.name === 'string' &&
        plan.name.trim().length > 0 &&
        typeof plan.savedAt === 'string' &&
        Boolean(plan.draft) &&
        typeof plan.draft === 'object'
    )
    .slice(0, 20)
    .map((plan) => ({
      id: plan.id as string,
      name: (plan.name as string).trim().slice(0, 80),
      draft: normalizeRouteDraft(plan.draft),
      savedAt: plan.savedAt as string,
    }))
}

export const formatRouteCoordinates = (latitude: number, longitude: number) =>
  `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`

export const endpointIsReady = (endpoint: RouteEndpoint, availablePinIds: ReadonlySet<number>) => {
  if (endpoint.kind === 'coordinates') return parseRouteCoordinates(endpoint.value) !== null
  const pinId = Number(endpoint.value)
  return Number.isInteger(pinId) && availablePinIds.has(pinId)
}

export const resolveRouteEndpoint = (
  endpoint: RouteEndpoint,
  pins: ReadonlyMap<number, { latitude: number; longitude: number }>
) => {
  if (endpoint.kind === 'coordinates') return parseRouteCoordinates(endpoint.value)
  const pin = pins.get(Number(endpoint.value))
  return pin ? { latitude: pin.latitude, longitude: pin.longitude } : null
}

// Valhalla emits encoded polylines with six decimal digits, not Google's common
// five-digit variant. Return MapLibre's [longitude, latitude] coordinate order.
export const decodeValhallaPolyline6 = (encoded: string): [number, number][] => {
  const coordinates: [number, number][] = []
  let index = 0
  let latitude = 0
  let longitude = 0

  const decodeValue = () => {
    let result = 0
    let shift = 0
    let byte = 0
    do {
      if (index >= encoded.length) throw new Error('Invalid route geometry')
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    return result & 1 ? ~(result >> 1) : result >> 1
  }

  while (index < encoded.length) {
    latitude += decodeValue()
    longitude += decodeValue()
    coordinates.push([longitude / 1e6, latitude / 1e6])
  }
  return coordinates
}

const xmlEscape = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;',
    }
    return entities[character]
  })

export const routeResultToGpx = (result: OfflineRouteOption, name: string) => {
  const points = result.legs.flatMap((leg, legIndex) => {
    const decoded = decodeValhallaPolyline6(leg.shape)
    return legIndex === 0 ? decoded : decoded.slice(1)
  })
  const track = points
    .map(([longitude, latitude]) => `      <trkpt lat="${latitude}" lon="${longitude}" />`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Project NOMAD" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${xmlEscape(name)}</name></metadata>
  <trk>
    <name>${xmlEscape(name)}</name>
    <trkseg>
${track}
    </trkseg>
  </trk>
</gpx>
`
}

export const routeResultToText = (result: OfflineRouteOption, name: string) => {
  const minutes = Math.max(1, Math.round(result.summary.timeSeconds / 60))
  const directions = result.legs
    .flatMap((leg) => leg.maneuvers)
    .map(
      (maneuver, index) =>
        `${index + 1}. ${maneuver.instruction}${
          maneuver.distanceMiles > 0 ? ` (${maneuver.distanceMiles.toFixed(1)} mi)` : ''
        }`
    )
    .join('\n')
  return `${name}
${result.summary.distanceMiles.toFixed(1)} miles · ${minutes} minutes
Offline map snapshot: ${result.snapshotDate ?? 'date unavailable'}

IMPORTANT: This route contains no live closures, traffic, evacuation orders, fires, weather, or road damage. Verify conditions when live information is available.

${directions}
`
}
