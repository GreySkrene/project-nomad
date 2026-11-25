import assert from 'node:assert/strict'
import test from 'node:test'

import { validateLibraryLexicalIndex } from '../../app/utils/library_lexical_index.js'

const allowed = [
  {
    source: '/uploads/manual.pdf',
    fileName: 'manual.pdf',
    size: 123,
    uploadedAt: '2026-11-25T00:00:00.000Z',
  },
]

test('accepts page-aware chunks for a current managed document', () => {
  const result = validateLibraryLexicalIndex(
    {
      schemaVersion: 1,
      generatedAt: '2026-11-25T01:00:00.000Z',
      documents: [
        {
          ...allowed[0],
          chunks: [
            {
              source: allowed[0].source,
              text: 'Use the equipment only as directed.',
              chunkIndex: 0,
              pageNumber: 7,
            },
          ],
        },
      ],
    },
    allowed
  )

  assert.equal(result.chunks.length, 1)
  assert.equal(result.chunks[0].pageNumber, 7)
  assert.deepEqual([...result.sources], [allowed[0].source])
})

test('rejects stale and outside-inventory documents', () => {
  const result = validateLibraryLexicalIndex(
    {
      schemaVersion: 1,
      generatedAt: '2026-11-25T01:00:00.000Z',
      documents: [
        {
          ...allowed[0],
          size: 999,
          chunks: [{ source: allowed[0].source, text: 'stale', chunkIndex: 0, pageNumber: 1 }],
        },
        {
          source: '/outside/file.pdf',
          fileName: 'file.pdf',
          size: 1,
          uploadedAt: null,
          chunks: [{ source: '/outside/file.pdf', text: 'outside', chunkIndex: 0, pageNumber: 1 }],
        },
      ],
    },
    allowed
  )

  assert.equal(result.chunks.length, 0)
  assert.equal(result.sources.size, 0)
})

test('rejects unsupported index schemas', () => {
  assert.throws(
    () => validateLibraryLexicalIndex({ schemaVersion: 2, documents: [] }, allowed),
    /Unsupported lexical index schema/
  )
})
