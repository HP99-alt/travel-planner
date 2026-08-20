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

// Aggregate costs from a trip's activities + lodging.
// Returns per-currency totals + MYR-converted totals (dual view).
export function computeBudget(trip) {
  const byCurrency = {}
  let totalMYR = 0

  const add = (amount, currency) => {
    if (amount == null || currency == null) return
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt === 0) return
    byCurrency[currency] = (byCurrency[currency] || 0) + amt
    totalMYR += toMYR(amt, currency)
  }

  const itinerary = trip.itinerary || {}
  Object.values(itinerary).forEach((list) => {
    ;(list || []).forEach((a) => add(a.price, a.currency))
  })

  ;(trip.lodging || []).forEach((s) => add(s.price, s.currency))

  const days = Math.max(1, trip.days || 1)
  return {
    totalByCurrency: byCurrency,
    totalMYR,
    perDayMYR: totalMYR / days,
    hasCost: Object.keys(byCurrency).length > 0,
  }
}
