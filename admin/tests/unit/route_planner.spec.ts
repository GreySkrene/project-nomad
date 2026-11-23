import assert from 'node:assert/strict'
import test from 'node:test'

import {
  endpointIsReady,
  decodeValhallaPolyline6,
  formatRouteCoordinates,
  normalizeOfflineRouteResult,
  normalizeRouteDraft,
  normalizeSavedRoutePlans,
  parseRouteCoordinates,
  resolveRouteEndpoint,
  routeResultToGpx,
  routeResultToText,
  routingSnapshotAgeDays,
  routingSnapshotIsStale,
} from '../../inertia/lib/route_planner.js'

test('accepts bounded latitude and longitude and rejects malformed coordinates', () => {
  assert.deepEqual(parseRouteCoordinates('40.6097, -111.9391'), {
    latitude: 40.6097,
    longitude: -111.9391,
  })
  assert.equal(parseRouteCoordinates('40.6'), null)
  assert.equal(parseRouteCoordinates('91, -111'), null)
  assert.equal(parseRouteCoordinates('40, -181'), null)
  assert.equal(parseRouteCoordinates(', 0'), null)
})

const routeResult = {
  summary: {
    distanceMiles: 12.34,
    timeSeconds: 1800,
    hasHighway: false,
    hasToll: false,
    hasFerry: false,
  },
  legs: [
    {
      shape: '_izlhA~rlgdF_{geC~ywl@_kwzCn`{nI',
      maneuvers: [
        {
          instruction: 'Head north & stay left',
          distanceMiles: 2.5,
          timeSeconds: 300,
          beginShapeIndex: 0,
          endShapeIndex: 1,
        },
      ],
    },
  ],
  warnings: [],
  snapshotDate: '2026-11-23',
  liveConditionsIncluded: false as const,
  alternates: [],
}

test('validates persisted route results before restoring them', () => {
  assert.deepEqual(normalizeOfflineRouteResult(routeResult), routeResult)
  assert.deepEqual(
    normalizeOfflineRouteResult({
      ...routeResult,
      alternates: [{ ...routeResult, alternates: [] }],
    })?.alternates[0].summary,
    routeResult.summary
  )
  assert.equal(normalizeOfflineRouteResult({ summary: {}, legs: [] }), null)
})

test('exports an offline route as GPX and readable directions', () => {
  const gpx = routeResultToGpx(routeResult, 'Home & shelter')
  assert.match(gpx, /<name>Home &amp; shelter<\/name>/)
  assert.match(gpx, /<trkpt lat="38.5" lon="-120.2" \/>/)

  const directions = routeResultToText(routeResult, 'Home to shelter')
  assert.match(directions, /12\.3 miles · 30 minutes/)
  assert.match(directions, /1\. Head north & stay left \(2\.5 mi\)/)
  assert.match(directions, /no live closures/i)
})

test('decodes Valhalla six-digit geometry in MapLibre longitude-latitude order', () => {
  // Known polyline6 sample: [38.5, -120.2], [40.7, -120.95], [43.252, -126.453].
  assert.deepEqual(decodeValhallaPolyline6('_izlhA~rlgdF_{geC~ywl@_kwzCn`{nI'), [
    [-120.2, 38.5],
    [-120.95, 40.7],
    [-126.453, 43.252],
  ])
})

test('resolves coordinate and saved-pin endpoints without accepting missing pins', () => {
  const pins = new Map([[7, { latitude: 40.1, longitude: -111.9 }]])
  assert.deepEqual(resolveRouteEndpoint({ kind: 'pin', value: '7' }, pins), {
    latitude: 40.1,
    longitude: -111.9,
  })
  assert.equal(resolveRouteEndpoint({ kind: 'pin', value: '8' }, pins), null)
})

test('restores safe route-draft fields and discards invalid persisted values', () => {
  assert.deepEqual(
    normalizeRouteDraft({
      start: { kind: 'pin', value: '7' },
      waypoints: [
        { id: 'valid', endpoint: { kind: 'coordinates', value: '41, -112' } },
        { id: 2, endpoint: { kind: 'coordinates', value: 'bad' } },
      ],
      destination: { kind: 'coordinates', value: '43.8, -111.8' },
      mode: 'flying',
      priority: 'shorter',
      avoidHighways: true,
      avoidTolls: 'yes',
    }),
    {
      start: { kind: 'pin', value: '7' },
      waypoints: [{ id: 'valid', endpoint: { kind: 'coordinates', value: '41, -112' } }],
      destination: { kind: 'coordinates', value: '43.8, -111.8' },
      mode: 'driving',
      priority: 'shorter',
      highwayPreference: 'avoid',
      avoidTolls: false,
      avoidFerries: false,
      avoidUnpaved: false,
      avoidTracks: false,
    }
  )
})

test('formats map clicks as stable coordinate input', () => {
  assert.equal(formatRouteCoordinates(40.6097, -111.9391), '40.609700, -111.939100')
})

test('requires a real saved pin or valid coordinate before an endpoint is ready', () => {
  const pins = new Set([3, 7])
  assert.equal(endpointIsReady({ kind: 'pin', value: '7' }, pins), true)
  assert.equal(endpointIsReady({ kind: 'pin', value: '9' }, pins), false)
  assert.equal(endpointIsReady({ kind: 'coordinates', value: '38.45, -112.23' }, pins), true)
  assert.equal(endpointIsReady({ kind: 'coordinates', value: 'Marysvale' }, pins), false)
})

test('normalizes named route setups and rejects malformed storage entries', () => {
  const plans = normalizeSavedRoutePlans([
    {
      id: '1',
      name: ' Home to Rexburg ',
      savedAt: '2026-11-23T08:00:00.000Z',
      draft: { start: { kind: 'coordinates', value: '40, -111' }, mode: 'walking' },
    },
    { id: 2, name: 'Invalid', savedAt: 'now', draft: {} },
  ])
  assert.equal(plans.length, 1)
  assert.equal(plans[0].name, 'Home to Rexburg')
  assert.equal(plans[0].draft.mode, 'walking')
  assert.deepEqual(plans[0].draft.waypoints, [])
})

test('warns only when an offline routing snapshot is more than 180 days old', () => {
  const now = new Date('2026-11-23T18:00:00Z')
  assert.equal(routingSnapshotAgeDays('2026-11-23', now), 0)
  assert.equal(routingSnapshotAgeDays('2026-05-27', now), 180)
  assert.equal(routingSnapshotAgeDays('2026-05-26', now), 181)
  assert.equal(routingSnapshotIsStale('2026-05-27', now), false)
  assert.equal(routingSnapshotIsStale('2026-05-26', now), true)
  assert.equal(routingSnapshotIsStale(null, now), false)
  assert.equal(routingSnapshotAgeDays('not-a-date', now), null)
})
