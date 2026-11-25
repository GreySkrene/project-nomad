import assert from 'node:assert/strict'
import test from 'node:test'

import {
  parseLibraryReferences,
  upsertLibraryReference,
  type LibraryReference,
} from '../../inertia/lib/library_references.js'

const article: LibraryReference = {
  kind: 'article',
  title: 'Splint (medicine)',
  sourceTitle: 'WikiMed',
  url: '/library/read?source=wikimed&path=A%2FSplint',
  touchedAt: '2026-11-25T00:00:00.000Z',
}

test('rejects external and non-reader links from local storage', () => {
  const raw = JSON.stringify([
    article,
    { ...article, url: 'https://example.com/steal' },
    { ...article, url: '/settings' },
  ])
  assert.deepEqual(parseLibraryReferences(raw), [article])
})

test('moves an existing reference to the front and enforces the limit', () => {
  const document: LibraryReference = {
    kind: 'document',
    title: 'First Aid',
    sourceTitle: 'Saved original document',
    url: '/library/document?source=first-aid.pdf',
    touchedAt: '2026-11-25T01:00:00.000Z',
  }
  const updated = upsertLibraryReference([article, document], { ...article, title: 'Splint' }, 2)
  assert.deepEqual(
    updated.map((item) => item.title),
    ['Splint', 'First Aid']
  )
})
