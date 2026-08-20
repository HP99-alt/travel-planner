// Common currency codes for budget + ticket entries.
export const CURRENCIES = ['CNY', 'USD', 'JPY', 'EUR', 'GBP', 'HKD', 'KRW', 'THB', 'SGD', 'AUD']

// Aggregate costs from a trip's activities + lodging.
// Returns { totalByCurrency: {CODE: number}, grandTotal: number, perDay: number }
// Note: grandTotal is a naive sum across currencies (no FX conversion) — shown for
// reference only. Per-currency breakdown is the accurate view.
export function computeBudget(trip) {
  const byCurrency = {}
  let activityCount = 0
  let lodgingCount = 0

  const add = (amount, currency) => {
    if (amount == null || currency == null) return
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt === 0) return
    byCurrency[currency] = (byCurrency[currency] || 0) + amt
  }

  const itinerary = trip.itinerary || {}
  Object.values(itinerary).forEach((list) => {
    ;(list || []).forEach((a) => {
      add(a.price, a.currency)
      activityCount++
    })
  })

  ;(trip.lodging || []).forEach((s) => {
    add(s.price, s.currency)
    lodgingCount++
  })

  const grandTotal = Object.values(byCurrency).reduce((s, v) => s + v, 0)
  const days = Math.max(1, trip.days || 1)
  return {
    totalByCurrency: byCurrency,
    grandTotal,
    perDay: grandTotal / days,
    hasCost: Object.keys(byCurrency).length > 0,
  }
}
