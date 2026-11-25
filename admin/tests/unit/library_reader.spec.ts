import assert from 'node:assert/strict'
import test from 'node:test'

import {
  kiwixArticleUrl,
  kiwixSearchUrl,
  libraryDocumentUrl,
  libraryReaderUrl,
  parseLibraryReaderLocation,
  sourceName,
} from '../../inertia/lib/library_reader.js'

test('builds encoded Kiwix article URLs without losing path structure', () => {
  assert.equal(
    sourceName('wikipedia_en_medicine_maxi_2026-07.zim'),
    'wikipedia_en_medicine_maxi_2026-07'
  )
  assert.equal(
    kiwixArticleUrl('http://localhost:8090/', 'medical source', 'A/How to make a splint'),
    'http://localhost:8090/content/medical%20source/A/How%20to%20make%20a%20splint'
  )
})

test('keeps full-text searches inside a selected archive when requested', () => {
  const result = new URL(kiwixSearchUrl('http://localhost:8090', 'toddler choking', 'wikimed'))
  assert.equal(result.pathname, '/search')
  assert.equal(result.searchParams.get('pattern'), 'toddler choking')
  assert.equal(result.searchParams.get('content'), 'wikimed')

  const allLibraries = new URL(kiwixSearchUrl('http://localhost:8090', 'water storage'))
  assert.equal(allLibraries.searchParams.get('pattern'), 'water storage')
  assert.equal(allLibraries.searchParams.has('content'), false)
})

test('round trips safe article state through the NOMAD reader route', () => {
  const url = libraryReaderUrl({
    source: 'wikimed_2026-07',
    path: 'A/Splint_(medical)',
    title: 'Splint (medical)',
    sourceTitle: 'WikiMed',
  })
  const parsed = parseLibraryReaderLocation(new URL(url, 'http://nomad.local').search)
  assert.deepEqual(parsed, {
    source: 'wikimed_2026-07',
    path: 'A/Splint_(medical)',
    title: 'Splint (medical)',
    sourceTitle: 'WikiMed',
    mode: 'article',
    query: '',
  })
})

test('rejects malformed source identifiers and empty search state', () => {
  assert.equal(parseLibraryReaderLocation('?source=../../etc/passwd&path=A/Test'), null)
  assert.equal(parseLibraryReaderLocation('?source=wikimed&mode=search'), null)
})

test('builds a NOMAD document route without exposing parameters as path segments', () => {
  const url = new URL(
    libraryDocumentUrl('/app/storage/kb_uploads/first aid.pdf', 'First Aid Manual.pdf'),
    'http://nomad.local'
  )
  assert.equal(url.pathname, '/library/document')
  assert.equal(url.searchParams.get('source'), '/app/storage/kb_uploads/first aid.pdf')
  assert.equal(url.searchParams.get('title'), 'First Aid Manual.pdf')
})
