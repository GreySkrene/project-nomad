import assert from 'node:assert/strict'
import test from 'node:test'

import {
  browseProfile,
  displayTitle,
  formatBytes,
  groupDocumentsForBrowse,
  readerDetails,
} from '../../inertia/lib/library_browse_catalog.js'
import type { StoredFileInfo } from '../../types/rag.js'
import type { ZimFileWithMetadata } from '../../types/zim.js'

function zim(name: string, overrides: Partial<ZimFileWithMetadata> = {}): ZimFileWithMetadata {
  return {
    type: 'file',
    key: `/storage/zim/${name}`,
    name,
    title: null,
    summary: null,
    author: null,
    size_bytes: 1024,
    uuid: null,
    language: 'eng',
    date: null,
    article_count: null,
    media_count: null,
    cover_data_url: null,
    ...overrides,
  } as ZimFileWithMetadata
}

test('classifies installed emergency sources by their real use', () => {
  assert.equal(browseProfile(zim('www.ready.gov_en_all_2026-01.zim')).category, 'Emergency')
  assert.equal(browseProfile(zim('medlineplus.gov_en_all_2026-01.zim')).category, 'Medical')
  assert.equal(browseProfile(zim('ifixit_en_all_2026-01.zim')).category, 'Repair')
  assert.equal(browseProfile(zim('gardenology.org_en_all_2026-01.zim')).category, 'Plants')
})

test('labels community Q&A and compact image tradeoffs honestly', () => {
  assert.equal(
    browseProfile(zim('gardening.stackexchange.com_en_all_2026-01.zim')).role,
    'Supplemental'
  )
  assert.match(
    browseProfile(zim('gardening.stackexchange.com_en_all_2026-01.zim')).formatNote ?? '',
    /Q&A/
  )
  assert.match(
    browseProfile(zim('wikipedia_en_all_mini_2026-01.zim')).formatNote ?? '',
    /images are reduced or omitted/
  )
})

test('uses known friendly titles and preserves unknown ZIM metadata', () => {
  assert.equal(
    displayTitle(zim('wikipedia_en_top_maxi_2026-01.zim')),
    'Best of Wikipedia — illustrated'
  )
  const custom = zim('custom_reference.zim', { title: 'My Local Reference' })
  assert.equal(displayTitle(custom), 'My Local Reference')
  assert.equal(browseProfile(custom).category, 'General reference')
})

test('formats installed resource sizes for scanning', () => {
  assert.equal(formatBytes(null), 'Size unavailable')
  assert.equal(formatBytes(1024 ** 3), '1.0 GB')
})

test('describes the real offline reader and repairs the compact Wikipedia entry point', () => {
  const compactWikipedia = readerDetails(
    zim('wikipedia_en_all_mini_2026-06.zim', { media_count: 33777 })
  )
  assert.equal(compactWikipedia.format, 'Compact encyclopedia')
  assert.equal(compactWikipedia.visualCoverage, 'Limited images to save space')
  assert.equal(compactWikipedia.entryPath, 'Main_Page')

  const repair = readerDetails(zim('ifixit_en_all_2025-12.zim', { media_count: 575002 }))
  assert.equal(repair.format, 'Step-by-step repair manuals')
  assert.equal(repair.visualCoverage, 'Offline images or media included')

  assert.equal(
    readerDetails(zim('gardening.stackexchange.com_en_all_2026-10.zim')).format,
    'Community Q&A archive'
  )
})

function document(fileName: string): StoredFileInfo {
  return {
    source: `/app/storage/kb_uploads/${fileName}`,
    state: 'pending_decision',
    chunksEmbedded: 0,
    fileName,
    size: 100,
    uploadedAt: null,
    isUserUpload: true,
    collection: 'official-emergency',
    active: true,
  }
}

test('groups a flat official-emergency collection into useful document sets', () => {
  const groups = groupDocumentsForBrowse([
    document('en_wtnd_2025_01.pdf'),
    document('en_wtnd_2025_02.pdf'),
    document('Jackery-Explorer-600-v2-Official-User-Manual.pdf'),
    document('UGS-Liquefaction-Hazards-PI-100.pdf'),
    document('CDC-Make-Water-Safe-During-Emergency-2025.pdf'),
    document('CDC-Radiation-Response-Briefing-Manual-2024.pdf'),
  ])

  assert.deepEqual(
    groups.map((group) => [group.title, group.files.length]),
    [
      ['Where There Is No Doctor', 2],
      ['Radiological & severe-weather preparedness', 1],
      ['Utah & Idaho regional hazards', 1],
      ['Emergency water safety', 1],
      ['Jackery Explorer 600 v2', 1],
    ]
  )
})
