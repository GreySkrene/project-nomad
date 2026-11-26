import test from 'node:test'
import assert from 'node:assert/strict'

import { buildReadinessChecks, readinessTotals } from '../../inertia/lib/readiness.js'

const healthy = () => ({
  healthOk: true,
  services: [
    { service_name: 'nomad_kiwix_server', status: 'running' },
    { service_name: 'nomad_kolibri_2', status: 'running' },
  ],
  zimCount: 18,
  documentCount: 158,
  mapCount: 2,
  routing: {
    available: true,
    coverage: 'Utah and Idaho',
    snapshotDate: '2026-11-23',
    liveConditionsIncluded: false,
  },
  drug: { phase: 'ready', rowCount: 262904, lastUpdated: '2026-11-06' },
  downloadCount: 0,
})

test('healthy local capabilities produce truthful ready checks while AI stays optional', () => {
  const checks = buildReadinessChecks(healthy())
  assert.deepEqual(readinessTotals(checks), { ready: 8, attention: 0, optional: 1 })
  assert.equal(checks.find((item) => item.id === 'routing')?.detail.includes('No traffic'), true)
  assert.equal(checks.find((item) => item.id === 'ai')?.level, 'optional')
})

test('missing inventories and services require attention instead of reporting ready', () => {
  const checks = buildReadinessChecks({
    ...healthy(),
    services: [],
    zimCount: null,
    documentCount: 0,
    mapCount: 0,
    routing: null,
    drug: null,
    downloadCount: null,
  })
  assert.equal(readinessTotals(checks).attention, 7)
  assert.equal(checks.find((item) => item.id === 'library')?.summary, 'Inventory unavailable')
})

test('unfinished downloads are called out as attention', () => {
  const checks = buildReadinessChecks({ ...healthy(), downloadCount: 2 })
  const queue = checks.find((item) => item.id === 'downloads')
  assert.equal(queue?.level, 'attention')
  assert.match(queue?.summary ?? '', /2 unfinished/)
})
