import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createLocalBackup,
  groupRecordCount,
  parseLocalBackup,
  recordsForGroups,
  restoreLocalBackup,
} from '../../inertia/lib/local_backup.js'

const reader = (records: Record<string, string>) => ({
  getItem(key: string) {
    return records[key] ?? null
  },
})

test('exports only recognized emergency workflow records', () => {
  const backup = createLocalBackup(
    reader({
      'nomad:household-readiness:v1': '{"version":1}',
      'nomad:saved-route-plans': '[{"name":"Home"}]',
      'unrelated:secret': 'not exported',
    }) as Storage,
    new Date('2026-11-25T12:00:00Z')
  )
  assert.equal(backup.generatedAt, '2026-11-25T12:00:00.000Z')
  assert.deepEqual(backup.records, {
    'nomad:household-readiness:v1': '{"version":1}',
    'nomad:saved-route-plans': '[{"name":"Home"}]',
  })
})

test('parsing ignores unknown keys and rejects unsupported backups', () => {
  const parsed = parseLocalBackup({
    format: 'project-nomad-local-backup',
    version: 1,
    generatedAt: '2026-11-25T12:00:00Z',
    records: {
      'nomad.library.saved.v1': '[]',
      'unknown:key': 'ignored',
    },
  })
  assert.deepEqual(parsed.records, { 'nomad.library.saved.v1': '[]' })
  assert.throws(
    () =>
      parseLocalBackup({
        format: 'not-nomad',
        version: 1,
        generatedAt: '2026-11-25T12:00:00Z',
        records: {},
      }),
    /not a supported/
  )
})

test('selective restore replaces only selected groups', () => {
  const parsed = parseLocalBackup({
    format: 'project-nomad-local-backup',
    version: 1,
    generatedAt: '2026-11-25T12:00:00Z',
    records: {
      'nomad:household-readiness:v1': '{"people":2}',
      'nomad.library.saved.v1': '[{"title":"Water"}]',
      'nomad:saved-route-plans': '[{"name":"Evacuation"}]',
    },
  })
  assert.equal(groupRecordCount(parsed, 'household'), 1)
  assert.deepEqual(recordsForGroups(parsed, ['references']), {
    'nomad.library.saved.v1': '[{"title":"Water"}]',
  })

  const restored: Record<string, string> = {}
  const count = restoreLocalBackup(
    { setItem: (key: string, value: string) => void (restored[key] = value) } as Storage,
    parsed,
    ['household', 'routes']
  )
  assert.equal(count, 2)
  assert.deepEqual(restored, {
    'nomad:household-readiness:v1': '{"people":2}',
    'nomad:saved-route-plans': '[{"name":"Evacuation"}]',
  })
})
