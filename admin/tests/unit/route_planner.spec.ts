import assert from 'node:assert/strict'
import test from 'node:test'

import {
  endpointIsReady,
  formatRouteCoordinates,
  normalizeRouteDraft,
  normalizeSavedRoutePlans,
  parseRouteCoordinates,
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
