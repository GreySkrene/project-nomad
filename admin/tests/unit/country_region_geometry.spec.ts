import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildCountryRegionFeatures } from '../../app/utils/country_region.js'

test('country region retains original geometry alongside its coastal buffer', () => {
  const geometry = {
    type: 'Polygon',
    coordinates: [[[-123, 49], [-122, 49], [-122, 50], [-123, 50], [-123, 49]]],
  }
  const features = buildCountryRegionFeatures('CA', 'Canada', geometry, 0.1)

  assert.equal(features.length, 2)
  assert.deepEqual(
    features.map((feature) => feature.properties.regionPart),
    ['original', 'coastal-buffer']
  )
  assert.deepEqual(
    features.map((feature) => feature.properties.iso),
    ['CA', 'CA']
  )
  assert.equal(features[0].geometry, geometry)
})
