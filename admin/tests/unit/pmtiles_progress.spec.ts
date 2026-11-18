import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { pmtilesProgressBytes } from '../../app/utils/pmtiles_progress.js'

test('uses allocated blocks for a sparse preallocated PMTiles file', () => {
  assert.equal(pmtilesProgressBytes({ size: 34_000_000_000, blocks: 6_000_000 }), 3_072_000_000)
})

test('never reports allocated storage beyond the logical file length', () => {
  assert.equal(pmtilesProgressBytes({ size: 1_000, blocks: 8 }), 1_000)
})

test('falls back to logical size when block allocation is unavailable', () => {
  assert.equal(pmtilesProgressBytes({ size: 123_456 }), 123_456)
})
