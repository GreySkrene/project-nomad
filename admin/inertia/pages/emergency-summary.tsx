import { useEffect, useMemo, useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBattery,
  IconBottle,
  IconCheck,
  IconFileExport,
  IconFlame,
  IconPill,
  IconPrinter,
} from '@tabler/icons-react'

import AppLayout from '~/layouts/AppLayout'
import {
  EMERGENCY_PLANNER_STORAGE_KEY,
  buildPlannerActions,
  calculateDailyRationPlan,
  calculateOutageFoodStatus,
  calculatePlannerSummary,
  defaultEmergencyPlannerState,
  normalizeEmergencyPlannerState,
  type EmergencyPlannerState,
} from '~/lib/emergency_planner'

const categoryLabel: Record<string, string> = {
  water: 'Water',
  food: 'Food',
  medication: 'Medication',
  power: 'Power & batteries',
  sanitation: 'Sanitation',
  communication: 'Communication',
  other: 'Other',
}

export default function EmergencySummary() {
  const [state, setState] = useState<EmergencyPlannerState>(() => defaultEmergencyPlannerState())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(EMERGENCY_PLANNER_STORAGE_KEY)
      if (raw) setState(normalizeEmergencyPlannerState(JSON.parse(raw)))
    } finally {
      setLoaded(true)
    }
  }, [])

  const summary = useMemo(() => calculatePlannerSummary(state), [state])
  const actions = useMemo(() => buildPlannerActions(state, summary), [state, summary])
  const rations = useMemo(() => calculateDailyRationPlan(state), [state])
  const outage = useMemo(() => calculateOutageFoodStatus(state.outage), [state.outage])

  return (
    <AppLayout compact>
      <Head title="Printable Emergency Summary" />
      <main className="emergency-print-sheet mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/emergency-planner"
            className="inline-flex items-center gap-2 font-semibold text-text-secondary"
          >
            <IconArrowLeft size={18} /> Edit household plan
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/local-backup"
              className="inline-flex items-center rounded-lg border border-border-default px-4 py-2 font-semibold text-text-primary"
            >
              <IconFileExport className="mr-2" size={17} /> Back up data
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center rounded-lg bg-desert-green px-4 py-2 font-bold text-white"
            >
              <IconPrinter className="mr-2" size={17} /> Print / save PDF
            </button>
          </div>
        </div>

        <header className="border-b-2 border-text-primary pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">
            Project NOMAD · Offline household reference
          </p>
          <h1 className="mt-2 text-4xl font-black text-text-primary">
            Emergency readiness summary
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-secondary">
            <span>{state.householdSize} people</span>
            <span>{state.targetDays}-day target</span>
            <span>Updated {new Date(state.updatedAt).toLocaleString()}</span>
          </div>
        </header>

        {!loaded ? (
          <p className="py-12 text-center text-text-secondary">Loading local household plan…</p>
        ) : state.supplies.length === 0 && state.powerLoads.length === 0 ? (
          <section className="mt-8 rounded-xl border border-dashed border-border-default p-8 text-center">
            <h2 className="text-xl font-bold text-text-primary">No household plan is recorded</h2>
            <p className="mt-2 text-text-secondary">
              Return to Household Readiness and add supplies before printing this summary.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <article className="summary-block">
                <IconBottle size={22} />
                <span>Water</span>
                <strong>{summary.waterCoverageDays.toFixed(1)} days</strong>
                <small>
                  {summary.waterStoredGallons.toFixed(1)} / {summary.waterNeededGallons.toFixed(1)}{' '}
                  gal
                </small>
              </article>
              <article className="summary-block">
                <IconFlame size={22} />
                <span>Food energy</span>
                <strong>{summary.foodCoverageDays.toFixed(1)} days</strong>
                <small>
                  {Math.round(summary.caloriesStored).toLocaleString()} /{' '}
                  {Math.round(summary.caloriesNeeded).toLocaleString()} kcal
                </small>
              </article>
              <article className="summary-block">
                <IconPill size={22} />
                <span>Lowest medicine</span>
                <strong>
                  {summary.medicationReserveDays === null
                    ? 'Not recorded'
                    : `${summary.medicationReserveDays} days`}
                </strong>
                <small>Check every essential medicine</small>
              </article>
              <article className="summary-block">
                <IconBattery size={22} />
                <span>Portable power</span>
                <strong>
                  {summary.powerCoverageDays === null
                    ? 'No loads'
                    : `${summary.powerCoverageDays.toFixed(1)} days`}
                </strong>
                <small>{Math.round(summary.powerDailyWh)} Wh/day</small>
              </article>
            </section>

            <section className="print-section">
              <h2>Priority actions</h2>
              {actions.length === 0 ? (
                <p className="flex items-center gap-2">
                  <IconCheck size={18} /> No arithmetic shortfall or missing tracked category found.
                </p>
              ) : (
                <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                  {actions.map((action, index) => (
                    <li key={action.id} className="rounded border border-border-default p-3">
                      <strong>
                        {index + 1}. {action.title}
                      </strong>
                      <span className="mt-1 block text-sm text-text-secondary">
                        {action.detail}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {outage && (
              <section className="print-section border-amber-500/60 bg-amber-500/10">
                <h2 className="flex items-center gap-2">
                  <IconAlertTriangle size={20} /> Active food-safety timer
                </h2>
                <p className="mt-2">
                  {outage.elapsedHours.toFixed(1)} hours elapsed · refrigerator general 4-hour
                  window {outage.refrigerator === 'safe-window' ? 'not yet reached' : 'reached'} ·{' '}
                  {state.outage.freezerFull ? 'full' : 'half-full'} freezer general{' '}
                  {outage.freezerLimitHours}-hour window{' '}
                  {outage.freezer === 'safe-window' ? 'not yet reached' : 'reached'}.
                </p>
              </section>
            )}

            {rations.length > 0 && (
              <section className="print-section">
                <h2>Daily ration arithmetic</h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {rations.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between gap-3 border-b border-border-default py-2"
                    >
                      <strong>{item.name}</strong>
                      <span className="text-right text-sm">
                        {item.category === 'food'
                          ? `${Math.round(item.caloriesPerDay).toLocaleString()} kcal/day`
                          : `${item.waterGallonsPerDay.toFixed(2)} gal/day`}
                        <small className="block text-text-muted">
                          {item.quantityPerDay.toFixed(2)} {item.unit || 'item'}/day
                        </small>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {state.powerLoads.length > 0 && (
              <section className="print-section">
                <h2>Power loads</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {state.powerCapacityWh} Wh × {state.powerUsablePercent}% ={' '}
                  {Math.round(summary.powerUsableWh)} usable Wh (planning estimate only)
                </p>
                <div className="mt-3 space-y-2">
                  {state.powerLoads.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between gap-3 border-b border-border-default py-2"
                    >
                      <strong>{item.name}</strong>
                      <span>
                        {item.quantity} × {item.watts} W × {item.hoursPerDay} hr ={' '}
                        {Math.round(item.quantity * item.watts * item.hoursPerDay)} Wh/day
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="print-section">
              <h2>Supply inventory</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-text-primary">
                      <th className="py-2 pr-3">Item</th>
                      <th className="py-2 pr-3">Quantity</th>
                      <th className="py-2 pr-3">Location</th>
                      <th className="py-2">Rotate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.supplies.map((item) => (
                      <tr key={item.id} className="border-b border-border-default align-top">
                        <td className="py-2 pr-3">
                          <strong>{item.name}</strong>
                          <small className="block text-text-muted">
                            {categoryLabel[item.category]}
                          </small>
                        </td>
                        <td className="py-2 pr-3">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2 pr-3">{item.location || '—'}</td>
                        <td className="py-2">{item.expiresOn || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <footer className="mt-8 border-t border-text-primary pt-4 text-xs leading-5 text-text-secondary">
          Arithmetic from user-entered records only. This sheet does not verify completeness,
          nutrition, potability, medication safety, package condition, electrical runtime, or live
          hazards. Confirm original guidance and current conditions when possible.
        </footer>
      </main>
    </AppLayout>
  )
}
