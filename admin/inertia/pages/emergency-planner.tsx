import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import {
  IconAlertTriangle,
  IconBattery,
  IconBolt,
  IconMapRoute,
  IconBottle,
  IconBox,
  IconCheck,
  IconClock,
  IconDownload,
  IconEdit,
  IconFileImport,
  IconFlame,
  IconPill,
  IconPlus,
  IconPrinter,
  IconRefresh,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react'

import AppLayout from '~/layouts/AppLayout'
import {
  EMERGENCY_PLANNER_STORAGE_KEY,
  calculateDailyRationPlan,
  calculateOutageFoodStatus,
  calculatePlannerSummary,
  buildPlannerActions,
  defaultEmergencyPlannerState,
  normalizeEmergencyPlannerState,
  plannerExportFilename,
  type EmergencyPlannerState,
  type EmergencySupply,
  type PowerLoad,
  type SupplyCategory,
} from '~/lib/emergency_planner'

const CATEGORY_LABELS: Record<SupplyCategory, string> = {
  water: 'Water',
  food: 'Food',
  medication: 'Medication',
  power: 'Power & batteries',
  sanitation: 'Sanitation',
  communication: 'Communication',
  other: 'Other',
}

const emptySupply = (): EmergencySupply => ({
  id: '',
  name: '',
  category: 'water',
  quantity: 1,
  unit: 'item',
  caloriesTotal: 0,
  waterGallons: 0,
  reserveDays: 0,
  expiresOn: '',
  location: '',
  notes: '',
})

const emptyPowerLoad = (): PowerLoad => ({
  id: '',
  name: '',
  watts: 10,
  hoursPerDay: 1,
  quantity: 1,
})

function coverageLabel(days: number, target: number) {
  if (days >= target) return `${days.toFixed(1)} days · target met`
  return `${days.toFixed(1)} days · ${Math.max(0, target - days).toFixed(1)} short`
}

function ProgressBar({ value, target }: { value: number; target: number }) {
  const percent = Math.min(100, target > 0 ? (value / target) * 100 : 0)
  const ready = value >= target
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-secondary" aria-hidden="true">
      <div
        className={`h-full rounded-full ${ready ? 'bg-desert-green' : 'bg-amber-500'}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

export default function EmergencyPlanner() {
  const [state, setState] = useState<EmergencyPlannerState>(() => defaultEmergencyPlannerState())
  const [loaded, setLoaded] = useState(false)
  const [supply, setSupply] = useState<EmergencySupply>(() => emptySupply())
  const [powerLoad, setPowerLoad] = useState<PowerLoad>(() => emptyPowerLoad())
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [clock, setClock] = useState(() => new Date())
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(EMERGENCY_PLANNER_STORAGE_KEY)
      if (saved) setState(normalizeEmergencyPlannerState(JSON.parse(saved)))
    } catch {
      setNotice('Saved planner data could not be read. A new local plan is open instead.')
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!loaded) return
    const next = { ...state, updatedAt: new Date().toISOString() }
    try {
      window.localStorage.setItem(EMERGENCY_PLANNER_STORAGE_KEY, JSON.stringify(next))
    } catch {
      setNotice('This browser could not save the plan. Export a backup before leaving this page.')
    }
  }, [state, loaded])

  useEffect(() => {
    if (!state.outage.startedAt) return
    const interval = window.setInterval(() => setClock(new Date()), 60_000)
    return () => window.clearInterval(interval)
  }, [state.outage.startedAt])

  const summary = useMemo(() => calculatePlannerSummary(state, clock), [state, clock])
  const outageStatus = useMemo(
    () => calculateOutageFoodStatus(state.outage, clock),
    [state.outage, clock]
  )
  const sortedSupplies = useMemo(
    () =>
      [...state.supplies].sort(
        (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
      ),
    [state.supplies]
  )
  const rationRows = useMemo(() => calculateDailyRationPlan(state), [state])
  const plannerActions = useMemo(() => buildPlannerActions(state, summary), [state, summary])
  const foodRations = rationRows.filter((item) => item.category === 'food')
  const waterRations = rationRows.filter((item) => item.category === 'water')

  const updateAssumption = (
    key:
      | 'householdSize'
      | 'targetDays'
      | 'dailyCaloriesPerPerson'
      | 'dailyWaterGallonsPerPerson'
      | 'powerCapacityWh'
      | 'powerUsablePercent',
    value: string
  ) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return
    setState((current) => ({ ...current, [key]: parsed }))
  }

  const savePowerLoad = (event: FormEvent) => {
    event.preventDefault()
    const name = powerLoad.name.trim()
    if (!name || powerLoad.watts <= 0 || powerLoad.hoursPerDay <= 0 || powerLoad.quantity <= 0) {
      setNotice('Power loads need a name and positive watts, hours per day, and quantity.')
      return
    }
    const saved = { ...powerLoad, id: powerLoad.id || crypto.randomUUID(), name }
    setState((current) => ({
      ...current,
      powerLoads: current.powerLoads.some((item) => item.id === saved.id)
        ? current.powerLoads.map((item) => (item.id === saved.id ? saved : item))
        : [...current.powerLoads, saved],
    }))
    setPowerLoad(emptyPowerLoad())
    setNotice(powerLoad.id ? 'Power load updated locally.' : 'Power load added locally.')
  }

  const removePowerLoad = (item: PowerLoad) => {
    if (!window.confirm(`Remove “${item.name}” from the power budget?`)) return
    setState((current) => ({
      ...current,
      powerLoads: current.powerLoads.filter((candidate) => candidate.id !== item.id),
    }))
    if (powerLoad.id === item.id) setPowerLoad(emptyPowerLoad())
  }

  const saveSupply = (event: FormEvent) => {
    event.preventDefault()
    const name = supply.name.trim()
    if (!name) {
      setFormError('Give this supply a name.')
      return
    }
    const savedSupply = { ...supply, id: supply.id || crypto.randomUUID(), name }
    setState((current) => ({
      ...current,
      supplies: current.supplies.some((item) => item.id === savedSupply.id)
        ? current.supplies.map((item) => (item.id === savedSupply.id ? savedSupply : item))
        : [...current.supplies, savedSupply],
    }))
    setSupply(emptySupply())
    setFormError('')
    setNotice(supply.id ? 'Supply updated locally.' : 'Supply added locally.')
  }

  const editSupply = (item: EmergencySupply) => {
    setSupply({ ...item })
    setFormError('')
    document.getElementById('supply-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const removeSupply = (item: EmergencySupply) => {
    if (!window.confirm(`Remove “${item.name}” from this local inventory?`)) return
    setState((current) => ({
      ...current,
      supplies: current.supplies.filter((candidate) => candidate.id !== item.id),
    }))
    if (supply.id === item.id) setSupply(emptySupply())
  }

  const exportPlan = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = plannerExportFilename()
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('Planner backup exported. Keep a copy somewhere you can reach offline.')
  }

  const importPlan = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      if (file.size > 2_000_000) throw new Error('File is larger than 2 MB.')
      const parsed = JSON.parse(await file.text())
      const imported = normalizeEmergencyPlannerState(parsed)
      if (
        !window.confirm(
          `Replace this browser's plan with ${imported.supplies.length} imported supplies?`
        )
      )
        return
      setState(imported)
      setSupply(emptySupply())
      setPowerLoad(emptyPowerLoad())
      setNotice('Planner backup imported and saved in this browser.')
    } catch (error) {
      setNotice(error instanceof Error ? `Import failed: ${error.message}` : 'Import failed.')
    }
  }

  const clearPlan = () => {
    if (
      !window.confirm(
        'Clear the household assumptions, inventory, and outage timer in this browser? Export first if you may need a backup.'
      )
    )
      return
    setState(defaultEmergencyPlannerState())
    setSupply(emptySupply())
    setPowerLoad(emptyPowerLoad())
    setNotice('Local household plan cleared.')
  }

  return (
    <AppLayout compact>
      <Head title="Household Readiness" />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="nomad-kicker">HOUSEHOLD OPERATIONS / MODEL-FREE</p>
            <h1 className="mt-2 text-4xl font-black text-text-primary">
              How long can your household operate?
            </h1>
            <p className="mt-3 max-w-3xl text-lg text-text-secondary">
              Track essential supplies, see transparent food and water coverage, and start a
              power-outage food-safety timer. Nothing here requires internet or AI.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/emergency-summary"
              className="inline-flex items-center rounded-lg border border-border-default bg-surface-primary px-4 py-3 font-bold text-text-primary"
            >
              <IconPrinter className="mr-2" size={18} /> Print summary
            </Link>
            <button
              type="button"
              onClick={exportPlan}
              className="rounded-lg border border-border-default bg-surface-primary px-4 py-2 font-semibold text-text-primary hover:bg-surface-secondary"
            >
              <IconDownload className="mr-2 inline" size={18} /> Export backup
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="rounded-lg border border-border-default bg-surface-primary px-4 py-2 font-semibold text-text-primary hover:bg-surface-secondary"
            >
              <IconFileImport className="mr-2 inline" size={18} /> Import
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={importPlan}
            />
          </div>
        </section>

        <div className="mt-6 rounded-xl border border-sky-500/40 bg-sky-500/10 p-4 text-sm text-text-secondary">
          <strong className="text-text-primary">Stored only in this browser.</strong> Export a
          backup after important changes. Avoid entering names, prescription numbers, account
          information, or other sensitive records. Coverage is arithmetic from your entries, not a
          guarantee that supplies are safe, complete, or nutritionally appropriate.
        </div>
        {notice && (
          <div
            role="status"
            className="mt-4 rounded-lg border border-border-default bg-surface-secondary px-4 py-3 text-sm text-text-primary"
          >
            {notice}
          </div>
        )}

        <section
          className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Household coverage summary"
        >
          <article className="rounded-xl border border-border-default bg-surface-primary p-5">
            <IconBottle className="text-sky-500" size={26} />
            <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
              Water
            </p>
            <h2 className="mt-1 text-2xl font-black text-text-primary">
              {coverageLabel(summary.waterCoverageDays, state.targetDays)}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {summary.waterStoredGallons.toFixed(1)} stored /{' '}
              {summary.waterNeededGallons.toFixed(1)} gal target
            </p>
            <ProgressBar value={summary.waterCoverageDays} target={state.targetDays} />
          </article>
          <article className="rounded-xl border border-border-default bg-surface-primary p-5">
            <IconFlame className="text-desert-orange" size={26} />
            <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
              Food energy
            </p>
            <h2 className="mt-1 text-2xl font-black text-text-primary">
              {coverageLabel(summary.foodCoverageDays, state.targetDays)}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {Math.round(summary.caloriesStored).toLocaleString()} stored /{' '}
              {Math.round(summary.caloriesNeeded).toLocaleString()} kcal target
            </p>
            <ProgressBar value={summary.foodCoverageDays} target={state.targetDays} />
          </article>
          <article className="rounded-xl border border-border-default bg-surface-primary p-5">
            <IconPill className="text-desert-green" size={26} />
            <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
              Medication reserve
            </p>
            <h2 className="mt-1 text-2xl font-black text-text-primary">
              {summary.medicationReserveDays === null
                ? 'Not recorded'
                : `${summary.medicationReserveDays} days minimum`}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Uses the lowest reserve entered so one medicine is not hidden by another.
            </p>
          </article>
          <article className="rounded-xl border border-border-default bg-surface-primary p-5">
            <IconClock className="text-amber-500" size={26} />
            <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
              Rotation
            </p>
            <h2 className="mt-1 text-2xl font-black text-text-primary">
              {summary.expiredCount} expired · {summary.expiringSoonCount} soon
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              “Soon” means within 90 days. Verify package condition and manufacturer guidance.
            </p>
          </article>
        </section>

        <section className="mt-8 rounded-xl border border-border-default bg-surface-primary p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="nomad-kicker">PRIORITIZED FROM YOUR ENTRIES</p>
              <h2 className="text-2xl font-black text-text-primary">Next readiness actions</h2>
            </div>
            <span className="text-sm text-text-muted">
              {plannerActions.length} open action{plannerActions.length === 1 ? '' : 's'}
            </span>
          </div>
          {plannerActions.length === 0 ? (
            <div className="mt-5 flex items-center gap-3 rounded-lg border border-desert-green/40 bg-desert-green/10 p-4">
              <IconCheck className="shrink-0 text-desert-green" />
              <p className="text-sm text-text-secondary">
                No arithmetic shortfall or missing tracked category was found. Inspect physical
                condition and review individual needs before relying on the plan.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {plannerActions.map((action) => (
                <a
                  key={action.id}
                  href={action.target === 'power' ? '#power-budget' : '#supply-form'}
                  className={`rounded-lg border p-4 transition-colors hover:border-desert-green ${action.level === 'urgent' ? 'border-amber-500/50 bg-amber-500/10' : 'border-border-default bg-surface-secondary'}`}
                >
                  <div className="flex items-start gap-3">
                    <IconAlertTriangle
                      className={action.level === 'urgent' ? 'text-amber-500' : 'text-text-muted'}
                      size={20}
                    />
                    <span>
                      <strong className="text-text-primary">{action.title}</strong>
                      <span className="mt-1 block text-sm leading-5 text-text-secondary">
                        {action.detail}
                      </span>
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-text-muted">
            Actions are generated only from recorded values and missing categories. They do not
            verify package condition, medical suitability, household needs, or availability.
          </p>
        </section>

        <section className="mt-8 rounded-xl border border-border-default bg-surface-primary p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-text-primary">Daily ration worksheet</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Divide recorded food and water evenly across {state.targetDays} target days.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-sm">
              <div className="rounded-lg bg-surface-secondary px-4 py-2">
                <strong className="block text-lg text-text-primary">
                  {Math.round(
                    summary.caloriesStored / Math.max(1, state.targetDays)
                  ).toLocaleString()}
                </strong>
                <span className="text-text-muted">kcal/day stored</span>
              </div>
              <div className="rounded-lg bg-surface-secondary px-4 py-2">
                <strong className="block text-lg text-text-primary">
                  {(summary.waterStoredGallons / Math.max(1, state.targetDays)).toFixed(1)}
                </strong>
                <span className="text-text-muted">gal/day stored</span>
              </div>
            </div>
          </div>

          {rationRows.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-border-default p-7 text-center text-sm text-text-secondary">
              Add food with total package calories or water with total gallons to build this
              worksheet.
            </div>
          ) : (
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="font-bold text-text-primary">Food allocation</h3>
                {foodRations.length === 0 ? (
                  <p className="mt-2 rounded-lg bg-surface-secondary p-4 text-sm text-text-secondary">
                    No food calories recorded.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {foodRations.map((item) => (
                      <article
                        key={item.id}
                        className="flex flex-col gap-1 rounded-lg border border-border-default bg-surface-secondary p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <strong className="text-text-primary">{item.name}</strong>
                        <span className="text-sm text-text-secondary sm:text-right">
                          {Math.round(item.caloriesPerDay).toLocaleString()} kcal/day
                          <span className="block text-xs text-text-muted">
                            {item.quantityPerDay.toFixed(2)} {item.unit || 'item'}/day
                          </span>
                        </span>
                      </article>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-text-primary">Water allocation</h3>
                {waterRations.length === 0 ? (
                  <p className="mt-2 rounded-lg bg-surface-secondary p-4 text-sm text-text-secondary">
                    No drinkable-water gallons recorded.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {waterRations.map((item) => (
                      <article
                        key={item.id}
                        className="flex flex-col gap-1 rounded-lg border border-border-default bg-surface-secondary p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <strong className="text-text-primary">{item.name}</strong>
                        <span className="text-sm text-text-secondary sm:text-right">
                          {item.waterGallonsPerDay.toFixed(2)} gal/day
                          <span className="block text-xs text-text-muted">
                            {item.quantityPerDay.toFixed(2)} {item.unit || 'item'}/day
                          </span>
                        </span>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <p className="mt-5 text-xs leading-5 text-text-muted">
            This is division, not a meal plan or nutrition assessment. Package sizes may not divide
            safely; opened food may require refrigeration; cooking can require extra water and fuel;
            and children, pregnancy, illness, allergies, exertion, and heat change needs.
          </p>
          <Link
            href="/library-search?view=search&q=emergency%20food%20and%20water"
            className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-desert-green hover:underline"
          >
            <IconSearch size={16} /> Open saved food and water guidance
          </Link>
        </section>

        <section className="mt-8 rounded-xl border border-border-default bg-surface-primary p-6">
          <h2 className="text-2xl font-black text-text-primary">Planning assumptions</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Visible and editable—NOMAD will not infer medical or dietary needs.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-semibold text-text-secondary">
              People
              <input
                type="number"
                min="1"
                max="50"
                value={state.householdSize}
                onChange={(event) => updateAssumption('householdSize', event.target.value)}
                className="mt-2 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
              />
            </label>
            <label className="text-sm font-semibold text-text-secondary">
              Target days
              <input
                type="number"
                min="1"
                max="365"
                value={state.targetDays}
                onChange={(event) => updateAssumption('targetDays', event.target.value)}
                className="mt-2 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
              />
            </label>
            <label className="text-sm font-semibold text-text-secondary">
              Daily calories per person
              <input
                type="number"
                min="1"
                max="10000"
                step="50"
                value={state.dailyCaloriesPerPerson}
                onChange={(event) => updateAssumption('dailyCaloriesPerPerson', event.target.value)}
                className="mt-2 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
              />
            </label>
            <label className="text-sm font-semibold text-text-secondary">
              Daily water per person (gal)
              <input
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={state.dailyWaterGallonsPerPerson}
                onChange={(event) =>
                  updateAssumption('dailyWaterGallonsPerPerson', event.target.value)
                }
                className="mt-2 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
              />
            </label>
          </div>
          <p className="mt-4 text-xs leading-5 text-text-muted">
            The one-gallon default is the general emergency-planning baseline for drinking and
            sanitation. Heat, pregnancy, illness, children, pets, and individual medical needs may
            require a different plan. The 2,000-calorie default is only editable planning
            arithmetic, not nutrition advice.
          </p>
        </section>

        <section
          id="power-budget"
          className="mt-8 scroll-mt-24 rounded-xl border border-border-default bg-surface-primary p-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <IconBattery className="text-desert-green" size={28} />
                <h2 className="text-2xl font-black text-text-primary">Portable power budget</h2>
              </div>
              <p className="mt-2 max-w-3xl text-sm text-text-secondary">
                Estimate how long a battery can run selected devices. The 640 Wh starting value
                matches the confirmed Jackery Explorer 600 v2; edit it whenever the available
                station changes.
              </p>
            </div>
            <div className="rounded-lg border border-desert-green/40 bg-desert-green/10 px-5 py-3 lg:text-right">
              <span className="block text-xs font-bold uppercase tracking-wider text-text-muted">
                Estimated coverage
              </span>
              <strong className="mt-1 block text-2xl text-text-primary">
                {summary.powerCoverageDays === null
                  ? 'Add device loads'
                  : `${summary.powerCoverageDays.toFixed(1)} days`}
              </strong>
              <span className="text-xs text-text-secondary">
                {Math.round(summary.powerDailyWh)} Wh/day from {Math.round(summary.powerUsableWh)}{' '}
                usable Wh
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-text-secondary">
                  Battery capacity (Wh)
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    value={state.powerCapacityWh}
                    onChange={(event) => updateAssumption('powerCapacityWh', event.target.value)}
                    className="mt-2 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
                  />
                </label>
                <label className="text-sm font-semibold text-text-secondary">
                  Usable capacity (%)
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={state.powerUsablePercent}
                    onChange={(event) => updateAssumption('powerUsablePercent', event.target.value)}
                    className="mt-2 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
                  />
                </label>
              </div>
              <p className="mt-3 text-xs leading-5 text-text-muted">
                The 85% default is only a planning allowance for conversion losses. Actual runtime
                varies with inverter overhead, temperature, battery age, startup surges, and the
                device. Do not use this estimate for medical-device safety decisions.
              </p>

              <form
                onSubmit={savePowerLoad}
                className="mt-5 rounded-lg border border-border-default p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-text-primary">
                    {powerLoad.id ? 'Edit device load' : 'Add device load'}
                  </h3>
                  {powerLoad.id && (
                    <button
                      type="button"
                      onClick={() => setPowerLoad(emptyPowerLoad())}
                      className="text-xs font-semibold text-text-secondary hover:text-text-primary"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="text-xs font-semibold text-text-secondary sm:col-span-3">
                    Device
                    <input
                      value={powerLoad.name}
                      maxLength={120}
                      onChange={(event) => setPowerLoad({ ...powerLoad, name: event.target.value })}
                      placeholder="Weather radio"
                      className="mt-1.5 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
                    />
                  </label>
                  <label className="text-xs font-semibold text-text-secondary">
                    Watts
                    <input
                      type="number"
                      min="0.1"
                      max="100000"
                      step="0.1"
                      value={powerLoad.watts}
                      onChange={(event) =>
                        setPowerLoad({ ...powerLoad, watts: Number(event.target.value) || 0 })
                      }
                      className="mt-1.5 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
                    />
                  </label>
                  <label className="text-xs font-semibold text-text-secondary">
                    Hours/day
                    <input
                      type="number"
                      min="0.1"
                      max="24"
                      step="0.1"
                      value={powerLoad.hoursPerDay}
                      onChange={(event) =>
                        setPowerLoad({ ...powerLoad, hoursPerDay: Number(event.target.value) || 0 })
                      }
                      className="mt-1.5 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
                    />
                  </label>
                  <label className="text-xs font-semibold text-text-secondary">
                    Quantity
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      value={powerLoad.quantity}
                      onChange={(event) =>
                        setPowerLoad({ ...powerLoad, quantity: Number(event.target.value) || 0 })
                      }
                      className="mt-1.5 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="mt-4 rounded-lg bg-desert-green px-4 py-2 text-sm font-bold text-white hover:brightness-110"
                >
                  <IconBolt className="mr-1 inline" size={16} />{' '}
                  {powerLoad.id ? 'Save device' : 'Add to budget'}
                </button>
              </form>
            </div>

            <div>
              <h3 className="font-bold text-text-primary">Daily loads</h3>
              {state.powerLoads.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-border-default p-8 text-center text-sm text-text-secondary">
                  Add only the devices you intend to run. Start with communications, lighting,
                  phones, and other critical loads.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {state.powerLoads.map((item) => {
                    const dailyWh = item.watts * item.hoursPerDay * item.quantity
                    return (
                      <article
                        key={item.id}
                        className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface-secondary p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <strong className="block truncate text-text-primary">{item.name}</strong>
                          <span className="text-sm text-text-secondary">
                            {item.quantity} × {item.watts} W × {item.hoursPerDay} hr ={' '}
                            <b>{Math.round(dailyWh)} Wh/day</b>
                          </span>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => setPowerLoad({ ...item })}
                            className="rounded border border-border-default px-3 py-1.5 text-xs font-semibold text-text-primary"
                          >
                            <IconEdit className="mr-1 inline" size={14} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removePowerLoad(item)}
                            className="rounded border border-desert-red/50 px-3 py-1.5 text-xs font-semibold text-desert-red"
                          >
                            <IconTrash className="mr-1 inline" size={14} /> Remove
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
              <Link
                href="/library-search?view=search&q=Jackery%20Explorer%20600%20v2"
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-desert-green hover:underline"
              >
                <IconSearch size={16} /> Open saved Jackery manual
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <form
            id="supply-form"
            onSubmit={saveSupply}
            className="rounded-xl border border-border-default bg-surface-primary p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-text-primary">
                  {supply.id ? 'Edit supply' : 'Add a supply'}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Record totals from the package or your own count.
                </p>
              </div>
              {supply.id && (
                <button
                  type="button"
                  onClick={() => setSupply(emptySupply())}
                  className="text-sm font-semibold text-text-secondary hover:text-text-primary"
                >
                  Cancel edit
                </button>
              )}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-text-secondary sm:col-span-2">
                Name
                <input
                  value={supply.name}
                  maxLength={120}
                  onChange={(event) => setSupply({ ...supply, name: event.target.value })}
                  placeholder="Example: 24-pack bottled water"
                  className="mt-2 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
                />
              </label>
              <label className="text-sm font-semibold text-text-secondary">
                Category
                <select
                  value={supply.category}
                  onChange={(event) =>
                    setSupply({ ...supply, category: event.target.value as SupplyCategory })
                  }
                  className="mt-2 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-text-secondary">
                Storage location
                <input
                  value={supply.location}
                  maxLength={120}
                  onChange={(event) => setSupply({ ...supply, location: event.target.value })}
                  placeholder="Pantry shelf 2"
                  className="mt-2 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
                />
              </label>
              <label className="text-sm font-semibold text-text-secondary">
                Quantity
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={supply.quantity}
                  onChange={(event) =>
                    setSupply({ ...supply, quantity: Number(event.target.value) || 0 })
                  }
                  className="mt-2 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
                />
              </label>
              <label className="text-sm font-semibold text-text-secondary">
                Unit
                <input
                  value={supply.unit}
                  maxLength={40}
                  onChange={(event) => setSupply({ ...supply, unit: event.target.value })}
                  placeholder="cans, packs, gallons"
                  className="mt-2 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
                />
              </label>
              <label className="text-sm font-semibold text-text-secondary">
                Total calories in this supply
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={supply.caloriesTotal}
                  onChange={(event) =>
                    setSupply({ ...supply, caloriesTotal: Number(event.target.value) || 0 })
                  }
                  className="mt-2 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
                />
              </label>
              <label className="text-sm font-semibold text-text-secondary">
                Total drinkable water (gal)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={supply.waterGallons}
                  onChange={(event) =>
                    setSupply({ ...supply, waterGallons: Number(event.target.value) || 0 })
                  }
                  className="mt-2 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
                />
              </label>
              <label className="text-sm font-semibold text-text-secondary">
                Reserve days (medication)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={supply.reserveDays}
                  onChange={(event) =>
                    setSupply({ ...supply, reserveDays: Number(event.target.value) || 0 })
                  }
                  className="mt-2 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
                />
              </label>
              <label className="text-sm font-semibold text-text-secondary">
                Expiration / rotate date
                <input
                  type="date"
                  value={supply.expiresOn}
                  onChange={(event) => setSupply({ ...supply, expiresOn: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
                />
              </label>
              <label className="text-sm font-semibold text-text-secondary sm:col-span-2">
                Notes
                <textarea
                  value={supply.notes}
                  maxLength={500}
                  rows={3}
                  onChange={(event) => setSupply({ ...supply, notes: event.target.value })}
                  placeholder="Preparation needs, battery type, inspection note…"
                  className="mt-2 w-full rounded-lg border border-border-default bg-surface-secondary px-3 py-2 text-text-primary"
                />
              </label>
            </div>
            {formError && (
              <p role="alert" className="mt-3 text-sm font-semibold text-desert-red">
                {formError}
              </p>
            )}
            <button
              type="submit"
              className="mt-5 rounded-lg bg-desert-green px-5 py-3 font-bold text-white hover:brightness-110"
            >
              <IconPlus className="mr-2 inline" size={18} />{' '}
              {supply.id ? 'Save changes' : 'Add supply'}
            </button>
          </form>

          <section
            id="outage-timer"
            className="scroll-mt-24 rounded-xl border border-amber-500/40 bg-surface-primary p-6"
          >
            <div className="flex items-start gap-3">
              <IconAlertTriangle className="mt-1 shrink-0 text-amber-500" />
              <div>
                <h2 className="text-2xl font-black text-text-primary">Power-outage food timer</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Start when refrigerator power is lost. Keep doors closed.
                </p>
              </div>
            </div>
            {!outageStatus ? (
              <button
                type="button"
                onClick={() => {
                  setClock(new Date())
                  setState((current) => ({
                    ...current,
                    outage: { ...current.outage, startedAt: new Date().toISOString() },
                  }))
                }}
                className="mt-6 rounded-lg bg-amber-600 px-5 py-3 font-bold text-white hover:brightness-110"
              >
                <IconClock className="mr-2 inline" size={18} /> Start outage now
              </button>
            ) : (
              <div className="mt-6 space-y-4">
                <p className="text-3xl font-black text-text-primary">
                  {outageStatus.elapsedHours.toFixed(1)} hours elapsed
                </p>
                <div
                  className={`rounded-lg border p-4 ${outageStatus.refrigerator === 'safe-window' ? 'border-desert-green/50 bg-desert-green/10' : 'border-desert-red/50 bg-desert-red/10'}`}
                >
                  <strong className="text-text-primary">
                    Refrigerator:{' '}
                    {outageStatus.refrigerator === 'safe-window'
                      ? 'within general 4-hour window'
                      : 'general 4-hour limit reached'}
                  </strong>
                </div>
                <div
                  className={`rounded-lg border p-4 ${outageStatus.freezer === 'safe-window' ? 'border-desert-green/50 bg-desert-green/10' : 'border-desert-red/50 bg-desert-red/10'}`}
                >
                  <strong className="text-text-primary">
                    Freezer:{' '}
                    {outageStatus.freezer === 'safe-window'
                      ? `within general ${outageStatus.freezerLimitHours}-hour window`
                      : `general ${outageStatus.freezerLimitHours}-hour limit reached`}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      outage: { ...current.outage, freezerFull: !current.outage.freezerFull },
                    }))
                  }
                  className="rounded-lg border border-border-default px-4 py-2 text-sm font-semibold text-text-primary"
                >
                  Freezer is {state.outage.freezerFull ? 'full' : 'half-full'} · change
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      outage: { ...current.outage, startedAt: null },
                    }))
                  }
                  className="ml-2 rounded-lg border border-border-default px-4 py-2 text-sm font-semibold text-text-primary"
                >
                  <IconRefresh className="mr-1 inline" size={16} /> End/reset timer
                </button>
              </div>
            )}
            <p className="mt-6 text-xs leading-5 text-text-muted">
              These are general CDC/USDA time windows, not a sensor reading. Appliance temperature,
              ambient heat, door opening, flooding, contamination, ice crystals, and individual
              product instructions matter. Never taste food to decide whether it is safe.
            </p>
            <Link
              href="/library-search?view=search&q=food%20safety%20power%20outage"
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-desert-green hover:underline"
            >
              <IconSearch size={16} /> Open saved food-safety sources
            </Link>
          </section>
        </section>

        <section className="mt-8 rounded-xl border border-border-default bg-surface-primary p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-text-primary">Local inventory</h2>
              <p className="mt-1 text-sm text-text-secondary">
                {state.supplies.length} recorded item{state.supplies.length === 1 ? '' : 's'}
              </p>
            </div>
            <button
              type="button"
              onClick={clearPlan}
              className="self-start rounded-lg border border-desert-red/50 px-3 py-2 text-sm font-semibold text-desert-red hover:bg-desert-red/10"
            >
              <IconTrash className="mr-1 inline" size={16} /> Clear plan
            </button>
          </div>
          {sortedSupplies.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-border-default p-10 text-center">
              <IconBox className="mx-auto text-text-muted" size={36} />
              <h3 className="mt-3 text-lg font-bold text-text-primary">No supplies recorded yet</h3>
              <p className="mt-1 text-text-secondary">
                Start with stored water, shelf-stable food, essential medications, batteries, and
                radio equipment.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border-default text-xs uppercase tracking-wider text-text-muted">
                    <th className="px-3 py-3">Supply</th>
                    <th className="px-3 py-3">Quantity</th>
                    <th className="px-3 py-3">Coverage contribution</th>
                    <th className="px-3 py-3">Location</th>
                    <th className="px-3 py-3">Rotate</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSupplies.map((item) => (
                    <tr key={item.id} className="border-b border-border-default/70 align-top">
                      <td className="px-3 py-4">
                        <strong className="text-text-primary">{item.name}</strong>
                        <span className="mt-1 block text-xs text-text-muted">
                          {CATEGORY_LABELS[item.category]}
                        </span>
                        {item.notes && (
                          <span className="mt-1 block max-w-md text-xs text-text-secondary">
                            {item.notes}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-text-secondary">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-3 py-4 text-text-secondary">
                        {item.waterGallons > 0 && (
                          <span className="block">{item.waterGallons} gal water</span>
                        )}
                        {item.caloriesTotal > 0 && (
                          <span className="block">{item.caloriesTotal.toLocaleString()} kcal</span>
                        )}
                        {item.reserveDays > 0 && (
                          <span className="block">{item.reserveDays} reserve days</span>
                        )}
                        {item.waterGallons === 0 &&
                          item.caloriesTotal === 0 &&
                          item.reserveDays === 0 &&
                          'Not quantified'}
                      </td>
                      <td className="px-3 py-4 text-text-secondary">
                        {item.location || 'Not recorded'}
                      </td>
                      <td className="px-3 py-4 text-text-secondary">
                        {item.expiresOn || 'Not recorded'}
                      </td>
                      <td className="px-3 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => editSupply(item)}
                          className="rounded p-2 text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                          aria-label={`Edit ${item.name}`}
                        >
                          <IconEdit size={17} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSupply(item)}
                          className="rounded p-2 text-text-secondary hover:bg-desert-red/10 hover:text-desert-red"
                          aria-label={`Remove ${item.name}`}
                        >
                          <IconTrash size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Link
            href="/library-search?view=search&q=emergency%20water"
            className="rounded-xl border border-border-default bg-surface-primary p-5 hover:border-desert-green"
          >
            <IconBottle className="text-desert-green" />
            <strong className="mt-3 block text-lg text-text-primary">Water safety sources</strong>
            <span className="mt-1 block text-sm text-text-secondary">
              Open stored CDC and EPA guidance.
            </span>
          </Link>
          <Link
            href="/maps"
            className="rounded-xl border border-border-default bg-surface-primary p-5 hover:border-desert-green"
          >
            <IconMapRoute className="text-desert-green" />
            <strong className="mt-3 block text-lg text-text-primary">Evacuation routes</strong>
            <span className="mt-1 block text-sm text-text-secondary">
              Open saved pins and offline directions.
            </span>
          </Link>
          <Link
            href="/readiness"
            className="rounded-xl border border-border-default bg-surface-primary p-5 hover:border-desert-green"
          >
            <IconCheck className="text-desert-green" />
            <strong className="mt-3 block text-lg text-text-primary">Check NOMAD itself</strong>
            <span className="mt-1 block text-sm text-text-secondary">
              Verify libraries, maps, routing, and downloads.
            </span>
          </Link>
        </section>
      </main>
    </AppLayout>
  )
}
