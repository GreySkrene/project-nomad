import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeValhallaResponse,
  toValhallaRouteRequest,
  validateRouteSpan,
} from '../../app/services/routing_service.js'

const baseRequest = {
  locations: [
    { latitude: 40.6097, longitude: -111.9391 },
    { latitude: 38.4494, longitude: -112.2291 },
  ],
  mode: 'driving' as const,
  priority: 'fastest' as const,
  highwayPreference: 'avoid' as const,
  avoidTolls: true,
  avoidFerries: true,
  avoidUnpaved: true,
  avoidTracks: true,
}

test('translates route preferences to bounded Valhalla costing options', () => {
  const value = toValhallaRouteRequest(baseRequest)
  assert.equal(value.costing, 'auto')
  assert.deepEqual(value.costing_options.auto, {
    shortest: false,
    use_ferry: 0,
    use_highways: 0,
    use_tolls: 0,
    use_tracks: 0,
    exclude_unpaved: true,
  })
  assert.equal(value.alternates, 1)
})

test('uses pedestrian costing and suppresses driving-only options', () => {
  const value = toValhallaRouteRequest({ ...baseRequest, mode: 'walking', priority: 'shorter' })
  assert.equal(value.costing, 'pedestrian')
  assert.deepEqual(value.costing_options.pedestrian, { shortest: true, use_ferry: 0 })
})

test('rejects route spans far beyond the installed regional graph', () => {
  assert.throws(
    () =>
      validateRouteSpan([
        { latitude: 40.7, longitude: -111.9 },
        { latitude: 25.8, longitude: -80.2 },
      ]),
    /installed regional routing limit/
  )
})

test('normalizes only the response fields exposed to the browser', () => {
  const result = normalizeValhallaResponse(
    {
      trip: {
        summary: { length: 12.5, time: 900, has_highway: true },
        legs: [
          {
            shape: 'encoded',
            maneuvers: [{ instruction: 'Turn right.', length: 1.2, time: 60 }],
          },
        ],
      },
      alternates: [
        {
          trip: {
            summary: { length: 14.25, time: 1_020, has_highway: false },
            legs: [
              {
                shape: 'alternate-encoded',
                maneuvers: [{ instruction: 'Bear left.', length: 2.1, time: 90 }],
              },
            ],
          },
        },
      ],
    },
    '2026-11-23'
  )
  assert.equal(result.summary.distanceMiles, 12.5)
  assert.equal(result.legs[0].maneuvers[0].instruction, 'Turn right.')
  assert.equal(result.snapshotDate, '2026-11-23')
  assert.equal(result.liveConditionsIncluded, false)
  assert.equal(result.alternates.length, 1)
  assert.equal(result.alternates[0].summary.distanceMiles, 14.25)
  assert.equal(result.alternates[0].legs[0].maneuvers[0].instruction, 'Bear left.')
})
