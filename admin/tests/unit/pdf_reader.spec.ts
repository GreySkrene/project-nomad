import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clampPdfPage,
  parsePdfPage,
  pdfPageCitation,
  pdfPageMatchesQuery,
  textItemsToSearchText,
} from '../../inertia/lib/pdf_reader.js'

test('parsePdfPage accepts positive integer syntax only', () => {
  assert.equal(parsePdfPage('27'), 27)
  assert.equal(parsePdfPage(null), 1)
  assert.equal(parsePdfPage('0'), 1)
  assert.equal(parsePdfPage('-2'), 1)
  assert.equal(parsePdfPage('12.5'), 1)
  assert.equal(parsePdfPage('1234567'), 1)
})

test('clampPdfPage keeps navigation inside the loaded document', () => {
  assert.equal(clampPdfPage(4, 10), 4)
  assert.equal(clampPdfPage(0, 10), 1)
  assert.equal(clampPdfPage(99, 10), 10)
  assert.equal(clampPdfPage(Number.NaN, 10), 1)
})

test('textItemsToSearchText creates stable case-insensitive page text', () => {
  assert.equal(
    textItemsToSearchText([{ str: 'Solar' }, { str: '  input' }, {}, { str: '200 W' }]),
    'solar input 200 w'
  )
})

test('pdfPageMatchesQuery tolerates PDF layout gaps between all requested terms', () => {
  assert.equal(
    pdfPageMatchesQuery('Solar charging specifications and DC input limits', 'solar input'),
    true
  )
  assert.equal(pdfPageMatchesQuery('SOLAR—INPUT: 200 W', 'solar input'), true)
  assert.equal(pdfPageMatchesQuery('Solar charging only', 'solar input'), false)
  assert.equal(pdfPageMatchesQuery('Solar input', ''), false)
})

test('pdfPageCitation includes title, exact page, and deep link', () => {
  assert.equal(
    pdfPageCitation('Jackery Explorer 600 v2', 17, 'http://localhost/library/document?page=17'),
    'Jackery Explorer 600 v2, p. 17. http://localhost/library/document?page=17'
  )
})
