import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  IconAlertTriangle,
  IconArrowsExchange,
  IconCheck,
  IconDownload,
  IconLoader2,
  IconPrinter,
  IconRoute,
  IconX,
} from '@tabler/icons-react'

import type { MapMarker } from '~/hooks/useMapMarkers'
import {
  EMPTY_ROUTE_DRAFT,
  endpointIsReady,
  formatRouteCoordinates,
  normalizeRouteDraft,
  normalizeOfflineRouteResult,
  normalizeSavedRoutePlans,
  parseRouteCoordinates,
  resolveRouteEndpoint,
  routeResultToGpx,
  routeResultToText,
} from '~/lib/route_planner'
import type {
  RouteDraft,
  RouteEndpoint,
  OfflineRouteHealth,
  OfflineRouteOption,
  OfflineRouteResult,
  RoutePickTarget,
  SavedRoutePlan,
} from '~/lib/route_planner'

const ROUTE_DRAFT_KEY = 'nomad:route-draft'
const SAVED_ROUTE_PLANS_KEY = 'nomad:saved-route-plans'
const LAST_ROUTE_RESULT_KEY = 'nomad:last-route-result'
const LAST_ROUTE_SELECTION_KEY = 'nomad:last-route-selection'

const downloadTextFile = (contents: string, filename: string, type: string) => {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

type EndpointEditorProps = {
  label: string
  endpoint: RouteEndpoint
  markers: MapMarker[]
  onChange: (endpoint: RouteEndpoint) => void
  onShow: (longitude: number, latitude: number) => void
  onPickFromMap: () => void
  pickingFromMap: boolean
}

function EndpointEditor({
  label,
  endpoint,
  markers,
  onChange,
  onShow,
  onPickFromMap,
  pickingFromMap,
}: EndpointEditorProps) {
  const coordinate = endpoint.kind === 'coordinates' ? parseRouteCoordinates(endpoint.value) : null
  const pin =
    endpoint.kind === 'pin'
      ? (markers.find((marker) => marker.id === Number(endpoint.value)) ?? null)
      : null
  const hasValue = endpoint.value.trim() !== ''
  const invalid = hasValue && !coordinate && !pin

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
        {label}
      </legend>
      <div className="grid grid-cols-[7.25rem_1fr] gap-2">
        <select
          value={endpoint.kind}
          onChange={(event) =>
            onChange({ kind: event.target.value as RouteEndpoint['kind'], value: '' })
          }
          className="rounded border border-border-default bg-surface-primary px-2 py-2 text-sm text-text-primary focus:border-desert-green focus:outline-none"
          aria-label={`${label} type`}
        >
          <option value="coordinates">Coordinates</option>
          <option value="pin">Saved pin</option>
        </select>

        {endpoint.kind === 'pin' ? (
          <select
            value={endpoint.value}
            onChange={(event) => onChange({ ...endpoint, value: event.target.value })}
            className="min-w-0 rounded border border-border-default bg-surface-primary px-2 py-2 text-sm text-text-primary focus:border-desert-green focus:outline-none"
            aria-label={`${label} saved pin`}
          >
            <option value="">Choose a saved pin</option>
            {markers.map((marker) => (
              <option key={marker.id} value={marker.id}>
                {marker.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={endpoint.value}
            onChange={(event) => onChange({ ...endpoint, value: event.target.value })}
            placeholder="40.6097, -111.9391"
            inputMode="decimal"
            className={`min-w-0 rounded border bg-surface-primary px-2 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none ${
              invalid
                ? 'border-desert-red focus:border-desert-red'
                : 'border-border-default focus:border-desert-green'
            }`}
            aria-label={`${label} coordinates`}
            aria-invalid={invalid}
          />
        )}
      </div>

      <div className="flex min-h-5 items-center justify-between gap-2 text-xs">
        <span className={invalid ? 'text-desert-red' : 'text-text-muted'}>
          {invalid
            ? endpoint.kind === 'pin'
              ? 'That saved pin is no longer available.'
              : 'Use latitude, longitude within valid ranges.'
            : endpoint.kind === 'pin' && markers.length === 0
              ? 'Create a map pin first, or use coordinates.'
              : 'Stored on this device for offline use.'}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onPickFromMap}
            className={`font-semibold hover:underline ${
              pickingFromMap ? 'text-amber-500' : 'text-desert-orange'
            }`}
          >
            {pickingFromMap ? 'Cancel pick' : 'Pick on map'}
          </button>
          {(coordinate || pin) && (
            <button
              type="button"
              onClick={() =>
                onShow(
                  coordinate?.longitude ?? pin!.longitude,
                  coordinate?.latitude ?? pin!.latitude
                )
              }
              className="font-semibold text-desert-orange hover:underline"
            >
              Show
            </button>
          )}
        </span>
      </div>
    </fieldset>
  )
}

export default function RoutePlannerPanel({
  markers,
  onFlyTo,
  onRequestMapPick,
  mapPickTarget,
  pickedMapPoint,
  onRouteResult,
}: {
  markers: MapMarker[]
  onFlyTo: (longitude: number, latitude: number) => void
  onRequestMapPick: (target: RoutePickTarget | null) => void
  mapPickTarget: RoutePickTarget | null
  pickedMapPoint: {
    id: number
    target: RoutePickTarget
    longitude: number
    latitude: number
  } | null
  onRouteResult: (result: OfflineRouteOption | null, alternates: OfflineRouteOption[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<RouteDraft>(() => {
    try {
      const saved = localStorage.getItem(ROUTE_DRAFT_KEY)
      return saved ? normalizeRouteDraft(JSON.parse(saved)) : EMPTY_ROUTE_DRAFT
    } catch {
      return EMPTY_ROUTE_DRAFT
    }
  })
  const [routeName, setRouteName] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [savedPlans, setSavedPlans] = useState<SavedRoutePlan[]>(() => {
    try {
      const saved = localStorage.getItem(SAVED_ROUTE_PLANS_KEY)
      return saved ? normalizeSavedRoutePlans(JSON.parse(saved)) : []
    } catch {
      return []
    }
  })
  const [routingHealth, setRoutingHealth] = useState<OfflineRouteHealth | null>(null)
  const [routeResult, setRouteResult] = useState<OfflineRouteResult | null>(() => {
    try {
      const saved = localStorage.getItem(LAST_ROUTE_RESULT_KEY)
      return saved ? normalizeOfflineRouteResult(JSON.parse(saved)) : null
    } catch {
      return null
    }
  })
  const [routingError, setRoutingError] = useState<string | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(() => {
    const stored = Number(localStorage.getItem(LAST_ROUTE_SELECTION_KEY))
    return Number.isInteger(stored) && stored >= 0 ? stored : 0
  })

  const routeOptions = useMemo(
    () => (routeResult ? [routeResult, ...routeResult.alternates] : []),
    [routeResult]
  )
  const selectedRoute = routeOptions[selectedRouteIndex] ?? routeOptions[0] ?? null

  useEffect(() => {
    let cancelled = false
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/maps/routing/health')
        const result = (await response.json()) as OfflineRouteHealth
        if (!cancelled) setRoutingHealth(result)
      } catch {
        if (!cancelled) {
          setRoutingHealth({
            available: false,
            version: null,
            snapshotDate: null,
            coverage: 'Utah and Idaho',
            liveConditionsIncluded: false,
          })
        }
      }
    }
    void checkHealth()
    const interval = window.setInterval(checkHealth, 30_000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(ROUTE_DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // The planner still works for this session when storage is unavailable.
    }
  }, [draft])

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_ROUTE_PLANS_KEY, JSON.stringify(savedPlans))
    } catch {
      // Saved plans remain available for this session if browser storage fails.
    }
  }, [savedPlans])

  useEffect(() => {
    try {
      if (routeResult) localStorage.setItem(LAST_ROUTE_RESULT_KEY, JSON.stringify(routeResult))
      else localStorage.removeItem(LAST_ROUTE_RESULT_KEY)
    } catch {
      // The last result remains available for this session if browser storage fails.
    }
    if (selectedRouteIndex >= routeOptions.length && routeOptions.length > 0) {
      setSelectedRouteIndex(0)
      return
    }
    try {
      localStorage.setItem(LAST_ROUTE_SELECTION_KEY, String(selectedRouteIndex))
    } catch {
      // Selection still works for this session if browser storage fails.
    }
    onRouteResult(
      selectedRoute,
      routeOptions.filter((_, index) => index !== selectedRouteIndex)
    )
  }, [routeResult, routeOptions, selectedRoute, selectedRouteIndex, onRouteResult])

  useEffect(() => {
    if (!pickedMapPoint) return
    const endpoint: RouteEndpoint = {
      kind: 'coordinates',
      value: formatRouteCoordinates(pickedMapPoint.latitude, pickedMapPoint.longitude),
    }
    if (pickedMapPoint.target.startsWith('waypoint:')) {
      updateWaypoint(pickedMapPoint.target.slice('waypoint:'.length), endpoint)
    } else {
      updateEndpoint(pickedMapPoint.target, endpoint)
    }
  }, [pickedMapPoint])

  const availablePinIds = useMemo(() => new Set(markers.map((marker) => marker.id)), [markers])
  const endpointsReady =
    endpointIsReady(draft.start, availablePinIds) &&
    endpointIsReady(draft.destination, availablePinIds) &&
    draft.waypoints.every((waypoint) => endpointIsReady(waypoint.endpoint, availablePinIds))
  const pinCoordinates = useMemo(
    () =>
      new Map(
        markers.map((marker) => [
          marker.id,
          { latitude: marker.latitude, longitude: marker.longitude },
        ])
      ),
    [markers]
  )

  const calculateRoute = async () => {
    if (!endpointsReady || !routingHealth?.available || isCalculating) return
    const endpoints = [
      draft.start,
      ...draft.waypoints.map((item) => item.endpoint),
      draft.destination,
    ]
    const locations = endpoints.map((endpoint) => resolveRouteEndpoint(endpoint, pinCoordinates))
    if (locations.some((location) => !location)) return

    setIsCalculating(true)
    setRoutingError(null)
    try {
      const response = await fetch('/api/maps/routing/route', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          locations,
          mode: draft.mode,
          priority: draft.priority,
          highwayPreference: draft.highwayPreference,
          avoidTolls: draft.avoidTolls,
          avoidFerries: draft.avoidFerries,
          avoidUnpaved: draft.avoidUnpaved,
          avoidTracks: draft.avoidTracks,
        }),
      })
      const body = (await response.json()) as OfflineRouteResult | { message?: string }
      if (!response.ok) {
        throw new Error(
          'message' in body && body.message ? body.message : 'Route calculation failed.'
        )
      }
      const result = normalizeOfflineRouteResult(body)
      if (!result) throw new Error('Routing engine returned an unreadable route response.')
      setSelectedRouteIndex(0)
      setRouteResult(result)
    } catch (error) {
      setRoutingError(error instanceof Error ? error.message : 'Route calculation failed.')
    } finally {
      setIsCalculating(false)
    }
  }

  const updateEndpoint = (key: 'start' | 'destination', endpoint: RouteEndpoint) => {
    setDraft((current) => ({ ...current, [key]: endpoint }))
  }

  const updateWaypoint = (id: string, endpoint: RouteEndpoint) => {
    setDraft((current) => ({
      ...current,
      waypoints: current.waypoints.map((waypoint) =>
        waypoint.id === id ? { ...waypoint, endpoint } : waypoint
      ),
    }))
  }

  const addWaypoint = () => {
    if (draft.waypoints.length >= 3) return
    const id = `${Date.now()}-${draft.waypoints.length}`
    setDraft((current) => ({
      ...current,
      waypoints: [...current.waypoints, { id, endpoint: { kind: 'coordinates', value: '' } }],
    }))
  }

  const saveNamedPlan = () => {
    const name = routeName.trim()
    if (!name) return
    const existing = savedPlans.find((plan) => plan.name.toLowerCase() === name.toLowerCase())
    const plan: SavedRoutePlan = {
      id: existing?.id ?? `${Date.now()}`,
      name: name.slice(0, 80),
      draft,
      savedAt: new Date().toISOString(),
    }
    setSavedPlans((current) =>
      [plan, ...current.filter((item) => item.id !== plan.id)].slice(0, 20)
    )
    setSelectedPlanId(plan.id)
    setRouteName(plan.name)
  }

  const loadSelectedPlan = () => {
    const plan = savedPlans.find((item) => item.id === selectedPlanId)
    if (!plan) return
    onRequestMapPick(null)
    setDraft(plan.draft)
    setRouteName(plan.name)
  }

  const deleteSelectedPlan = () => {
    const plan = savedPlans.find((item) => item.id === selectedPlanId)
    if (!plan || !window.confirm(`Delete saved route setup "${plan.name}"?`)) return
    setSavedPlans((current) => current.filter((item) => item.id !== plan.id))
    setSelectedPlanId('')
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute right-4 top-[72px] z-40 flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-primary/95 px-3 py-2 shadow-lg backdrop-blur-sm transition-colors hover:bg-surface-secondary"
        title="Open route planner setup"
      >
        <IconRoute size={18} className="text-desert-orange" />
        <span className="text-sm font-semibold text-text-primary">Routes</span>
        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">
          Setup
        </span>
      </button>
    )
  }

  return (
    <section className="nomad-route-panel absolute right-4 top-[72px] z-40 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border-subtle bg-surface-primary/95 shadow-xl backdrop-blur-sm">
      <header className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <IconRoute size={20} className="text-desert-orange" />
          <div>
            <h2 className="text-sm font-bold text-text-primary">Offline Route Planner</h2>
            <p className="text-[11px] uppercase tracking-[0.1em] text-text-muted">Draft setup</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onRequestMapPick(null)
            setOpen(false)
          }}
          className="rounded p-1 text-text-muted hover:bg-surface-secondary hover:text-text-primary"
          aria-label="Close route planner"
        >
          <IconX size={18} />
        </button>
      </header>

      <div className="nomad-route-panel-content max-h-[calc(100vh-9rem)] space-y-4 overflow-y-auto p-4">
        <div
          className={`flex gap-2 rounded border p-3 text-xs leading-5 text-text-secondary ${
            routingHealth?.available
              ? 'border-desert-green/50 bg-desert-green/10'
              : 'border-amber-500/50 bg-amber-500/10'
          }`}
        >
          {routingHealth?.available ? (
            <IconCheck className="mt-0.5 shrink-0 text-desert-green" size={18} />
          ) : (
            <IconAlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={18} />
          )}
          <p>
            <strong className="block text-text-primary">
              {routingHealth?.available
                ? `Offline routing ready — ${routingHealth.coverage}`
                : routingHealth
                  ? 'Offline routing service is unavailable.'
                  : 'Checking the offline routing service…'}
            </strong>
            {routingHealth?.available
              ? `OSM snapshot ${routingHealth.snapshotDate ?? 'date unavailable'}. No live traffic, closures, fires, weather, or road damage.`
              : 'Saved route setups remain usable, but calculation requires the local Utah/Idaho graph.'}
          </p>
        </div>

        <section className="space-y-2 rounded border border-border-subtle bg-surface-secondary/70 p-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
              Saved route setups
            </h3>
            <p className="text-[11px] text-text-muted">
              Endpoints and preferences only; these are not calculated directions.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={routeName}
              maxLength={80}
              onChange={(event) => setRouteName(event.target.value)}
              placeholder="Example: Home to Marysvale"
              className="min-w-0 flex-1 rounded border border-border-default bg-surface-primary px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted"
              aria-label="Route setup name"
            />
            <button
              type="button"
              onClick={saveNamedPlan}
              disabled={!routeName.trim()}
              className="rounded bg-desert-green px-3 py-1.5 text-xs font-bold text-white hover:bg-btn-green-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>
          </div>
          {savedPlans.length > 0 && (
            <div className="grid grid-cols-[1fr_auto_auto] gap-2">
              <select
                value={selectedPlanId}
                onChange={(event) => setSelectedPlanId(event.target.value)}
                className="min-w-0 rounded border border-border-default bg-surface-primary px-2 py-1.5 text-xs text-text-primary"
                aria-label="Saved route setup"
              >
                <option value="">Choose saved setup</option>
                {savedPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={loadSelectedPlan}
                disabled={!selectedPlanId}
                className="rounded border border-border-default px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-surface-primary disabled:opacity-50"
              >
                Load
              </button>
              <button
                type="button"
                onClick={deleteSelectedPlan}
                disabled={!selectedPlanId}
                className="rounded border border-desert-red/50 px-2 py-1 text-xs font-semibold text-desert-red hover:bg-desert-red/10 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          )}
        </section>

        <EndpointEditor
          label="Start"
          endpoint={draft.start}
          markers={markers}
          onChange={(endpoint) => updateEndpoint('start', endpoint)}
          onShow={onFlyTo}
          onPickFromMap={() => onRequestMapPick(mapPickTarget === 'start' ? null : 'start')}
          pickingFromMap={mapPickTarget === 'start'}
        />

        <button
          type="button"
          onClick={() =>
            setDraft((current) => ({
              ...current,
              start: current.destination,
              destination: current.start,
              waypoints: [...current.waypoints].reverse(),
            }))
          }
          className="mx-auto flex items-center gap-1.5 rounded border border-border-default px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-secondary"
        >
          <IconArrowsExchange size={15} />
          Swap endpoints
        </button>

        <div className="space-y-3 border-y border-border-subtle py-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary">
                Waypoints
              </h3>
              <p className="text-[11px] text-text-muted">Optional stops, in travel order.</p>
            </div>
            <button
              type="button"
              onClick={addWaypoint}
              disabled={draft.waypoints.length >= 3}
              className="rounded border border-border-default px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add stop
            </button>
          </div>

          {draft.waypoints.length === 0 ? (
            <p className="rounded border border-dashed border-border-default px-3 py-2 text-xs text-text-muted">
              No intermediate stops.
            </p>
          ) : (
            draft.waypoints.map((waypoint, index) => {
              const target: RoutePickTarget = `waypoint:${waypoint.id}`
              return (
                <div key={waypoint.id} className="rounded border border-border-subtle p-2">
                  <EndpointEditor
                    label={`Stop ${index + 1}`}
                    endpoint={waypoint.endpoint}
                    markers={markers}
                    onChange={(endpoint) => updateWaypoint(waypoint.id, endpoint)}
                    onShow={onFlyTo}
                    onPickFromMap={() => onRequestMapPick(mapPickTarget === target ? null : target)}
                    pickingFromMap={mapPickTarget === target}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        waypoints: current.waypoints.filter((item) => item.id !== waypoint.id),
                      }))
                    }
                    className="mt-1 text-xs font-semibold text-desert-red hover:underline"
                  >
                    Remove stop
                  </button>
                </div>
              )
            })
          )}
        </div>

        <EndpointEditor
          label="Destination"
          endpoint={draft.destination}
          markers={markers}
          onChange={(endpoint) => updateEndpoint('destination', endpoint)}
          onShow={onFlyTo}
          onPickFromMap={() =>
            onRequestMapPick(mapPickTarget === 'destination' ? null : 'destination')
          }
          pickingFromMap={mapPickTarget === 'destination'}
        />

        <div className="grid grid-cols-2 gap-3 border-t border-border-subtle pt-4">
          <label className="space-y-1 text-xs font-semibold text-text-secondary">
            Travel mode
            <select
              value={draft.mode}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  mode: event.target.value as RouteDraft['mode'],
                }))
              }
              className="block w-full rounded border border-border-default bg-surface-primary px-2 py-2 text-sm font-normal text-text-primary"
            >
              <option value="driving">Driving</option>
              <option value="walking">Walking</option>
              <option value="cycling">Cycling</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-text-secondary">
            Preference
            <select
              value={draft.priority}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  priority: event.target.value as RouteDraft['priority'],
                }))
              }
              className="block w-full rounded border border-border-default bg-surface-primary px-2 py-2 text-sm font-normal text-text-primary"
            >
              <option value="fastest">Fastest</option>
              <option value="shorter">Shorter</option>
            </select>
          </label>
        </div>

        <label className="block space-y-1 text-xs font-semibold text-text-secondary">
          Highway use
          <select
            value={draft.highwayPreference}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                highwayPreference: event.target.value as RouteDraft['highwayPreference'],
              }))
            }
            className="block w-full rounded border border-border-default bg-surface-primary px-2 py-2 text-sm font-normal text-text-primary"
          >
            <option value="neutral">No preference</option>
            <option value="avoid">Prefer routes without highways</option>
            <option value="prefer">Prefer highways</option>
          </select>
          <small className="block font-normal text-text-muted">
            Preference, not a safety guarantee.
          </small>
        </label>

        <div className="space-y-2">
          {[
            ['avoidTolls', 'Prefer routes without tolls'],
            ['avoidFerries', 'Prefer routes without ferries'],
            ['avoidUnpaved', 'Prefer paved roads'],
            ['avoidTracks', 'Prefer routes without tracks'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-start gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={
                  draft[key as 'avoidTolls' | 'avoidFerries' | 'avoidUnpaved' | 'avoidTracks']
                }
                onChange={(event) =>
                  setDraft((current) => ({ ...current, [key]: event.target.checked }))
                }
                className="mt-0.5 h-4 w-4 accent-desert-orange"
              />
              <span>
                {label}
                <small className="block text-text-muted">Preference, not a safety guarantee.</small>
              </span>
            </label>
          ))}
        </div>

        <button
          type="button"
          disabled={!endpointsReady || !routingHealth?.available || isCalculating}
          onClick={calculateRoute}
          className="flex w-full items-center justify-center gap-2 rounded bg-desert-green px-4 py-2.5 text-sm font-bold text-white hover:bg-btn-green-hover disabled:cursor-not-allowed disabled:bg-text-muted/25 disabled:text-text-muted"
          title={
            routingHealth?.available
              ? 'Calculate entirely offline'
              : 'Offline routing service unavailable'
          }
        >
          {isCalculating && <IconLoader2 className="animate-spin" size={17} />}
          {isCalculating
            ? 'Calculating…'
            : !endpointsReady
              ? 'Choose valid endpoints'
              : routingHealth?.available
                ? 'Calculate offline route'
                : 'Routing engine unavailable'}
        </button>

        {routingError && (
          <div
            role="alert"
            className="rounded border border-desert-red/50 bg-desert-red/10 p-3 text-xs text-desert-red"
          >
            {routingError}
          </div>
        )}

        {selectedRoute && (
          <section className="space-y-3 rounded border border-desert-green/40 bg-surface-secondary/70 p-3">
            {routeOptions.length > 1 && (
              <div className="grid grid-cols-2 gap-2" aria-label="Available offline routes">
                {routeOptions.map((option, index) => {
                  const extraMinutes = Math.max(
                    0,
                    Math.round(
                      (option.summary.timeSeconds - routeOptions[0].summary.timeSeconds) / 60
                    )
                  )
                  return (
                    <button
                      key={`${index}-${option.summary.distanceMiles}-${option.summary.timeSeconds}`}
                      type="button"
                      onClick={() => setSelectedRouteIndex(index)}
                      aria-pressed={selectedRouteIndex === index}
                      className={`rounded border px-2.5 py-2 text-left transition-colors ${
                        selectedRouteIndex === index
                          ? 'border-desert-orange bg-desert-orange/10 text-text-primary'
                          : 'border-border-default bg-surface-primary text-text-secondary hover:border-desert-orange/60'
                      }`}
                    >
                      <span className="block text-xs font-bold">
                        {index === 0 ? 'Primary route' : `Alternate ${index}`}
                      </span>
                      <span className="block text-[11px] text-text-muted">
                        {option.summary.distanceMiles.toFixed(1)} mi ·{' '}
                        {Math.max(1, Math.round(option.summary.timeSeconds / 60))} min
                        {index > 0 && extraMinutes > 0 ? ` · +${extraMinutes} min` : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                {selectedRoute.summary.distanceMiles.toFixed(1)} miles ·{' '}
                {Math.max(1, Math.round(selectedRoute.summary.timeSeconds / 60))} minutes
              </h3>
              <p className="text-[11px] text-text-muted">
                {selectedRouteIndex === 0 ? 'Primary' : `Alternate ${selectedRouteIndex}`} route ·
                calculated from the offline {selectedRoute.snapshotDate ?? 'installed'} snapshot.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  downloadTextFile(
                    routeResultToText(
                      selectedRoute,
                      routeName.trim() || 'Project NOMAD offline route'
                    ),
                    'nomad-offline-route.txt',
                    'text/plain;charset=utf-8'
                  )
                }
                className="flex items-center gap-1.5 rounded border border-border-default px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-primary"
              >
                <IconDownload size={14} /> Directions
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadTextFile(
                    routeResultToGpx(
                      selectedRoute,
                      routeName.trim() || 'Project NOMAD offline route'
                    ),
                    'nomad-offline-route.gpx',
                    'application/gpx+xml;charset=utf-8'
                  )
                }
                className="flex items-center gap-1.5 rounded border border-border-default px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-primary"
              >
                <IconDownload size={14} /> GPX track
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded border border-border-default px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-primary"
              >
                <IconPrinter size={14} /> Print
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRouteIndex(0)
                  setRouteResult(null)
                }}
                className="ml-auto rounded px-2 py-1 text-xs font-semibold text-text-muted hover:text-desert-red"
              >
                Clear route
              </button>
            </div>
            <ol className="max-h-56 space-y-2 overflow-y-auto border-t border-border-subtle pt-2 text-xs text-text-secondary">
              {selectedRoute.legs
                .flatMap((leg) => leg.maneuvers)
                .map((maneuver, index) => (
                  <li key={`${index}-${maneuver.beginShapeIndex}`} className="flex gap-2">
                    <span className="font-mono text-text-muted">{index + 1}.</span>
                    <span>
                      {maneuver.instruction}
                      {maneuver.distanceMiles > 0 && (
                        <small className="ml-1 text-text-muted">
                          ({maneuver.distanceMiles.toFixed(1)} mi)
                        </small>
                      )}
                    </span>
                  </li>
                ))}
            </ol>
            {createPortal(
              <article className="nomad-route-print hidden" aria-hidden="true">
                <header>
                  <p>PROJECT NOMAD · OFFLINE DIRECTIONS</p>
                  <h1>{routeName.trim() || 'Emergency route'}</h1>
                  <p>
                    {selectedRoute.summary.distanceMiles.toFixed(1)} miles ·{' '}
                    {Math.max(1, Math.round(selectedRoute.summary.timeSeconds / 60))} minutes ·{' '}
                    {selectedRouteIndex === 0 ? 'Primary route' : `Alternate ${selectedRouteIndex}`}
                  </p>
                </header>
                <section>
                  <h2>Route setup</h2>
                  <p>
                    <strong>Start:</strong>{' '}
                    {draft.start.kind === 'pin'
                      ? markers.find((marker) => marker.id === Number(draft.start.value))?.name ||
                        'Missing saved pin'
                      : draft.start.value}
                  </p>
                  {draft.waypoints.map((waypoint, index) => (
                    <p key={waypoint.id}>
                      <strong>Stop {index + 1}:</strong>{' '}
                      {waypoint.endpoint.kind === 'pin'
                        ? markers.find((marker) => marker.id === Number(waypoint.endpoint.value))
                            ?.name || 'Missing saved pin'
                        : waypoint.endpoint.value}
                    </p>
                  ))}
                  <p>
                    <strong>Destination:</strong>{' '}
                    {draft.destination.kind === 'pin'
                      ? markers.find((marker) => marker.id === Number(draft.destination.value))
                          ?.name || 'Missing saved pin'
                      : draft.destination.value}
                  </p>
                  <p>
                    <strong>Mode:</strong> {draft.mode} · <strong>Priority:</strong>{' '}
                    {draft.priority} · <strong>Highways:</strong> {draft.highwayPreference}
                  </p>
                </section>
                <section className="nomad-route-print-warning">
                  <strong>
                    Offline snapshot: {selectedRoute.snapshotDate ?? 'date unavailable'}.
                  </strong>{' '}
                  No live traffic, closures, evacuation orders, fires, weather, or road damage are
                  included. Verify conditions when live information is available.
                </section>
                <h2>Turn-by-turn directions</h2>
                <ol>
                  {selectedRoute.legs
                    .flatMap((leg) => leg.maneuvers)
                    .map((maneuver, index) => (
                      <li key={`print-${index}-${maneuver.beginShapeIndex}`}>
                        <span>{maneuver.instruction}</span>
                        {maneuver.distanceMiles > 0 && (
                          <strong>{maneuver.distanceMiles.toFixed(1)} mi</strong>
                        )}
                      </li>
                    ))}
                </ol>
              </article>,
              document.body
            )}
          </section>
        )}

        <p className="text-center text-[11px] leading-4 text-text-muted">
          Draft saves automatically on this browser. No live traffic, closures, evacuation orders,
          or hazard conditions will be included.
        </p>
      </div>
    </section>
  )
}
