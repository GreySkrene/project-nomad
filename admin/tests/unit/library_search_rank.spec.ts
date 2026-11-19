import assert from 'node:assert/strict'
import test from 'node:test'

import {
  rankTitleSuggestions,
  selectDiverseTitleSuggestions,
  titleSuggestionScore,
} from '../../inertia/lib/library_search_rank.js'

test('ranks a medical splint title ahead of unrelated prefix matches', () => {
  const ranked = rankTitleSuggestions('splint', [
    { value: 'Splintwood', source: 'wikipedia_en_top_maxi_2026-06' },
    { value: 'Splendid Splinter', source: 'wikipedia_en_top_maxi_2026-06' },
    { value: 'Splint (medical)', source: 'wikipedia_en_medicine_maxi_2026-10' },
    { value: 'How to make a splint', source: 'medlineplus.gov_en_all_2025-01' },
  ])

  assert.deepEqual(
    ranked.map((result) => result.value),
    ['Splint (medical)', 'How to make a splint', 'Splintwood', 'Splendid Splinter']
  )
})

test('uses authoritative source preference only after literal title relevance', () => {
  const exact = { value: 'Splint', source: 'wikipedia_en_all_mini_2026-06' }
  const medical = { value: 'Splint (medical)', source: 'wikipedia_en_medicine_maxi_2026-10' }
  assert.ok(titleSuggestionScore('splint', exact) < titleSuggestionScore('splint', medical))
})

test('recognizes a medical term next to punctuation as a whole-title term', () => {
  const medline = {
    value: 'How to make a splint: MedlinePlus Medical Encyclopedia',
    source: 'medlineplus.gov_en_all_2025-01',
  }
  const unrelated = { value: 'Splintwood', source: 'wikipedia_en_top_maxi_2026-06' }
  assert.ok(titleSuggestionScore('splint', medline) < titleSuggestionScore('splint', unrelated))
})

test('keeps one archive from crowding an actionable medical source out of the results', () => {
  const crowded = Array.from({ length: 10 }, (_, index) => ({
    value: `Splint medical variant ${index}`,
    source: 'wikipedia_en_medicine_maxi_2026-10',
  }))
  const selected = selectDiverseTitleSuggestions(
    'splint',
    [...crowded, { value: 'How to make a splint', source: 'medlineplus.gov_en_all_2025-01' }],
    6,
    4
  )

  assert.ok(selected.some((result) => result.value === 'How to make a splint'))
  assert.equal(
    selected.filter((result) => result.source.includes('wikipedia_en_medicine')).length,
    4
  )
})
