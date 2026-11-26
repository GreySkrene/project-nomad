export type ReadinessLevel = 'ready' | 'attention' | 'optional'

export interface ReadinessCheck {
  id: string
  label: string
  level: ReadinessLevel
  summary: string
  detail: string
  href?: string
}

export interface ReadinessInputs {
  healthOk: boolean
  services: Array<{ service_name?: string; friendly_name?: string; status?: string }>
  zimCount: number | null
  documentCount: number | null
  mapCount: number | null
  routing: {
    available?: boolean
    coverage?: string
    snapshotDate?: string | null
    liveConditionsIncluded?: boolean
  } | null
  drug: { phase?: string; rowCount?: number; lastUpdated?: string | null } | null
  downloadCount: number | null
}

export function buildReadinessChecks(inputs: ReadinessInputs): ReadinessCheck[] {
  const service = (name: string) => inputs.services.find((item) => item.service_name === name)
  const running = (name: string) => service(name)?.status === 'running'

  return [
    {
      id: 'nomad',
      label: 'NOMAD interface',
      level: inputs.healthOk ? 'ready' : 'attention',
      summary: inputs.healthOk ? 'Local application responding' : 'Health check failed',
      detail: inputs.healthOk
        ? 'The core web interface and local API responded.'
        : 'Restart NOMAD from the launcher, then run this check again.',
    },
    {
      id: 'library',
      label: 'Information library',
      level: running('nomad_kiwix_server') && (inputs.zimCount ?? 0) > 0 ? 'ready' : 'attention',
      summary:
        inputs.zimCount === null
          ? 'Inventory unavailable'
          : `${inputs.zimCount} offline article libraries`,
      detail: running('nomad_kiwix_server')
        ? 'Kiwix is running and its saved article inventory was checked.'
        : 'Kiwix is not confirmed running.',
      href: '/library-search',
    },
    {
      id: 'documents',
      label: 'Saved documents',
      level: (inputs.documentCount ?? 0) > 0 ? 'ready' : 'attention',
      summary:
        inputs.documentCount === null
          ? 'Inventory unavailable'
          : `${inputs.documentCount} saved file records`,
      detail:
        (inputs.documentCount ?? 0) > 0
          ? 'Original manuals and emergency documents are available to browse.'
          : 'No saved document records were returned.',
      href: '/library-search',
    },
    {
      id: 'maps',
      label: 'Detailed maps',
      level: (inputs.mapCount ?? 0) > 0 ? 'ready' : 'attention',
      summary:
        inputs.mapCount === null
          ? 'Inventory unavailable'
          : `${inputs.mapCount} detailed map archives`,
      detail:
        (inputs.mapCount ?? 0) > 0
          ? 'Offline vector maps are installed. They do not include live conditions.'
          : 'No detailed map archive was returned.',
      href: '/maps',
    },
    {
      id: 'routing',
      label: 'Offline routing',
      level: inputs.routing?.available ? 'ready' : 'attention',
      summary: inputs.routing?.available
        ? `${inputs.routing.coverage || 'Regional'} coverage · ${inputs.routing.snapshotDate || 'snapshot date unavailable'}`
        : 'Routing unavailable',
      detail: inputs.routing?.available
        ? 'Turn-by-turn routes are calculated locally. No traffic, closures, fire, weather, or road-damage data is included.'
        : 'Start or repair the local routing service before relying on directions.',
      href: '/maps',
    },
    {
      id: 'drug',
      label: 'Drug-label reference',
      level:
        inputs.drug?.phase === 'ready' && (inputs.drug.rowCount ?? 0) > 0 ? 'ready' : 'attention',
      summary:
        inputs.drug?.phase === 'ready'
          ? `${(inputs.drug.rowCount ?? 0).toLocaleString()} FDA label rows · ${inputs.drug.lastUpdated || 'date unavailable'}`
          : 'Dataset not ready',
      detail:
        inputs.drug?.phase === 'ready'
          ? 'The saved label database is available. It is informational and does not recommend treatment.'
          : 'The offline drug-label dataset is not confirmed ready.',
      href: '/drug-reference',
    },
    {
      id: 'education',
      label: 'Education platform',
      level: running('nomad_kolibri_2') ? 'ready' : 'attention',
      summary: running('nomad_kolibri_2') ? 'Kolibri running' : 'Kolibri not confirmed running',
      detail: running('nomad_kolibri_2')
        ? 'Installed courses and exercises can be opened locally.'
        : 'Restart the education service if you need its installed courses.',
    },
    {
      id: 'downloads',
      label: 'Download queue',
      level: inputs.downloadCount === 0 ? 'ready' : 'attention',
      summary:
        inputs.downloadCount === null
          ? 'Queue unavailable'
          : inputs.downloadCount === 0
            ? 'No active or queued downloads'
            : `${inputs.downloadCount} unfinished download job${inputs.downloadCount === 1 ? '' : 's'}`,
      detail:
        inputs.downloadCount === 0
          ? 'Nothing is still waiting on an internet connection.'
          : 'Review each job before disconnecting; partial downloads may not be usable.',
    },
    {
      id: 'ai',
      label: 'AI assistant',
      level: 'optional',
      summary: 'Intentionally paused',
      detail: 'Emergency libraries, maps, routing, planners, and source search work without AI.',
    },
  ]
}

export function readinessTotals(checks: ReadinessCheck[]) {
  return {
    ready: checks.filter((item) => item.level === 'ready').length,
    attention: checks.filter((item) => item.level === 'attention').length,
    optional: checks.filter((item) => item.level === 'optional').length,
  }
}
