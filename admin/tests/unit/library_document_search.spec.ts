import assert from 'node:assert/strict'
import test from 'node:test'

import {
  friendlyStoredDocumentName,
  rankStoredDocuments,
} from '../../app/utils/library_document_search.js'

const documents = [
  {
    source: '/uploads/jackery.pdf',
    fileName: 'Jackery-Explorer-600-v2-Official-Manual.pdf-4e86f1afadaa.pdf',
  },
  { source: '/uploads/water.pdf', fileName: 'CDC-Emergency-Water.pdf' },
]

test('removes upload hashes and extensions from stored document titles', () => {
  assert.equal(
    friendlyStoredDocumentName(documents[0].fileName),
    'Jackery Explorer 600 v2 Official Manual'
  )
})

test('ranks an exact passage above a filename-only match and keeps one result per file', () => {
  const results = rankStoredDocuments(
    'solar input',
    documents,
    [
      {
        source: documents[0].source,
        chunkIndex: 3,
        text: 'Connect a compatible solar input cable and confirm charging wattage on the display.',
      },
      {
        source: documents[0].source,
        chunkIndex: 8,
        text: 'The solar input should remain dry.',
      },
    ],
    10
  )
  assert.equal(results.length, 1)
  assert.equal(results[0].matchKind, 'content')
  assert.equal(results[0].chunkIndex, 3)
  assert.match(results[0].excerpt, /solar input/i)
})

test('uses AND semantics so unrelated single-term passages do not crowd results', () => {
  const results = rankStoredDocuments('boil water', documents, [
    { source: documents[0].source, chunkIndex: 1, text: 'Boil noodles on the stove.' },
    {
      source: documents[1].source,
      chunkIndex: 2,
      text: 'During an advisory, boil drinking water as directed by local officials.',
    },
  ])
  assert.deepEqual(
    results.map((result) => result.source),
    [documents[1].source]
  )
})

test('prefers an authoritative original over a library index with the same phrase', () => {
  const sources = [
    { source: '/uploads/index.md', fileName: 'INDEX.md' },
    { source: '/uploads/cdc.pdf', fileName: 'CDC-Emergency-Water.pdf' },
  ]
  const results = rankStoredDocuments(
    'boil water',
    sources,
    sources.map((source, chunkIndex) => ({
      source: source.source,
      chunkIndex,
      text: 'Follow official instructions to boil water during an advisory.',
    }))
  )
  assert.deepEqual(
    results.map((result) => result.source),
    ['/uploads/cdc.pdf', '/uploads/index.md']
  )
})
