// Timezone-safe date helpers.
//
// CRITICAL: never parse a `YYYY-MM-DD` string with `new Date(str)` or
// `new Date(str + 'T00:00:00')`. Without an explicit offset, the ISO form
// `YYYY-MM-DDTHH:mm:ss` is interpreted as UTC, while getFullYear/getMonth/
// getDate read LOCAL time — so in any non-UTC timezone the date can shift by a
// day (the off-by-one "Day 1 = startDate - 1" bug). Always build dates with the
// local `new Date(year, monthIndex, day)` constructor and format with explicit
// Y/M/D fields. These helpers do exactly that.

// Parse a `YYYY-MM-DD` string into a LOCAL Date (midnight local).
export function parseISODate(iso) {
  if (!iso || typeof iso !== 'string') return null
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const dt = new Date(y, mo, d)
  if (Number.isNaN(dt.getTime())) return null
  return dt
}

// Format a Date as `YYYY-MM-DD` using its LOCAL Y/M/D fields.
export function toISODate(dt) {
  const y = dt.getFullYear()
  const mo = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${mo}-${d}`
}

// Date for day index N of a trip: startDate + N days (local, no TZ shift).
export function dateForDay(startDate, dayIndex) {
  const base = parseISODate(startDate)
  if (!base) return ''
  base.setDate(base.getDate() + (dayIndex || 0))
  return toISODate(base)
}

// Whole-day difference between two `YYYY-MM-DD` strings (b - a).
export function diffDays(a, b) {
  const da = parseISODate(a)
  const db = parseISODate(b)
  if (!da || !db) return 0
  return Math.round((db.getTime() - da.getTime()) / 86400000)
}

// Add N days to a `YYYY-MM-DD` string, return `YYYY-MM-DD`.
export function addDays(iso, n) {
  const base = parseISODate(iso)
  if (!base) return iso
  base.setDate(base.getDate() + n)
  return toISODate(base)
}

// Today as `YYYY-MM-DD` (local).
export function todayISO() {
  return toISODate(new Date())
}

// Day index for a given `YYYY-MM-DD` relative to startDate (clamped >= 0).
export function dayIndexFor(startDate, dateStr) {
  const idx = diffDays(startDate, dateStr)
  return idx < 0 ? 0 : idx
}
