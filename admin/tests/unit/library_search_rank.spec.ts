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

test('uses the emergency authority bonus only when the query has safety intent', () => {
  const exact = { value: 'Splint', source: 'wikipedia_en_all_mini_2026-06' }
  const medical = { value: 'Splint (medical)', source: 'wikipedia_en_medicine_maxi_2026-10' }
  assert.ok(titleSuggestionScore('splint', medical) < titleSuggestionScore('splint', exact))

  const exactBackground = { value: 'Physiology', source: 'wikipedia_en_all_mini_2026-06' }
  const medicalBackground = {
    value: 'Physiology in medicine',
    source: 'wikipedia_en_medicine_maxi_2026-10',
  }
  assert.ok(
    titleSuggestionScore('physiology', exactBackground) <
      titleSuggestionScore('physiology', medicalBackground)
  )
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

test('promotes an unambiguous medical meaning over an ambiguous exact encyclopedia title', () => {
  const ranked = rankTitleSuggestions('shock', [
    { value: 'SHOCK', source: 'wikipedia_en_all_mini_2026-06' },
    { value: 'Shock (circulatory)', source: 'wikipedia_en_medicine_maxi_2026-10' },
    { value: 'Shock | MedlinePlus', source: 'medlineplus.gov_en_all_2025-01' },
  ])

  assert.equal(ranked[0].value, 'Shock (circulatory)')
  assert.equal(ranked[1].value, 'Shock | MedlinePlus')
})

test('promotes official power-outage guidance over an exact background article', () => {
  const ranked = rankTitleSuggestions('power outage', [
    { value: 'Power outage', source: 'wikipedia_en_all_mini_2026-06' },
    { value: 'Power Outage Info Sheets | Ready.gov', source: 'www.ready.gov_en_2024-12' },
  ])

  assert.equal(ranked[0].source, 'www.ready.gov_en_2024-12')
})

test('does not apply the authority bonus to a non-emergency query', () => {
  const ranked = rankTitleSuggestions('watercolor', [
    { value: 'Watercolor', source: 'wikipedia_en_all_mini_2026-06' },
    { value: 'Water | Ready.gov', source: 'www.ready.gov_en_2024-12' },
  ])

  assert.equal(ranked[0].value, 'Watercolor')
})
