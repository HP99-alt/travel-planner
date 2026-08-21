// Best-effort travel-time estimation between two geocoded points.
//
// Tries the public OSRM routing service (no key) for driving / foot, and falls
// back to a haversine straight-line estimate at a assumed average speed when
// the network is unavailable or rate-limited. Results are cached by coordinate
// pair + mode so the timeline doesn't re-query on every render.

const cache = new Map()

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const toRad = (x) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Straight-line fallback: assume ~30 km/h urban (driving) / ~4.5 km/h (walking).
function fallbackMinutes(lat1, lng1, lat2, lng2, mode) {
  const km = haversineKm(lat1, lng1, lat2, lng2)
  const speed = mode === 'foot' ? 4.5 : 18 // km/h (urban, with traffic buffer)
  const mins = (km / speed) * 60
  return Math.max(1, Math.round(mins))
}

// mode: 'driving' | 'foot'
export async function travelMinutes(a, b, mode = 'driving') {
  if (!a || !b) return null
  const key = `${mode}:${a.lat.toFixed(4)},${a.lng.toFixed(4)}->${b.lat.toFixed(4)},${b.lng.toFixed(4)}`
  if (cache.has(key)) return cache.get(key)
  const profile = mode === 'foot' ? 'foot' : 'driving'
  const url = `https://router.project-osrm.org/route/v1/${profile}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`
  let result = null
  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data && data.routes && data.routes[0] && data.routes[0].duration) {
      result = Math.max(1, Math.round(data.routes[0].duration / 60))
    }
  } catch {
    /* network / rate-limit — fall back below */
  }
  if (result == null) result = fallbackMinutes(a.lat, a.lng, b.lat, b.lng, mode)
  cache.set(key, result)
  return result
}

// Choose a travel mode between two activities. If the *destination* activity is
// a transport item we mirror its sub-type (e.g. walking); otherwise driving.
export function travelModeFor(destActivity) {
  if (destActivity && destActivity.category === 'transport') {
    if (destActivity.transportType === 'walking') return 'foot'
    if (destActivity.transportType === 'bus' || destActivity.transportType === 'train' || destActivity.transportType === 'mrt') return 'transit'
  }
  return 'driving'
}

export function travelIconFor(mode) {
  if (mode === 'foot') return '🚶'
  if (mode === 'transit') return '🚆'
  return '🚗'
}

// Google/Apple Maps directions deep link (device-friendly).
export function directionsUrl(a, b) {
  const o = `${a.lat},${a.lng}`
  const d = `${b.lat},${b.lng}`
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}`
}
