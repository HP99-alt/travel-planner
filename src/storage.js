// Lightweight localStorage-backed persistence for trips.
// Trip shape:
// {
//   id: string,
//   name: string,
//   destination: string,
//   startDate: string (YYYY-MM-DD),
//   days: number,
//   itinerary: { [dayIndex: number]: Activity[] },
// }
// Activity shape: { id, time (HH:MM), title, note }

const STORAGE_KEY = 'tsp.trips'

export function loadTrips() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveTrips(trips) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
  } catch {
    /* ignore quota / serialization errors */
  }
}

export function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
