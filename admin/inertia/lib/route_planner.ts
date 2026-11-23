export type RouteTravelMode = 'driving' | 'walking' | 'cycling'
export type RoutePriority = 'fastest' | 'shorter'

export type RouteEndpoint = {
  kind: 'coordinates' | 'pin'
  value: string
}

export type RouteDraft = {
  start: RouteEndpoint
  destination: RouteEndpoint
  mode: RouteTravelMode
  priority: RoutePriority
  avoidHighways: boolean
  avoidTolls: boolean
}

export const EMPTY_ROUTE_DRAFT: RouteDraft = {
  start: { kind: 'coordinates', value: '' },
  destination: { kind: 'coordinates', value: '' },
  mode: 'driving',
  priority: 'fastest',
  avoidHighways: false,
  avoidTolls: false,
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

export const normalizeRouteDraft = (value: unknown): RouteDraft => {
  if (!value || typeof value !== 'object') return EMPTY_ROUTE_DRAFT
  const draft = value as Record<string, unknown>

  return {
    start: isEndpoint(draft.start) ? draft.start : EMPTY_ROUTE_DRAFT.start,
    destination: isEndpoint(draft.destination) ? draft.destination : EMPTY_ROUTE_DRAFT.destination,
    mode:
      draft.mode === 'walking' || draft.mode === 'cycling' || draft.mode === 'driving'
        ? draft.mode
        : 'driving',
    priority: draft.priority === 'shorter' ? 'shorter' : 'fastest',
    avoidHighways: draft.avoidHighways === true,
    avoidTolls: draft.avoidTolls === true,
  }
}

export const endpointIsReady = (endpoint: RouteEndpoint, availablePinIds: ReadonlySet<number>) => {
  if (endpoint.kind === 'coordinates') return parseRouteCoordinates(endpoint.value) !== null
  const pinId = Number(endpoint.value)
  return Number.isInteger(pinId) && availablePinIds.has(pinId)
}
