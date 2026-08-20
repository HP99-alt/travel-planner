// Lightweight localStorage-backed persistence for trips.
//
// UNIFIED DATA MODEL (single source of truth):
// A trip is { id, name, destination, startDate, endDate, days,
//   itinerary: { [dayIndex]: Item[] }, packing: [], emergency: {}, extraCosts: [] }
//
// Every timeline item (activity / flight / hotel / transport) is an Activity
// with a `category`. Flights & lodging are NO LONGER separate arrays — they are
// migrated into the itinerary once so the timeline, map and budget all read the
// same data. `extraCosts` holds standalone expenses (e.g. travel insurance)
// that are not attached to any timeline item.

const STORAGE_KEY = 'tsp.trips'

// Day index for a given YYYY-MM-DD relative to the trip start date.
function dayIndexFor(startDate, dateStr) {
  if (!startDate || !dateStr) return 0
  const a = new Date(startDate + 'T00:00:00')
  const b = new Date(dateStr + 'T00:00:00')
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0
  return Math.max(0, Math.round((b - a) / 86400000))
}

// Convert legacy trip.flights / trip.lodging into unified timeline items.
// Idempotent: once migrated, the legacy arrays are emptied and a flag set.
function migrateTrip(trip) {
  if (!trip || trip.__migrated) return trip
  const itinerary = { ...(trip.itinerary || {}) }
  const push = (dayIndex, item) => {
    const i = Math.max(0, dayIndex | 0)
    itinerary[i] = [...(itinerary[i] || []), item]
  }

  // Flights -> category 'flight'
  ;(trip.flights || []).forEach((f) => {
    const custom = []
    if (f.flightNo) custom.push({ key: 'Flight No.', value: f.flightNo })
    if (f.pnr) custom.push({ key: 'PNR', value: f.pnr })
    push(0, {
      id: f.id || createId(),
      time: f.departTime || '',
      endTime: f.arriveTime || '',
      title: [f.from, f.to].filter(Boolean).join(' → ') || f.flightNo || 'Flight',
      note: '',
      category: 'flight',
      address: [f.from, f.to].filter(Boolean).join(' → '),
      estCost: '',
      actCost: '',
      currency: 'MYR',
      images: [],
      custom,
    })
  })

  // Lodging -> category 'stay', placed on check-in day
  ;(trip.lodging || []).forEach((s) => {
    const custom = []
    if (s.ref) custom.push({ key: 'Booking Ref', value: s.ref })
    if (s.checkIn) custom.push({ key: 'Check-in', value: s.checkIn })
    if (s.checkOut) custom.push({ key: 'Check-out', value: s.checkOut })
    push(dayIndexFor(trip.startDate, s.checkIn), {
      id: s.id || createId(),
      time: '',
      endTime: '',
      title: s.name || 'Hotel',
      note: s.note || '',
      category: 'stay',
      address: s.address || '',
      estCost: s.price === '' || s.price == null ? '' : Number(s.price),
      actCost: '',
      currency: s.currency || 'MYR',
      images: [],
      custom,
    })
  })

  return {
    ...trip,
    itinerary,
    flights: [],
    lodging: [],
    extraCosts: trip.extraCosts || [],
    __migrated: true,
  }
}

export function loadTrips() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(migrateTrip)
  } catch {
    return []
  }
}

export function saveTrips(trips) {
  if (typeof window === 'undefined') return
  try {
    // Strip the internal migration flag before persisting.
    const clean = trips.map(({ __migrated, ...rest }) => rest)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
  } catch {
    /* ignore quota / serialization errors */
  }
}

export function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
