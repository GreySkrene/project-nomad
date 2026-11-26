export const EMERGENCY_PLANNER_STORAGE_KEY = 'nomad:household-readiness:v1'

export type SupplyCategory =
  | 'water'
  | 'food'
  | 'medication'
  | 'power'
  | 'sanitation'
  | 'communication'
  | 'other'

export interface EmergencySupply {
  id: string
  name: string
  category: SupplyCategory
  quantity: number
  unit: string
  caloriesTotal: number
  waterGallons: number
  reserveDays: number
  expiresOn: string
  location: string
  notes: string
}

export interface OutageState {
  startedAt: string | null
  freezerFull: boolean
}

export interface PowerLoad {
  id: string
  name: string
  watts: number
  hoursPerDay: number
  quantity: number
}

export interface EmergencyPlannerState {
  version: 1
  householdSize: number
  targetDays: number
  dailyCaloriesPerPerson: number
  dailyWaterGallonsPerPerson: number
  powerCapacityWh: number
  powerUsablePercent: number
  powerLoads: PowerLoad[]
  supplies: EmergencySupply[]
  outage: OutageState
  updatedAt: string
}

export interface PlannerSummary {
  waterNeededGallons: number
  waterStoredGallons: number
  waterCoverageDays: number
  caloriesNeeded: number
  caloriesStored: number
  foodCoverageDays: number
  medicationReserveDays: number | null
  expiredCount: number
  expiringSoonCount: number
  powerUsableWh: number
  powerDailyWh: number
  powerCoverageDays: number | null
}

export interface OutageFoodStatus {
  elapsedHours: number
  refrigeratorLimitHours: number
  freezerLimitHours: number
  refrigerator: 'safe-window' | 'limit-reached'
  freezer: 'safe-window' | 'limit-reached'
}

export interface DailyRationRow {
  id: string
  name: string
  category: 'food' | 'water'
  unit: string
  quantityPerDay: number
  caloriesPerDay: number
  waterGallonsPerDay: number
}

export interface PlannerAction {
  id: string
  level: 'urgent' | 'attention' | 'setup'
  title: string
  detail: string
  target: 'supplies' | 'power'
}

const finiteNonNegative = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

const boundedPositive = (value: unknown, fallback: number, max: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback
}

export function defaultEmergencyPlannerState(now = new Date()): EmergencyPlannerState {
  return {
    version: 1,
    householdSize: 1,
    targetDays: 7,
    dailyCaloriesPerPerson: 2000,
    dailyWaterGallonsPerPerson: 1,
    powerCapacityWh: 640,
    powerUsablePercent: 85,
    powerLoads: [],
    supplies: [],
    outage: { startedAt: null, freezerFull: true },
    updatedAt: now.toISOString(),
  }
}

export function normalizeEmergencyPlannerState(
  value: unknown,
  now = new Date()
): EmergencyPlannerState {
  const fallback = defaultEmergencyPlannerState(now)
  if (!value || typeof value !== 'object') return fallback
  const raw = value as Partial<EmergencyPlannerState>
  const categories: SupplyCategory[] = [
    'water',
    'food',
    'medication',
    'power',
    'sanitation',
    'communication',
    'other',
  ]

  const supplies = Array.isArray(raw.supplies)
    ? raw.supplies
        .filter((item): item is EmergencySupply => Boolean(item && typeof item === 'object'))
        .slice(0, 1000)
        .map((item) => ({
          id: String(item.id || crypto.randomUUID()),
          name: String(item.name || '')
            .trim()
            .slice(0, 120),
          category: categories.includes(item.category) ? item.category : 'other',
          quantity: finiteNonNegative(item.quantity),
          unit: String(item.unit || '')
            .trim()
            .slice(0, 40),
          caloriesTotal: finiteNonNegative(item.caloriesTotal),
          waterGallons: finiteNonNegative(item.waterGallons),
          reserveDays: finiteNonNegative(item.reserveDays),
          expiresOn: /^\d{4}-\d{2}-\d{2}$/.test(String(item.expiresOn || ''))
            ? String(item.expiresOn)
            : '',
          location: String(item.location || '')
            .trim()
            .slice(0, 120),
          notes: String(item.notes || '')
            .trim()
            .slice(0, 500),
        }))
        .filter((item) => item.name.length > 0)
    : []

  const powerLoads = Array.isArray(raw.powerLoads)
    ? raw.powerLoads
        .filter((item): item is PowerLoad => Boolean(item && typeof item === 'object'))
        .slice(0, 100)
        .map((item) => ({
          id: String(item.id || crypto.randomUUID()),
          name: String(item.name || '')
            .trim()
            .slice(0, 120),
          watts: Math.min(finiteNonNegative(item.watts), 100_000),
          hoursPerDay: Math.min(finiteNonNegative(item.hoursPerDay), 24),
          quantity: Math.min(boundedPositive(item.quantity, 1, 100), 100),
        }))
        .filter((item) => item.name.length > 0)
    : []

  const startedAt = raw.outage?.startedAt
  const validStartedAt =
    typeof startedAt === 'string' && Number.isFinite(Date.parse(startedAt)) ? startedAt : null

  return {
    version: 1,
    householdSize: boundedPositive(raw.householdSize, fallback.householdSize, 50),
    targetDays: boundedPositive(raw.targetDays, fallback.targetDays, 365),
    dailyCaloriesPerPerson: boundedPositive(
      raw.dailyCaloriesPerPerson,
      fallback.dailyCaloriesPerPerson,
      10000
    ),
    dailyWaterGallonsPerPerson: boundedPositive(
      raw.dailyWaterGallonsPerPerson,
      fallback.dailyWaterGallonsPerPerson,
      10
    ),
    powerCapacityWh: boundedPositive(raw.powerCapacityWh, fallback.powerCapacityWh, 100_000),
    powerUsablePercent: boundedPositive(raw.powerUsablePercent, fallback.powerUsablePercent, 100),
    powerLoads,
    supplies,
    outage: {
      startedAt: validStartedAt,
      freezerFull: raw.outage?.freezerFull !== false,
    },
    updatedAt:
      typeof raw.updatedAt === 'string' && Number.isFinite(Date.parse(raw.updatedAt))
        ? raw.updatedAt
        : now.toISOString(),
  }
}

export function calculatePlannerSummary(
  state: EmergencyPlannerState,
  now = new Date()
): PlannerSummary {
  const people = Math.max(1, state.householdSize)
  const waterStoredGallons = state.supplies.reduce((sum, item) => sum + item.waterGallons, 0)
  const caloriesStored = state.supplies.reduce((sum, item) => sum + item.caloriesTotal, 0)
  const medicationReserves = state.supplies
    .filter((item) => item.category === 'medication' && item.reserveDays > 0)
    .map((item) => item.reserveDays)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const soon = today + 90 * 24 * 60 * 60 * 1000
  const expiryTimes = state.supplies
    .map((item) => (item.expiresOn ? Date.parse(`${item.expiresOn}T00:00:00`) : Number.NaN))
    .filter(Number.isFinite)

  const waterPerDay = people * state.dailyWaterGallonsPerPerson
  const caloriesPerDay = people * state.dailyCaloriesPerPerson
  const powerUsableWh = state.powerCapacityWh * (state.powerUsablePercent / 100)
  const powerDailyWh = state.powerLoads.reduce(
    (sum, item) => sum + item.watts * item.hoursPerDay * item.quantity,
    0
  )
  return {
    waterNeededGallons: waterPerDay * state.targetDays,
    waterStoredGallons,
    waterCoverageDays: waterPerDay > 0 ? waterStoredGallons / waterPerDay : 0,
    caloriesNeeded: caloriesPerDay * state.targetDays,
    caloriesStored,
    foodCoverageDays: caloriesPerDay > 0 ? caloriesStored / caloriesPerDay : 0,
    medicationReserveDays: medicationReserves.length > 0 ? Math.min(...medicationReserves) : null,
    expiredCount: expiryTimes.filter((time) => time < today).length,
    expiringSoonCount: expiryTimes.filter((time) => time >= today && time <= soon).length,
    powerUsableWh,
    powerDailyWh,
    powerCoverageDays: powerDailyWh > 0 ? powerUsableWh / powerDailyWh : null,
  }
}

export function calculateOutageFoodStatus(
  outage: OutageState,
  now = new Date()
): OutageFoodStatus | null {
  if (!outage.startedAt) return null
  const start = Date.parse(outage.startedAt)
  if (!Number.isFinite(start)) return null
  const elapsedHours = Math.max(0, (now.getTime() - start) / (60 * 60 * 1000))
  const freezerLimitHours = outage.freezerFull ? 48 : 24
  return {
    elapsedHours,
    refrigeratorLimitHours: 4,
    freezerLimitHours,
    refrigerator: elapsedHours < 4 ? 'safe-window' : 'limit-reached',
    freezer: elapsedHours < freezerLimitHours ? 'safe-window' : 'limit-reached',
  }
}

export function calculateDailyRationPlan(state: EmergencyPlannerState): DailyRationRow[] {
  const days = Math.max(1, state.targetDays)
  return state.supplies.flatMap((item): DailyRationRow[] => {
    if (item.category === 'food' && item.caloriesTotal > 0) {
      return [
        {
          id: item.id,
          name: item.name,
          category: 'food',
          unit: item.unit,
          quantityPerDay: item.quantity / days,
          caloriesPerDay: item.caloriesTotal / days,
          waterGallonsPerDay: 0,
        },
      ]
    }
    if (item.category === 'water' && item.waterGallons > 0) {
      return [
        {
          id: item.id,
          name: item.name,
          category: 'water',
          unit: item.unit,
          quantityPerDay: item.quantity / days,
          caloriesPerDay: 0,
          waterGallonsPerDay: item.waterGallons / days,
        },
      ]
    }
    return []
  })
}

export function buildPlannerActions(
  state: EmergencyPlannerState,
  summary = calculatePlannerSummary(state)
): PlannerAction[] {
  const actions: PlannerAction[] = []
  const waterDeficit = Math.max(0, summary.waterNeededGallons - summary.waterStoredGallons)
  if (waterDeficit > 0) {
    actions.push({
      id: 'water-shortfall',
      level: 'urgent',
      title: 'Close the recorded water gap',
      detail: `${waterDeficit.toFixed(1)} more gallons are needed for the current ${state.targetDays}-day arithmetic target.`,
      target: 'supplies',
    })
  }
  const calorieDeficit = Math.max(0, summary.caloriesNeeded - summary.caloriesStored)
  if (calorieDeficit > 0) {
    actions.push({
      id: 'food-shortfall',
      level: 'urgent',
      title: 'Close the recorded food-energy gap',
      detail: `${Math.ceil(calorieDeficit).toLocaleString()} more package calories are needed for the current arithmetic target.`,
      target: 'supplies',
    })
  }
  if (summary.medicationReserveDays === null) {
    actions.push({
      id: 'medication-unrecorded',
      level: 'attention',
      title: 'Record essential medication reserves',
      detail:
        'Enter reserve days separately for each essential medication so the lowest reserve stays visible.',
      target: 'supplies',
    })
  } else if (summary.medicationReserveDays < state.targetDays) {
    actions.push({
      id: 'medication-shortfall',
      level: 'urgent',
      title: 'Review the lowest medication reserve',
      detail: `The lowest recorded reserve is ${summary.medicationReserveDays} days versus the ${state.targetDays}-day planning target. Follow prescriber and pharmacy guidance.`,
      target: 'supplies',
    })
  }
  if (summary.expiredCount > 0 || summary.expiringSoonCount > 0) {
    actions.push({
      id: 'rotation',
      level: summary.expiredCount > 0 ? 'urgent' : 'attention',
      title: 'Inspect and rotate dated supplies',
      detail: `${summary.expiredCount} recorded item${summary.expiredCount === 1 ? '' : 's'} expired; ${summary.expiringSoonCount} due within 90 days. Verify condition and manufacturer guidance.`,
      target: 'supplies',
    })
  }
  for (const [category, title, detail] of [
    [
      'communication',
      'Record emergency communications',
      'Add weather radio, charging, and family communication equipment.',
    ],
    [
      'sanitation',
      'Record sanitation supplies',
      'Add hygiene, waste, and cleaning supplies so this gap is visible.',
    ],
  ] as const) {
    if (!state.supplies.some((item) => item.category === category)) {
      actions.push({ id: `missing-${category}`, level: 'setup', title, detail, target: 'supplies' })
    }
  }
  if (state.powerLoads.length === 0) {
    actions.push({
      id: 'power-loads',
      level: 'setup',
      title: 'Estimate critical power loads',
      detail: 'Add the devices you plan to run so the 640 Wh station estimate reflects actual use.',
      target: 'power',
    })
  }
  return actions
}

export function plannerExportFilename(now = new Date()) {
  return `nomad-household-readiness-${now.toISOString().slice(0, 10)}.json`
}
