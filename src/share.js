// Share-link helpers: encode trip(s) into a URL hash, no backend required.
const VERSION = 1

function toBase64(str) {
  // UTF-8 safe base64
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(str)))
  }
  return Buffer.from(str, 'utf-8').toString('base64')
}

function fromBase64(b64) {
  if (typeof atob === 'function') {
    return decodeURIComponent(escape(atob(b64)))
  }
  return Buffer.from(b64, 'base64').toString('utf-8')
}

export function encodeTrips(trips) {
  const payload = JSON.stringify({ v: VERSION, trips })
  return toBase64(payload)
}

export function buildShareUrl(trips) {
  const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''
  return `${base}#trip=${encodeTrips(trips)}`
}

export function readTripsFromHash() {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash || ''
  const m = hash.match(/trip=([^&]+)/)
  if (!m) return null
  try {
    const json = fromBase64(m[1])
    const parsed = JSON.parse(json)
    if (parsed && Array.isArray(parsed.trips)) return parsed.trips
    return null
  } catch {
    return null
  }
}

export function clearHash() {
  if (typeof window !== 'undefined') {
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }
}

// Plain-text rendering of an itinerary, bilingual-friendly (uses raw data).
function dateForDay(startDate, dayIndex) {
  if (!startDate) return ''
  const d = new Date(startDate + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + dayIndex)
  return d.toISOString().slice(0, 10)
}

export function tripToText(trip, catName) {
  const lines = []
  lines.push(`# ${trip.name}`)
  if (trip.destination) lines.push(`📍 ${trip.destination}`)
  if (trip.startDate) lines.push(`🗓 ${trip.startDate} · ${trip.days} days`)
  lines.push('')

  if (trip.lodging && trip.lodging.length > 0) {
    lines.push('## 🏨 Lodging')
    trip.lodging.forEach((s) => {
      const stay = [s.name, s.checkIn && s.checkOut ? `${s.checkIn}→${s.checkOut}` : '', s.ref ? `#${s.ref}` : '', s.price ? `${s.price} ${s.currency}` : ''].filter(Boolean).join(' · ')
      lines.push(`  - ${stay}`)
      if (s.address) lines.push(`    📍 ${s.address}`)
    })
    lines.push('')
  }

  for (let i = 0; i < trip.days; i++) {
    const date = dateForDay(trip.startDate, i)
    lines.push(`--- Day ${i + 1}${date ? ` (${date})` : ''} ---`)
    const items = trip.itinerary?.[i] || []
    if (items.length === 0) {
      lines.push('  (no activities)')
    } else {
      items.forEach((a) => {
        const icon = a.category ? (catName[a.category] || '') : ''
        const addr = a.address ? ` @ ${a.address}` : ''
        const cost = a.price ? ` [${a.price} ${a.currency}]` : ''
        const ticket = a.ticketNo ? ` (🎫 ${a.ticketNo})` : ''
        lines.push(
          `  ${a.time || ''}  ${icon} ${a.title}${addr}${cost}${ticket}${a.note ? ` — ${a.note}` : ''}`,
        )
      })
    }
    lines.push('')
  }

  if (trip.packing && trip.packing.length > 0) {
    lines.push('## 🎒 Packing')
    trip.packing.forEach((it) => {
      lines.push(`  [${it.done ? 'x' : ' '}] ${it.label}`)
    })
    lines.push('')
  }

  return lines.join('\n')
}
