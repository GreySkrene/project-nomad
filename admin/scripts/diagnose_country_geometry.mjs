#!/usr/bin/env node

/** Compare Natural Earth country polygons with NOMAD's current vertex buffer. */

import { readFile } from 'node:fs/promises'

const source = process.argv[2] ?? 'resources/geodata/ne_50m_admin_0_countries.geojson'
const fc = JSON.parse(await readFile(source, 'utf8'))
const feature = fc.features.find((item) =>
  [item.properties?.ISO_A2, item.properties?.ISO_A2_EH].includes('CA')
)
if (!feature) throw new Error('Canada feature not found')

const points = [
  ['Vancouver', -123.1207, 49.2827],
  ['Burnaby', -122.9805, 49.2488],
  ['Surrey', -122.849, 49.1913],
  ['Victoria', -123.3656, 48.4284],
]

function inRing([x, y], ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function inPolygon(point, rings) {
  return inRing(point, rings[0]) && !rings.slice(1).some((ring) => inRing(point, ring))
}

function contains(geometry, point) {
  if (geometry.type === 'Polygon') return inPolygon(point, geometry.coordinates)
  return geometry.coordinates.some((polygon) => inPolygon(point, polygon))
}

function signedArea(ring) {
  let area = 0
  for (let i = 0; i < ring.length - 1; i += 1) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  }
  return area / 2
}

function bufferRing(ring, buffer) {
  if (ring.length < 4) return ring
  const sign = signedArea(ring) > 0 ? 1 : -1
  const count = ring.length - 1
  const output = []
  for (let i = 0; i < count; i += 1) {
    const previous = ring[(i - 1 + count) % count]
    const current = ring[i]
    const next = ring[(i + 1) % count]
    const edge1 = [current[0] - previous[0], current[1] - previous[1]]
    const edge2 = [next[0] - current[0], next[1] - current[1]]
    const length1 = Math.hypot(...edge1) || 1
    const length2 = Math.hypot(...edge2) || 1
    const normal1 = [(edge1[1] / length1) * sign, (-edge1[0] / length1) * sign]
    const normal2 = [(edge2[1] / length2) * sign, (-edge2[0] / length2) * sign]
    const sum = [normal1[0] + normal2[0], normal1[1] + normal2[1]]
    const sumLength = Math.hypot(...sum) || 1
    output.push([
      current[0] + (sum[0] / sumLength) * buffer,
      current[1] + (sum[1] / sumLength) * buffer,
    ])
  }
  output.push(output[0])
  return output
}

function bufferGeometry(geometry, buffer) {
  const convert = (polygon) =>
    polygon.map((ring, index) => bufferRing(ring, index === 0 ? buffer : -buffer))
  return geometry.type === 'Polygon'
    ? { type: 'Polygon', coordinates: convert(geometry.coordinates) }
    : { type: 'MultiPolygon', coordinates: geometry.coordinates.map(convert) }
}

const buffered = bufferGeometry(feature.geometry, 0.1)
process.stdout.write(`${JSON.stringify({
  source,
  country: feature.properties?.NAME,
  results: points.map(([name, lon, lat]) => ({
    name,
    lon,
    lat,
    originalContains: contains(feature.geometry, [lon, lat]),
    bufferedContains: contains(buffered, [lon, lat]),
    combinedRegionContains:
      contains(feature.geometry, [lon, lat]) || contains(buffered, [lon, lat]),
  })),
}, null, 2)}\n`)
