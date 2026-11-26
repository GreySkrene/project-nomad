import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateDailyRationPlan,
  calculateOutageFoodStatus,
  calculatePlannerSummary,
  buildPlannerActions,
  defaultEmergencyPlannerState,
  normalizeEmergencyPlannerState,
} from '../../inertia/lib/emergency_planner.js'

test('calculates household food and water coverage with transparent inputs', () => {
  const state = defaultEmergencyPlannerState(new Date('2026-01-01T00:00:00Z'))
  state.householdSize = 2
  state.targetDays = 7
  state.supplies = [
    {
      id: 'water',
      name: 'Stored water',
      category: 'water',
      quantity: 14,
      unit: 'gallons',
      caloriesTotal: 0,
      waterGallons: 14,
      reserveDays: 0,
      expiresOn: '',
      location: 'Closet',
      notes: '',
    },
    {
      id: 'food',
      name: 'Shelf-stable food',
      category: 'food',
      quantity: 1,
      unit: 'lot',
      caloriesTotal: 28000,
      waterGallons: 0,
      reserveDays: 0,
      expiresOn: '',
      location: 'Pantry',
      notes: '',
    },
  ]
  const summary = calculatePlannerSummary(state, new Date('2026-01-01T00:00:00Z'))
  assert.equal(summary.waterNeededGallons, 14)
  assert.equal(summary.waterCoverageDays, 7)
  assert.equal(summary.caloriesNeeded, 28000)
  assert.equal(summary.foodCoverageDays, 7)
})

test('uses the lowest recorded medication reserve and reports expiry state', () => {
  const state = normalizeEmergencyPlannerState({
    householdSize: 1,
    targetDays: 7,
    supplies: [
      {
        id: 'a',
        name: 'Medicine A',
        category: 'medication',
        reserveDays: 14,
        expiresOn: '2026-01-01',
      },
      {
        id: 'b',
        name: 'Medicine B',
        category: 'medication',
        reserveDays: 5,
        expiresOn: '2026-03-01',
      },
    ],
  })
  const summary = calculatePlannerSummary(state, new Date('2026-02-01T12:00:00Z'))
  assert.equal(summary.medicationReserveDays, 5)
  assert.equal(summary.expiredCount, 1)
  assert.equal(summary.expiringSoonCount, 1)
})

test('food-safety timer distinguishes refrigerator and full or half freezer windows', () => {
  const now = new Date('2026-01-02T06:00:00Z')
  const full = calculateOutageFoodStatus(
    { startedAt: '2026-01-01T00:00:00Z', freezerFull: true },
    now
  )!
  assert.equal(full.refrigerator, 'limit-reached')
  assert.equal(full.freezer, 'safe-window')
  assert.equal(full.freezerLimitHours, 48)

  const half = calculateOutageFoodStatus(
    { startedAt: '2026-01-01T00:00:00Z', freezerFull: false },
    now
  )!
  assert.equal(half.freezer, 'limit-reached')
  assert.equal(half.freezerLimitHours, 24)
})

test('normalization bounds unsafe values and drops nameless records', () => {
  const state = normalizeEmergencyPlannerState({
    householdSize: 1000,
    targetDays: -5,
    dailyWaterGallonsPerPerson: 99,
    supplies: [{ id: 'bad', name: '', category: 'water' }],
    outage: { startedAt: 'not-a-date' },
  })
  assert.equal(state.householdSize, 50)
  assert.equal(state.targetDays, 7)
  assert.equal(state.dailyWaterGallonsPerPerson, 10)
  assert.deepEqual(state.supplies, [])
  assert.equal(state.outage.startedAt, null)
})

test('calculates a transparent portable-power runtime budget', () => {
  const state = defaultEmergencyPlannerState()
  state.powerCapacityWh = 640
  state.powerUsablePercent = 85
  state.powerLoads = [
    { id: 'radio', name: 'Weather radio', watts: 5, hoursPerDay: 8, quantity: 1 },
    { id: 'lights', name: 'LED lights', watts: 10, hoursPerDay: 4, quantity: 2 },
  ]
  const summary = calculatePlannerSummary(state)
  assert.equal(summary.powerUsableWh, 544)
  assert.equal(summary.powerDailyWh, 120)
  assert.ok(summary.powerCoverageDays)
  assert.equal(Number(summary.powerCoverageDays.toFixed(2)), 4.53)
})

test('normalization preserves safe power loads and bounds imported power assumptions', () => {
  const state = normalizeEmergencyPlannerState({
    powerCapacityWh: 200_000,
    powerUsablePercent: 400,
    powerLoads: [
      { id: 'ok', name: 'Radio', watts: 5, hoursPerDay: 50, quantity: 500 },
      { id: 'drop', name: '', watts: 10, hoursPerDay: 1, quantity: 1 },
    ],
  })
  assert.equal(state.powerCapacityWh, 100_000)
  assert.equal(state.powerUsablePercent, 100)
  assert.equal(state.powerLoads.length, 1)
  assert.deepEqual(state.powerLoads[0], {
    id: 'ok',
    name: 'Radio',
    watts: 5,
    hoursPerDay: 24,
    quantity: 100,
  })
})

test('builds a transparent daily ration worksheet from recorded package totals', () => {
  const state = defaultEmergencyPlannerState()
  state.targetDays = 7
  state.supplies = [
    {
      id: 'beans',
      name: 'Canned beans',
      category: 'food',
      quantity: 14,
      unit: 'cans',
      caloriesTotal: 7000,
      waterGallons: 0,
      reserveDays: 0,
      expiresOn: '',
      location: 'Pantry',
      notes: '',
    },
    {
      id: 'water',
      name: 'Stored water',
      category: 'water',
      quantity: 7,
      unit: 'jugs',
      caloriesTotal: 0,
      waterGallons: 14,
      reserveDays: 0,
      expiresOn: '',
      location: 'Closet',
      notes: '',
    },
  ]
  const rows = calculateDailyRationPlan(state)
  assert.deepEqual(rows[0], {
    id: 'beans',
    name: 'Canned beans',
    category: 'food',
    unit: 'cans',
    quantityPerDay: 2,
    caloriesPerDay: 1000,
    waterGallonsPerDay: 0,
  })
  assert.equal(rows[1].waterGallonsPerDay, 2)
  assert.equal(rows[1].quantityPerDay, 1)
})

test('prioritizes recorded shortages without inventing household facts', () => {
  const state = defaultEmergencyPlannerState()
  state.householdSize = 2
  state.targetDays = 7
  state.supplies = [
    {
      id: 'water',
      name: 'Water',
      category: 'water',
      quantity: 5,
      unit: 'gallons',
      caloriesTotal: 0,
      waterGallons: 5,
      reserveDays: 0,
      expiresOn: '',
      location: '',
      notes: '',
    },
  ]
  const actions = buildPlannerActions(state)
  assert.equal(actions[0].id, 'water-shortfall')
  assert.match(actions[0].detail, /9\.0 more gallons/)
  assert.ok(actions.some((action) => action.id === 'food-shortfall'))
  assert.ok(actions.some((action) => action.id === 'medication-unrecorded'))
  assert.ok(actions.some((action) => action.id === 'missing-communication'))
  assert.ok(actions.some((action) => action.id === 'missing-sanitation'))
  assert.ok(actions.some((action) => action.id === 'power-loads'))
})

test('removes arithmetic and category actions when recorded targets are met', () => {
  const state = defaultEmergencyPlannerState()
  state.targetDays = 1
  state.powerLoads = [{ id: 'radio', name: 'Radio', watts: 5, hoursPerDay: 1, quantity: 1 }]
  state.supplies = [
    {
      id: 'complete',
      name: 'Complete lot',
      category: 'food',
      quantity: 1,
      unit: 'lot',
      caloriesTotal: 2000,
      waterGallons: 1,
      reserveDays: 0,
      expiresOn: '',
      location: '',
      notes: '',
    },
    {
      id: 'med',
      name: 'Essential medication',
      category: 'medication',
      quantity: 1,
      unit: 'supply',
      caloriesTotal: 0,
      waterGallons: 0,
      reserveDays: 1,
      expiresOn: '',
      location: '',
      notes: '',
    },
    {
      id: 'radio',
      name: 'Weather radio',
      category: 'communication',
      quantity: 1,
      unit: 'radio',
      caloriesTotal: 0,
      waterGallons: 0,
      reserveDays: 0,
      expiresOn: '',
      location: '',
      notes: '',
    },
    {
      id: 'sanitation',
      name: 'Sanitation kit',
      category: 'sanitation',
      quantity: 1,
      unit: 'kit',
      caloriesTotal: 0,
      waterGallons: 0,
      reserveDays: 0,
      expiresOn: '',
      location: '',
      notes: '',
    },
  ]
  assert.deepEqual(buildPlannerActions(state), [])
})
