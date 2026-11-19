import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildSpellingIndex, editDistance, suggestSpelling } from '../../app/utils/spelling.js'

const index = buildSpellingIndex(['cloud', 'cumulonimbus', 'computing', 'weather', 'wildfire'])

test('supports adjacent transpositions', () => {
  assert.equal(editDistance('cluod', 'cloud'), 1)
})

test('corrects the reported cumulonimbus misspelling', () => {
  assert.equal(suggestSpelling('culumbonimbus', index), 'cumulonimbus')
})

test('does not change correctly spelled or very short words', () => {
  assert.equal(suggestSpelling('cloud weather', index), null)
  assert.equal(suggestSpelling('the', index), null)
})

test('preserves initial capitalization and surrounding text', () => {
  assert.equal(suggestSpelling('Culumbonimbus cloud', index), 'Cumulonimbus cloud')
})
