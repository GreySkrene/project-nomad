import { ChangeEvent, useMemo, useRef, useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import {
  IconAlertTriangle,
  IconBook2,
  IconCheck,
  IconDatabaseExport,
  IconDownload,
  IconFileImport,
  IconMapRoute,
  IconPackage,
  IconRefresh,
  IconShieldLock,
} from '@tabler/icons-react'

import AppLayout from '~/layouts/AppLayout'
import {
  LOCAL_BACKUP_GROUPS,
  backupFilename,
  createLocalBackup,
  groupRecordCount,
  parseLocalBackup,
  restoreLocalBackup,
  type LocalBackupFile,
  type LocalBackupGroupId,
} from '~/lib/local_backup'

const GROUP_ICONS = {
  household: IconPackage,
  references: IconBook2,
  routes: IconMapRoute,
}

export default function LocalBackup() {
  const [currentRevision, setCurrentRevision] = useState(0)
  const [imported, setImported] = useState<LocalBackupFile | null>(null)
  const [selectedGroups, setSelectedGroups] = useState<Set<LocalBackupGroupId>>(
    () => new Set(LOCAL_BACKUP_GROUPS.map((group) => group.id))
  )
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  const current = useMemo(
    () => (typeof window === 'undefined' ? null : createLocalBackup(window.localStorage)),
    [currentRevision]
  )

  const exportBackup = () => {
    if (!current) return
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = backupFilename()
    anchor.click()
    URL.revokeObjectURL(url)
    setError('')
    setNotice('Local backup exported. Store it somewhere you can reach during an outage.')
  }

  const readImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setNotice('')
    setError('')
    try {
      if (file.size > 10_000_000) throw new Error('Backup is larger than the 10 MB limit.')
      const backup = parseLocalBackup(JSON.parse(await file.text()))
      if (Object.keys(backup.records).length === 0) {
        throw new Error('The backup contains no recognized local NOMAD records.')
      }
      setImported(backup)
      setSelectedGroups(
        new Set(
          LOCAL_BACKUP_GROUPS.filter((group) => groupRecordCount(backup, group.id) > 0).map(
            (group) => group.id
          )
        )
      )
    } catch (reason) {
      setImported(null)
      setError(reason instanceof Error ? reason.message : 'Backup could not be read.')
    }
  }

  const restore = () => {
    if (!imported || selectedGroups.size === 0) return
    const labels = LOCAL_BACKUP_GROUPS.filter((group) => selectedGroups.has(group.id)).map(
      (group) => group.label
    )
    if (
      !window.confirm(
        `Restore ${labels.join(', ')}? Matching data in this browser will be replaced. Other local data is left alone.`
      )
    )
      return
    try {
      const restored = restoreLocalBackup(window.localStorage, imported, selectedGroups)
      setCurrentRevision((value) => value + 1)
      setImported(null)
      setError('')
      setNotice(
        `${restored} local record${restored === 1 ? '' : 's'} restored. Reopen Maps or Household Readiness to load the restored state.`
      )
    } catch {
      setError('The browser refused the restore. Check available browser storage and try again.')
    }
  }

  return (
    <AppLayout compact>
      <Head title="Offline Backup" />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="nomad-kicker">LOCAL CONTINUITY / NO CLOUD</p>
            <h1 className="mt-2 text-4xl font-black text-text-primary">Back up your local plan</h1>
            <p className="mt-3 max-w-3xl text-lg text-text-secondary">
              Export browser-local emergency data to one JSON file, then selectively restore it
              after a browser reset or on another NOMAD browser.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportBackup}
              className="inline-flex items-center rounded-lg bg-desert-green px-5 py-3 font-bold text-white hover:brightness-110"
            >
              <IconDownload className="mr-2" size={19} /> Export backup
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="inline-flex items-center rounded-lg border border-border-default bg-surface-primary px-5 py-3 font-bold text-text-primary"
            >
              <IconFileImport className="mr-2" size={19} /> Import
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              aria-label="Choose a NOMAD local backup file"
              className="sr-only"
              onChange={readImport}
            />
          </div>
        </section>

        <div className="mt-6 flex gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-text-secondary">
          <IconShieldLock className="mt-0.5 shrink-0 text-amber-500" size={22} />
          <div>
            <strong className="text-text-primary">The exported file is not encrypted.</strong> It
            may reveal supply details and saved route locations. Keep it on storage you control; do
            not email or publicly upload it. NOMAD never sends this backup to a server.
          </div>
        </div>

        {(notice || error) && (
          <p
            role={error ? 'alert' : 'status'}
            className={`mt-5 rounded-lg border px-4 py-3 text-sm font-semibold ${error ? 'border-desert-red/50 bg-desert-red/10 text-desert-red' : 'border-desert-green/50 bg-desert-green/10 text-text-primary'}`}
          >
            {error || notice}
          </p>
        )}

        <section className="mt-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-text-primary">Data in this browser</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Only recognized emergency-workflow keys are included.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentRevision((value) => value + 1)}
              className="inline-flex self-start items-center gap-2 text-sm font-semibold text-desert-green"
            >
              <IconRefresh size={16} /> Refresh inventory
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {LOCAL_BACKUP_GROUPS.map((group) => {
              const Icon = GROUP_ICONS[group.id]
              const count = current ? groupRecordCount(current, group.id) : 0
              return (
                <article
                  key={group.id}
                  className="rounded-xl border border-border-default bg-surface-primary p-5"
                >
                  <Icon className="text-desert-green" size={26} />
                  <h3 className="mt-3 text-lg font-bold text-text-primary">{group.label}</h3>
                  <p className="mt-1 text-sm leading-5 text-text-secondary">{group.description}</p>
                  <span className="mt-4 inline-flex rounded-full bg-surface-secondary px-3 py-1 text-xs font-semibold text-text-secondary">
                    {count > 0
                      ? `${count} local record${count === 1 ? '' : 's'}`
                      : 'Nothing saved yet'}
                  </span>
                </article>
              )
            })}
          </div>
        </section>

        {imported && (
          <section className="mt-8 rounded-xl border border-desert-green/50 bg-surface-primary p-6">
            <div className="flex items-start gap-3">
              <IconDatabaseExport className="mt-0.5 shrink-0 text-desert-green" size={26} />
              <div>
                <h2 className="text-2xl font-black text-text-primary">Review before restoring</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Backup created {new Date(imported.generatedAt).toLocaleString()}. Choose only the
                  groups you intend to replace.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {LOCAL_BACKUP_GROUPS.map((group) => {
                const count = groupRecordCount(imported, group.id)
                return (
                  <label
                    key={group.id}
                    className={`flex items-start gap-3 rounded-lg border p-4 ${count > 0 ? 'border-border-default' : 'border-border-subtle opacity-50'}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-desert-green"
                      checked={selectedGroups.has(group.id)}
                      disabled={count === 0}
                      onChange={(event) => {
                        const next = new Set(selectedGroups)
                        if (event.target.checked) next.add(group.id)
                        else next.delete(group.id)
                        setSelectedGroups(next)
                      }}
                    />
                    <span>
                      <strong className="text-text-primary">{group.label}</strong>
                      <span className="mt-0.5 block text-sm text-text-secondary">
                        {count} recognized record{count === 1 ? '' : 's'}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={selectedGroups.size === 0}
                onClick={restore}
                className="inline-flex items-center rounded-lg bg-desert-green px-5 py-3 font-bold text-white disabled:opacity-50"
              >
                <IconCheck className="mr-2" size={19} /> Restore selected
              </button>
              <button
                type="button"
                onClick={() => setImported(null)}
                className="rounded-lg border border-border-default px-5 py-3 font-semibold text-text-primary"
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border-default bg-surface-primary p-5">
            <IconAlertTriangle className="text-amber-500" size={24} />
            <h2 className="mt-3 text-lg font-bold text-text-primary">Not included</h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              Downloaded books, PDFs, maps, server-stored map pins, Notes, Kolibri progress, and
              service settings live outside browser storage. This file is not a full NOMAD disk
              backup.
            </p>
          </div>
          <Link
            href="/readiness"
            className="rounded-xl border border-border-default bg-surface-primary p-5 hover:border-desert-green"
          >
            <IconCheck className="text-desert-green" size={24} />
            <h2 className="mt-3 text-lg font-bold text-text-primary">Check system readiness</h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              Confirm the server-side libraries and services separately after restoring local data.
            </p>
          </Link>
        </section>
      </main>
    </AppLayout>
  )
}
