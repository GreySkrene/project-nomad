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
