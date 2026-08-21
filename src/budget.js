// Common currency codes for budget + ticket entries. MYR is the default base.
export const CURRENCIES = [
  'MYR', 'CNY', 'USD', 'JPY', 'EUR', 'GBP', 'HKD', 'KRW', 'THB', 'SGD', 'AUD',
]

export const DEFAULT_CURRENCY = 'MYR'

// Static reference exchange rates with MYR as the base (1 MYR = X).
// These are indicative only — NOT live rates. Update periodically as needed.
export const RATES = {
  MYR: 1,
  CNY: 1.65,
  USD: 4.3,
  JPY: 0.031,
  EUR: 4.6,
  GBP: 5.4,
  HKD: 0.53,
  KRW: 0.0031,
  THB: 0.12,
  SGD: 3.15,
  AUD: 2.85,
}

export function toMYR(amount, currency) {
  const amt = Number(amount)
  if (!Number.isFinite(amt) || amt === 0) return 0
  const rate = RATES[currency] ?? 1
  return amt * rate
}

// Map a timeline item category to a budget grouping.
export const BUDGET_GROUPS = {
  flight: 'budget.catFlight',
  stay: 'budget.catStay',
  food: 'budget.catFood',
  transport: 'budget.catTransport',
  activity: 'budget.catActivity',
  sight: 'budget.catSight',
  shopping: 'budget.catShopping',
  other: 'budget.catOther',
}

// Order groups are displayed in the budget breakdown.
export const BUDGET_GROUP_ORDER = [
  'flight', 'stay', 'food', 'transport', 'activity', 'sight', 'shopping', 'other',
]

// Standalone (extra) cost groups the user can pick from (e.g. Travel Insurance).
export const EXTRA_GROUPS = ['flight', 'stay', 'food', 'transport', 'activity', 'sight', 'shopping', 'other']

// Aggregate costs from the unified itinerary (single source) + standalone
// extra costs. Estimated and Actual are tracked separately.
export function computeBudget(trip) {
  const estByCur = {}
  const actByCur = {}
  const byGroupEst = {} // group key -> MYR
  const byGroupAct = {}
  let estMYR = 0
  let actMYR = 0

  const add = (amount, currency, groupKey, isActual) => {
    if (amount == null || currency == null) return
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt === 0) return
    const curMap = isActual ? actByCur : estByCur
    curMap[currency] = (curMap[currency] || 0) + amt
    const myr = toMYR(amt, currency)
    if (isActual) {
      actMYR += myr
      byGroupAct[groupKey] = (byGroupAct[groupKey] || 0) + myr
    } else {
      estMYR += myr
      byGroupEst[groupKey] = (byGroupEst[groupKey] || 0) + myr
    }
  }

  const itinerary = trip.itinerary || {}
  Object.values(itinerary).forEach((list) => {
    ;(list || []).forEach((a) => {
      // Group by CATEGORY KEY (e.g. 'activity'), not the label key — the UI
      // renders via BUDGET_GROUPS[categoryKey].
      const group = BUDGET_GROUPS[a.category] ? a.category : 'other'
      // Backward-compatible: `price` is treated as estimated cost.
      const est = a.estCost !== '' && a.estCost != null ? a.estCost : a.price
      const act = a.actCost !== '' && a.actCost != null ? a.actCost : ''
      add(est, a.currency, group, false)
      add(act, a.currency, group, true)
    })
  })

  ;(trip.extraCosts || []).forEach((e) => {
    add(e.amount, e.currency, e.group || BUDGET_GROUPS.other, false)
  })

  const hasCost = estMYR > 0 || actMYR > 0
  return {
    estByCurrency: estByCur,
    actByCurrency: actByCur,
    estMYR,
    actMYR,
    remainingMYR: estMYR - actMYR,
    byGroupEst,
    byGroupAct,
    hasCost,
  }
}

// Compute budget for a single day (Part 20: Daily Budget). Same shape as
// computeBudget but scoped to one dayIndex. Standalone costs are trip-level and
// excluded from daily totals.
export function computeDayBudget(trip, dayIndex) {
  const estByCur = {}
  const actByCur = {}
  let estMYR = 0
  let actMYR = 0
  const add = (amount, currency, isActual) => {
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt === 0) return
    const curMap = isActual ? actByCur : estByCur
    curMap[currency] = (curMap[currency] || 0) + amt
    const myr = toMYR(amt, currency)
    if (isActual) actMYR += myr
    else estMYR += myr
  }
  ;(trip.itinerary?.[dayIndex] || []).forEach((a) => {
    const est = a.estCost !== '' && a.estCost != null ? a.estCost : a.price
    const act = a.actCost !== '' && a.actCost != null ? a.actCost : ''
    add(est, a.currency, false)
    add(act, a.currency, true)
  })
  return { estMYR, actMYR, estByCurrency: estByCur, actByCurrency: actByCur, hasCost: estMYR > 0 || actMYR > 0 }
}
