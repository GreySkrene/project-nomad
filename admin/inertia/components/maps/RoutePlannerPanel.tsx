import { useEffect, useMemo, useState } from 'react'
import { IconAlertTriangle, IconArrowsExchange, IconRoute, IconX } from '@tabler/icons-react'

import type { MapMarker } from '~/hooks/useMapMarkers'
import {
  EMPTY_ROUTE_DRAFT,
  endpointIsReady,
  normalizeRouteDraft,
  parseRouteCoordinates,
} from '~/lib/route_planner'
import type { RouteDraft, RouteEndpoint } from '~/lib/route_planner'

const ROUTE_DRAFT_KEY = 'nomad:route-draft'

type EndpointEditorProps = {
  label: string
  endpoint: RouteEndpoint
  markers: MapMarker[]
  onChange: (endpoint: RouteEndpoint) => void
  onShow: (longitude: number, latitude: number) => void
}

function EndpointEditor({ label, endpoint, markers, onChange, onShow }: EndpointEditorProps) {
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
        {(coordinate || pin) && (
          <button
            type="button"
            onClick={() =>
              onShow(coordinate?.longitude ?? pin!.longitude, coordinate?.latitude ?? pin!.latitude)
            }
            className="shrink-0 font-semibold text-desert-orange hover:underline"
          >
            Show
          </button>
        )}
      </div>
    </fieldset>
  )
}

export default function RoutePlannerPanel({
  markers,
  onFlyTo,
}: {
  markers: MapMarker[]
  onFlyTo: (longitude: number, latitude: number) => void
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

  useEffect(() => {
    try {
      localStorage.setItem(ROUTE_DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // The planner still works for this session when storage is unavailable.
    }
  }, [draft])

  const availablePinIds = useMemo(() => new Set(markers.map((marker) => marker.id)), [markers])
  const endpointsReady =
    endpointIsReady(draft.start, availablePinIds) &&
    endpointIsReady(draft.destination, availablePinIds)

  const updateEndpoint = (key: 'start' | 'destination', endpoint: RouteEndpoint) => {
    setDraft((current) => ({ ...current, [key]: endpoint }))
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
    <section className="absolute right-4 top-[72px] z-40 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border-subtle bg-surface-primary/95 shadow-xl backdrop-blur-sm">
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
          onClick={() => setOpen(false)}
          className="rounded p-1 text-text-muted hover:bg-surface-secondary hover:text-text-primary"
          aria-label="Close route planner"
        >
          <IconX size={18} />
        </button>
      </header>

      <div className="max-h-[calc(100vh-9rem)] space-y-4 overflow-y-auto p-4">
        <div className="flex gap-2 rounded border border-amber-500/50 bg-amber-500/10 p-3 text-xs leading-5 text-text-secondary">
          <IconAlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={18} />
          <p>
            <strong className="block text-text-primary">
              Route calculation is not installed yet.
            </strong>
            You can prepare endpoints and preferences now. Calculated roads, turns, and distances
            require the planned local routing graph; map tiles alone cannot provide them.
          </p>
        </div>

        <EndpointEditor
          label="Start"
          endpoint={draft.start}
          markers={markers}
          onChange={(endpoint) => updateEndpoint('start', endpoint)}
          onShow={onFlyTo}
        />

        <button
          type="button"
          onClick={() =>
            setDraft((current) => ({
              ...current,
              start: current.destination,
              destination: current.start,
            }))
          }
          className="mx-auto flex items-center gap-1.5 rounded border border-border-default px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-secondary"
        >
          <IconArrowsExchange size={15} />
          Swap endpoints
        </button>

        <EndpointEditor
          label="Destination"
          endpoint={draft.destination}
          markers={markers}
          onChange={(endpoint) => updateEndpoint('destination', endpoint)}
          onShow={onFlyTo}
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

        <div className="space-y-2">
          {[
            ['avoidHighways', 'Prefer routes without highways'],
            ['avoidTolls', 'Prefer routes without tolls'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-start gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={draft[key as 'avoidHighways' | 'avoidTolls']}
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
          disabled
          className="w-full cursor-not-allowed rounded bg-text-muted/25 px-4 py-2.5 text-sm font-bold text-text-muted"
          title="Install and validate the local routing service to enable calculation"
        >
          {endpointsReady ? 'Routing engine required' : 'Choose valid endpoints'}
        </button>

        <p className="text-center text-[11px] leading-4 text-text-muted">
          Draft saves automatically on this browser. No live traffic, closures, evacuation orders,
          or hazard conditions will be included.
        </p>
      </div>
    </section>
  )
}
