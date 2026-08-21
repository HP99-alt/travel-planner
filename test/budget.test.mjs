// Unit tests for budget aggregation (Parts 18-20) and travel routing (Part 17).
import { computeBudget, computeDayBudget, BUDGET_GROUPS } from '../src/budget.js'
import { travelModeFor, travelIconFor, directionsUrl } from '../src/travel.js'

let failed = 0
function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`)
  if (!cond) failed++
}

const trip = {
  days: 2,
  startDate: '2026-09-12',
  itinerary: {
    0: [
      { id: 'a', category: 'activity', estCost: '50', actCost: '45', currency: 'MYR', address: 'X' },
      { id: 'b', category: 'flight', estCost: '600', actCost: '', currency: 'MYR', address: 'Y' },
    ],
    1: [
      { id: 'c', category: 'food', estCost: '30', actCost: '', currency: 'USD', address: 'Z' },
    ],
  },
  extraCosts: [{ id: 'e', label: 'Travel Insurance', amount: 120, currency: 'MYR', group: 'other' }],
}

const b = computeBudget(trip)
check('Trip estimated total (MYR) aggregates est costs', b.estMYR === 50 + 600 + 30 * 4.3 + 120)
check('Trip actual total (MYR) aggregates act costs', b.actMYR === 45)
check('Remaining = est - act', b.remainingMYR === b.estMYR - b.actMYR)
check('Activity group present (Activities)', (b.byGroupEst.activity || 0) === 50)
check('Flight group present (Flights)', (b.byGroupEst.flight || 0) === 600)
// Standalone cost rolls into trip total.
check('Standalone cost (Travel Insurance) included in est', (b.estMYR - (50 + 600 + 30 * 4.3)) === 120)

const d0 = computeDayBudget(trip, 0)
check('Day 1 est budget', d0.estMYR === 50 + 600)
check('Day 1 act budget', d0.actMYR === 45)
const d1 = computeDayBudget(trip, 1)
check('Day 2 est budget (USD converted)', Math.round(d1.estMYR) === Math.round(30 * 4.3))
check('Standalone costs excluded from daily budget', d0.estMYR + d1.estMYR === b.estMYR - 120)

// Travel mode + icon (Part 17).
check('Walking transport -> foot mode', travelModeFor({ category: 'transport', transportType: 'walking' }) === 'foot')
check('Driving default for activities', travelModeFor({ category: 'activity' }) === 'driving')
check('Walking icon is 🚶', travelIconFor('foot') === '🚶')
const dir = directionsUrl({ lat: 1, lng: 2 }, { lat: 3, lng: 4 })
check('Directions URL is Google Maps dir link', dir.includes('google.com/maps/dir') && dir.includes('origin=1,2'))

console.log(`\n${failed === 0 ? 'ALL PASSED' : failed + ' FAILED'}`)
process.exit(failed ? 1 : 0)
