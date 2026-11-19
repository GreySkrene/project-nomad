#!/usr/bin/env node

/** Validate PMTiles headers/metadata and fetch representative coordinate tiles. */

import { writeFile } from 'node:fs/promises'
import { PMTiles } from 'pmtiles'

const locations = [
  ['West Jordan, Utah', -111.9391, 40.6097],
  ['Riverton, Utah', -111.9391, 40.5219],
  ['Ogden, Utah', -111.9738, 41.223],
  ['Marysvale, Utah', -112.2269, 38.4494],
  ['Rexburg, Idaho', -111.7924, 43.826],
  ['Salt Lake to Marysvale corridor', -111.8344, 39.4133],
  ['Salt Lake to Rexburg corridor', -112.0187, 42.5629],
  ['Toronto, Canada', -79.3832, 43.6532],
  ['Vancouver, Canada', -123.1207, 49.2827],
  ['Victoria, Canada', -123.3656, 48.4284],
  ['Burnaby, Canada', -122.9805, 49.2488],
  ['Surrey, Canada', -122.8490, 49.1913],
  ['Bellingham, USA', -122.4787, 48.7519],
  ['Seattle, USA', -122.3321, 47.6062],
  ['Calgary, Canada', -114.0719, 51.0447],
  ['Edmonton, Canada', -113.4938, 53.5461],
  ['Winnipeg, Canada', -97.1384, 49.8951],
  ['Montreal, Canada', -73.5673, 45.5019],
  ['Halifax, Canada', -63.5752, 44.6488],
  ['Whitehorse, Canada', -135.0568, 60.7212],
  ['Mexico City, Mexico', -99.1332, 19.4326],
  ['Monterrey, Mexico', -100.3161, 25.6866],
]

function tileFor(lon, lat, zoom) {
  const scale = 2 ** zoom
  const x = Math.floor(((lon + 180) / 360) * scale)
  const latitude = Math.max(-85.05112878, Math.min(85.05112878, lat))
  const radians = (latitude * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * scale
  )
  return { z: zoom, x, y }
}

const args = process.argv.slice(2)
let output = null
const urls = []
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--output') output = args[++i]
  else urls.push(args[i])
}
if (!urls.length) {
  console.error('Usage: node audit_pmtiles.mjs [--output report.json] URL [...]')
  process.exit(2)
}

const reports = []
for (const url of urls) {
  const archive = new PMTiles(url)
  const header = await archive.getHeader()
  const metadata = await archive.getMetadata()
  const sampleZoom = header.maxZoom
  const sampleZooms = header.maxZoom > 5
    ? [...new Set([10, 12, 14, header.maxZoom])].filter((zoom) => zoom <= header.maxZoom)
    : [header.maxZoom]
  const samples = []
  for (const [name, lon, lat] of locations) {
    for (const zoom of sampleZooms) {
      const tile = tileFor(lon, lat, zoom)
      const result = await archive.getZxy(tile.z, tile.x, tile.y)
      samples.push({
        name,
        lon,
        lat,
        ...tile,
        present: Boolean(result),
        bytes: result?.data?.byteLength ?? 0,
      })
    }
  }
  reports.push({ url, header, metadata, sampleZooms, samples })
}

const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), reports }
const serialized = `${JSON.stringify(report, null, 2)}\n`
if (output) await writeFile(output, serialized, 'utf8')
else process.stdout.write(serialized)
