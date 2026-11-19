#!/usr/bin/env node

/** Compare exact Qdrant source facets with physical knowledge-base files. */

import { readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const args = process.argv.slice(2)
let qdrantUrl = 'http://qdrant:6333'
let collection = 'nomad_knowledge_base'
let logicalCollection = 'official-emergency'
let storage = '/app/storage/kb_uploads'
let output = null
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--qdrant-url') qdrantUrl = args[++i]
  else if (args[i] === '--collection') collection = args[++i]
  else if (args[i] === '--logical-collection') logicalCollection = args[++i]
  else if (args[i] === '--storage') storage = args[++i]
  else if (args[i] === '--output') output = args[++i]
}

const response = await fetch(`${qdrantUrl}/collections/${collection}/facet`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    key: 'source',
    limit: 10_000,
    exact: true,
    filter: { must: [{ key: 'collection', match: { value: logicalCollection } }] },
  }),
})
if (!response.ok) throw new Error(`Qdrant facet failed: ${response.status} ${await response.text()}`)
const facet = await response.json()
const sources = facet.result.hits.map((hit) => ({ source: hit.value, chunks: hit.count }))

const files = []
for (const entry of await readdir(storage, { withFileTypes: true })) {
  if (!entry.isFile()) continue
  const filepath = path.join(storage, entry.name)
  const fileStat = await stat(filepath)
  files.push({ path: filepath, filename: entry.name, bytes: fileStat.size })
}
const physical = new Set(files.map((file) => file.path))
const indexed = new Set(sources.map((source) => source.source))
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  qdrantCollection: collection,
  logicalCollection,
  counts: {
    physicalFiles: files.length,
    indexedSources: sources.length,
    chunks: sources.reduce((sum, source) => sum + source.chunks, 0),
  },
  indexedSources: sources.sort((a, b) => a.source.localeCompare(b.source)),
  indexedSourcesMissingOnDisk: sources.filter((source) => !physical.has(source.source)),
  physicalFilesWithoutChunks: files.filter((file) => !indexed.has(file.path)),
}

const rendered = `${JSON.stringify(report, null, 2)}\n`
if (output) await writeFile(output, rendered, 'utf8')
else process.stdout.write(rendered)
