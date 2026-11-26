export const LOCAL_BACKUP_FORMAT = 'project-nomad-local-backup'
export const LOCAL_BACKUP_VERSION = 1

export const LOCAL_BACKUP_GROUPS = [
  {
    id: 'household',
    label: 'Household readiness',
    description: 'Supply inventory, planning assumptions, power loads, and outage timer.',
    keys: ['nomad:household-readiness:v1'],
  },
  {
    id: 'references',
    label: 'Saved references',
    description: 'Saved and recently opened NOMAD library references.',
    keys: ['nomad.library.saved.v1', 'nomad.library.recent.v1'],
  },
  {
    id: 'routes',
    label: 'Routes and map view',
    description: 'Route draft, saved plans, last result, selected alternative, and map position.',
    keys: [
      'nomad:route-draft',
      'nomad:saved-route-plans',
      'nomad:last-route-result',
      'nomad:last-route-selection',
      'nomad:map-view',
      'nomad:map-scale-unit',
    ],
  },
] as const

export type LocalBackupGroupId = (typeof LOCAL_BACKUP_GROUPS)[number]['id']
export type LocalBackupRecordKey = (typeof LOCAL_BACKUP_GROUPS)[number]['keys'][number]

export interface LocalBackupFile {
  format: typeof LOCAL_BACKUP_FORMAT
  version: typeof LOCAL_BACKUP_VERSION
  generatedAt: string
  records: Partial<Record<LocalBackupRecordKey, string>>
}

type StorageReader = Pick<Storage, 'getItem'>
type StorageWriter = Pick<Storage, 'setItem'>

const knownKeys = new Set<string>(LOCAL_BACKUP_GROUPS.flatMap((group) => [...group.keys]))

export function createLocalBackup(storage: StorageReader, now = new Date()): LocalBackupFile {
  const records: LocalBackupFile['records'] = {}
  for (const key of knownKeys) {
    const value = storage.getItem(key)
    if (value !== null) records[key as LocalBackupRecordKey] = value
  }
  return {
    format: LOCAL_BACKUP_FORMAT,
    version: LOCAL_BACKUP_VERSION,
    generatedAt: now.toISOString(),
    records,
  }
}

export function parseLocalBackup(value: unknown): LocalBackupFile {
  if (!value || typeof value !== 'object') throw new Error('Backup must be a JSON object.')
  const raw = value as Partial<LocalBackupFile>
  if (raw.format !== LOCAL_BACKUP_FORMAT || raw.version !== LOCAL_BACKUP_VERSION) {
    throw new Error('This is not a supported Project NOMAD local backup.')
  }
  if (typeof raw.generatedAt !== 'string' || !Number.isFinite(Date.parse(raw.generatedAt))) {
    throw new Error('Backup date is missing or invalid.')
  }
  if (!raw.records || typeof raw.records !== 'object' || Array.isArray(raw.records)) {
    throw new Error('Backup records are missing or invalid.')
  }

  const records: LocalBackupFile['records'] = {}
  let totalSize = 0
  for (const [key, recordValue] of Object.entries(raw.records)) {
    if (!knownKeys.has(key)) continue
    if (typeof recordValue !== 'string') throw new Error(`Backup record ${key} is invalid.`)
    totalSize += recordValue.length
    if (recordValue.length > 5_000_000 || totalSize > 10_000_000) {
      throw new Error('Backup records exceed the 10 MB safety limit.')
    }
    records[key as LocalBackupRecordKey] = recordValue
  }
  return {
    format: LOCAL_BACKUP_FORMAT,
    version: LOCAL_BACKUP_VERSION,
    generatedAt: raw.generatedAt,
    records,
  }
}

export function recordsForGroups(
  backup: LocalBackupFile,
  groups: Iterable<LocalBackupGroupId>
): LocalBackupFile['records'] {
  const selected = new Set(groups)
  const allowed = new Set(
    LOCAL_BACKUP_GROUPS.filter((group) => selected.has(group.id)).flatMap((group) => [
      ...group.keys,
    ])
  )
  return Object.fromEntries(
    Object.entries(backup.records).filter(([key]) => allowed.has(key as LocalBackupRecordKey))
  ) as LocalBackupFile['records']
}

export function restoreLocalBackup(
  storage: StorageWriter,
  backup: LocalBackupFile,
  groups: Iterable<LocalBackupGroupId>
): number {
  const records = recordsForGroups(backup, groups)
  for (const [key, value] of Object.entries(records)) storage.setItem(key, value)
  return Object.keys(records).length
}

export function backupFilename(now = new Date()) {
  return `nomad-local-backup-${now.toISOString().slice(0, 10)}.json`
}

export function groupRecordCount(backup: LocalBackupFile, groupId: LocalBackupGroupId) {
  const group = LOCAL_BACKUP_GROUPS.find((candidate) => candidate.id === groupId)
  return group ? group.keys.filter((key) => backup.records[key] !== undefined).length : 0
}
