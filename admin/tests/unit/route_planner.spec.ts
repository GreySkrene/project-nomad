import assert from 'node:assert/strict'
import test from 'node:test'

import {
  endpointIsReady,
  normalizeRouteDraft,
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
      destination: { kind: 'coordinates', value: '43.8, -111.8' },
      mode: 'flying',
      priority: 'shorter',
      avoidHighways: true,
      avoidTolls: 'yes',
    }),
    {
      start: { kind: 'pin', value: '7' },
      destination: { kind: 'coordinates', value: '43.8, -111.8' },
      mode: 'driving',
      priority: 'shorter',
      avoidHighways: true,
      avoidTolls: false,
    }
  )
})

test('requires a real saved pin or valid coordinate before an endpoint is ready', () => {
  const pins = new Set([3, 7])
  assert.equal(endpointIsReady({ kind: 'pin', value: '7' }, pins), true)
  assert.equal(endpointIsReady({ kind: 'pin', value: '9' }, pins), false)
  assert.equal(endpointIsReady({ kind: 'coordinates', value: '38.45, -112.23' }, pins), true)
  assert.equal(endpointIsReady({ kind: 'coordinates', value: 'Marysvale' }, pins), false)
})
