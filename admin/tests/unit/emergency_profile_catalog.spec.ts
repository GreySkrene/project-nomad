import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { filterRejectedEmergencyResources } from '../../app/utils/emergency_profile_catalog.js'
import type { ZimCategoriesSpec } from '../../types/collections.js'

test('filters rejected medical resources from every tier without mutating the manifest', () => {
  const spec = {
    spec_version: 'test',
    categories: [
      {
        name: 'Medicine',
        slug: 'medicine',
        icon: 'IconStethoscope',
        description: 'test',
        language: 'en',
        tiers: [
          {
            name: 'Essential',
            slug: 'medicine-essential',
            description: 'test',
            resources: [
              { id: 'zimgit-medicine_en', version: '2024-08', title: 'Rejected', url: 'https://example.test/rejected.zim', size_mb: 1 },
              { id: 'nhs.uk_en_medicines', version: '2025-12', title: 'Keep', url: 'https://example.test/keep.zim', size_mb: 1 },
            ],
          },
          {
            name: 'Comprehensive',
            slug: 'medicine-comprehensive',
            description: 'test',
            resources: [
              { id: 'libretexts.org_en_med', version: '2025-01', title: 'Rejected', url: 'https://example.test/rejected2.zim', size_mb: 1 },
            ],
          },
        ],
      },
    ],
  } as ZimCategoriesSpec

  const filtered = filterRejectedEmergencyResources(spec)

  assert.deepEqual(
    filtered.categories[0].tiers.flatMap((tier) => tier.resources.map((resource) => resource.id)),
    ['nhs.uk_en_medicines']
  )
  assert.equal(spec.categories[0].tiers[0].resources.length, 2)
  assert.equal(spec.categories[0].tiers[1].resources.length, 1)
})
