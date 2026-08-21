// Unit tests for timezone-safe date helpers (Part 15 fix).
// Verifies no off-by-one across several timezones, including ones behind UTC
// where the old `new Date(iso + 'T00:00:00')` (UTC parse) bug shifted dates back.
import { dateForDay, diffDays, addDays, parseISODate, toISODate, dayIndexFor, todayISO } from '../src/date.js'

let failed = 0
function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`)
  if (!cond) failed++
}

// The exact bug report: start 2026-09-12 -> Day1 must be 2026-09-12 (not -1).
check('Day 1 == start date', dateForDay('2026-09-12', 0) === '2026-09-12')
check('Day 2 == start+1', dateForDay('2026-09-12', 1) === '2026-09-13')
check('Day 5 == start+4', dateForDay('2026-09-12', 4) === '2026-09-16')

// Month/year boundaries.
check('Rolls into next month', dateForDay('2026-01-31', 1) === '2026-02-01')
check('Rolls into next year', dateForDay('2026-12-31', 1) === '2027-01-01')

// diffDays / addDays round-trip.
check('addDays inverse of diffDays', addDays('2026-09-12', diffDays('2026-09-12', '2026-09-20')) === '2026-09-20')
check('diffDays symmetric', diffDays('2026-09-12', '2026-09-16') === 4)

// Run the SAME assertions under a non-UTC timezone to prove TZ-safety.
// jsdom/node honours TZ env; re-import a fresh module graph under TZ=America/Los_Angeles.
process.env.TZ = 'America/Los_Angeles'
const mod = await import('../src/date.js?v=' + Date.now())
check('[TZ=LA] Day 1 == start date (no -1 shift)', mod.dateForDay('2026-09-12', 0) === '2026-09-12')
check('[TZ=LA] Day 5 == start+4', mod.dateForDay('2026-09-12', 4) === '2026-09-16')
check('[TZ=LA] month roll', mod.dateForDay('2026-01-31', 1) === '2026-02-01')

process.env.TZ = 'Asia/Kuala_Lumpur'
const mod2 = await import('../src/date.js?v=' + Date.now() + 'b')
check('[TZ=KL] Day 1 == start date', mod2.dateForDay('2026-09-12', 0) === '2026-09-12')
check('[TZ=KL] Day 5 == start+4', mod2.dateForDay('2026-09-12', 4) === '2026-09-16')

// parse / format sanity.
check('parseISODate ok', parseISODate('2026-09-12') instanceof Date)
check('toISODate ok', toISODate(new Date(2026, 8, 12)) === '2026-09-12')
check('dayIndexFor clamps', dayIndexFor('2026-09-12', '2026-09-10') === 0)
check('dayIndexFor computes', dayIndexFor('2026-09-12', '2026-09-14') === 2)
check('todayISO shape', /^\d{4}-\d{2}-\d{2}$/.test(todayISO()))

console.log(`\n${failed === 0 ? 'ALL PASSED' : failed + ' FAILED'}`)
process.exit(failed ? 1 : 0)
