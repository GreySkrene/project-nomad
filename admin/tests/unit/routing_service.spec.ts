import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeValhallaResponse,
  RoutingService,
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

test('reports an unavailable routing engine without throwing from health checks', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('fetch failed')
  })

  const health = await new RoutingService().health()
  assert.equal(health.available, false)
  assert.equal(health.coverage, 'Utah and Idaho')
  assert.equal(health.liveConditionsIncluded, false)
})

test('turns out-of-coverage engine wording into an actionable local-data message', async (context) => {
  context.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ error: 'No suitable edges near location' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  )

  await assert.rejects(
    () => new RoutingService().route(baseRequest),
    (error: unknown) => {
      assert.equal((error as { responseStatus?: unknown }).responseStatus, 422)
      assert.match((error as Error).message, /installed Utah and Idaho map data/)
      assert.match((error as Error).message, /near a mapped road or trail/)
      return true
    }
  )
})

test('classifies routing-engine server failures as temporarily unavailable', async (context) => {
  context.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  )

  await assert.rejects(
    () => new RoutingService().route(baseRequest),
    (error: unknown) => {
      assert.equal((error as { responseStatus?: unknown }).responseStatus, 503)
      assert.equal((error as Error).message, 'Offline routing engine is temporarily unavailable.')
      return true
    }
  )
})
