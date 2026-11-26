import { useCallback, useEffect, useMemo, useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import {
  IconAlertTriangle,
  IconBook2,
  IconCheck,
  IconCircleDashed,
  IconClockCheck,
  IconExternalLink,
  IconLoader2,
  IconRefresh,
  IconShieldCheck,
  IconWifiOff,
} from '@tabler/icons-react'

import AppLayout from '~/layouts/AppLayout'
import { buildReadinessChecks, readinessTotals, type ReadinessInputs } from '~/lib/readiness'

type LoadState = 'loading' | 'ready' | 'error'

async function json<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
  return response.json() as Promise<T>
}

export default function Readiness() {
  const [status, setStatus] = useState<LoadState>('loading')
  const [inputs, setInputs] = useState<ReadinessInputs | null>(null)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  const [error, setError] = useState('')

  const runChecks = useCallback(async () => {
    setStatus('loading')
    setError('')
    const requests = await Promise.allSettled([
      json<{ status?: string }>('/api/health'),
      json<Array<{ service_name?: string; friendly_name?: string; status?: string }>>(
        '/api/system/services'
      ),
      json<{ files?: unknown[] }>('/api/zim/list'),
      json<{ files?: unknown[] }>('/api/rag/files'),
      json<{ files?: unknown[] }>('/api/maps/regions'),
      json<ReadinessInputs['routing']>('/api/maps/routing/health'),
      json<ReadinessInputs['drug']>('/api/drug-reference/status'),
      json<unknown[]>('/api/downloads/jobs'),
    ])

    const value = <T,>(index: number): T | null =>
      requests[index].status === 'fulfilled'
        ? (requests[index] as PromiseFulfilledResult<T>).value
        : null
    const health = value<{ status?: string }>(0)
    const services = value<ReadinessInputs['services']>(1) ?? []
    const zim = value<{ files?: unknown[] }>(2)
    const documents = value<{ files?: unknown[] }>(3)
    const maps = value<{ files?: unknown[] }>(4)
    const routing = value<ReadinessInputs['routing']>(5)
    const drug = value<ReadinessInputs['drug']>(6)
    const downloads = value<unknown[]>(7)

    setInputs({
      healthOk: health?.status === 'ok',
      services,
      zimCount: Array.isArray(zim?.files) ? zim.files.length : null,
      documentCount: Array.isArray(documents?.files) ? documents.files.length : null,
      mapCount: Array.isArray(maps?.files) ? maps.files.length : null,
      routing,
      drug,
      downloadCount: Array.isArray(downloads) ? downloads.length : null,
    })
    setCheckedAt(new Date())
    const failed = requests.filter((item) => item.status === 'rejected').length
    if (failed === requests.length) {
      setStatus('error')
      setError(
        'NOMAD could not reach any local capability checks. Restart it from the launcher and retry.'
      )
    } else {
      setStatus('ready')
      if (failed > 0)
        setError(
          `${failed} local check${failed === 1 ? '' : 's'} could not be reached. Those capabilities are marked for attention below.`
        )
    }
  }, [])

  useEffect(() => {
    runChecks()
  }, [runChecks])

  const checks = useMemo(() => (inputs ? buildReadinessChecks(inputs) : []), [inputs])
  const totals = useMemo(() => readinessTotals(checks), [checks])

  return (
    <AppLayout compact>
      <Head title="System Readiness" />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="nomad-kicker">LOCAL CAPABILITY CHECK</p>
            <h1 className="mt-2 text-4xl font-black text-text-primary">
              Is NOMAD ready right now?
            </h1>
            <p className="mt-3 max-w-3xl text-lg text-text-secondary">
              Checks the local services and saved inventories that matter during an outage. This
              page never starts AI or contacts an external service.
            </p>
          </div>
          <button
            type="button"
            onClick={runChecks}
            disabled={status === 'loading'}
            className="inline-flex items-center justify-center rounded-lg bg-desert-green px-5 py-3 font-bold text-white hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
          >
            <IconRefresh
              className={`mr-2 ${status === 'loading' ? 'animate-spin' : ''}`}
              size={19}
            />{' '}
            Run checks
          </button>
        </section>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-4">
          <IconWifiOff className="mt-0.5 shrink-0 text-amber-500" size={21} />
          <div className="text-sm text-text-secondary">
            <strong className="text-text-primary">
              A green report is not proof that the internet is disconnected.
            </strong>{' '}
            For final acceptance, physically disable networking, reboot Windows, start NOMAD from
            the launcher, and run{' '}
            <code className="break-all text-text-primary">install\test_offline_readiness.ps1</code>.
          </div>
        </div>

        {status === 'loading' && !inputs && (
          <div
            role="status"
            className="mt-8 flex items-center justify-center gap-3 rounded-xl border border-border-default bg-surface-primary p-12 text-text-secondary"
          >
            <IconLoader2 className="animate-spin" /> Checking local capabilities…
          </div>
        )}
        {status === 'error' && !inputs && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-desert-red/50 bg-desert-red/10 p-6"
          >
            <h2 className="text-xl font-bold text-text-primary">Readiness check failed</h2>
            <p className="mt-2 text-text-secondary">{error}</p>
            <button
              type="button"
              onClick={runChecks}
              className="mt-4 rounded-lg border border-border-default px-4 py-2 font-semibold text-text-primary"
            >
              Retry
            </button>
          </div>
        )}

        {inputs && (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-3">
              <article className="rounded-xl border border-desert-green/50 bg-desert-green/10 p-5">
                <IconShieldCheck className="text-desert-green" size={28} />
                <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
                  Ready
                </p>
                <strong className="mt-1 block text-4xl text-text-primary">{totals.ready}</strong>
              </article>
              <article
                className={`rounded-xl border p-5 ${totals.attention > 0 ? 'border-amber-500/60 bg-amber-500/10' : 'border-border-default bg-surface-primary'}`}
              >
                <IconAlertTriangle
                  className={totals.attention > 0 ? 'text-amber-500' : 'text-text-muted'}
                  size={28}
                />
                <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
                  Needs attention
                </p>
                <strong className="mt-1 block text-4xl text-text-primary">
                  {totals.attention}
                </strong>
              </article>
              <article className="rounded-xl border border-border-default bg-surface-primary p-5">
                <IconCircleDashed className="text-text-muted" size={28} />
                <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
                  Optional / paused
                </p>
                <strong className="mt-1 block text-4xl text-text-primary">{totals.optional}</strong>
              </article>
            </section>

            {error && (
              <p
                role="alert"
                className="mt-5 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-text-primary"
              >
                {error}
              </p>
            )}
            <p className="mt-4 flex items-center gap-2 text-sm text-text-muted">
              <IconClockCheck size={16} /> Checked {checkedAt?.toLocaleString() ?? 'just now'}
            </p>

            <section className="mt-6 grid gap-4 md:grid-cols-2" aria-label="Readiness checks">
              {checks.map((check) => {
                const ready = check.level === 'ready'
                const optional = check.level === 'optional'
                const Icon = ready ? IconCheck : optional ? IconCircleDashed : IconAlertTriangle
                const card = (
                  <article
                    className={`h-full rounded-xl border p-5 transition-colors ${ready ? 'border-desert-green/40 bg-surface-primary' : optional ? 'border-border-default bg-surface-primary' : 'border-amber-500/60 bg-amber-500/10'} ${check.href ? 'hover:border-desert-green' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <span
                        className={`rounded-full p-2 ${ready ? 'bg-desert-green/15 text-desert-green' : optional ? 'bg-surface-secondary text-text-muted' : 'bg-amber-500/15 text-amber-500'}`}
                      >
                        <Icon size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="text-lg font-bold text-text-primary">{check.label}</h2>
                          {check.href && (
                            <IconExternalLink className="shrink-0 text-text-muted" size={17} />
                          )}
                        </div>
                        <p className="mt-1 font-semibold text-text-secondary">{check.summary}</p>
                        <p className="mt-2 text-sm leading-5 text-text-muted">{check.detail}</p>
                      </div>
                    </div>
                  </article>
                )
                return check.href ? (
                  <Link key={check.id} href={check.href}>
                    {card}
                  </Link>
                ) : (
                  <div key={check.id}>{card}</div>
                )
              })}
            </section>

            <section className="mt-8 grid gap-4 md:grid-cols-2">
              <Link
                href="/emergency-planner"
                className="rounded-xl border border-border-default bg-surface-primary p-6 hover:border-desert-green"
              >
                <IconBook2 className="text-desert-green" size={26} />
                <strong className="mt-3 block text-xl text-text-primary">
                  Check household supplies
                </strong>
                <span className="mt-1 block text-sm text-text-secondary">
                  Calculate food, water, medication, and rotation coverage.
                </span>
              </Link>
              <a
                href="/docs/home"
                className="rounded-xl border border-border-default bg-surface-primary p-6 hover:border-desert-green"
              >
                <IconExternalLink className="text-desert-green" size={26} />
                <strong className="mt-3 block text-xl text-text-primary">
                  Launcher and offline instructions
                </strong>
                <span className="mt-1 block text-sm text-text-secondary">
                  Review startup, recovery, and maintenance guidance.
                </span>
              </a>
            </section>
          </>
        )}
      </main>
    </AppLayout>
  )
}
