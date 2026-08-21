// Activity category definitions: type key -> { icon (emoji), labelKey }.
// Flight / Stay / Transport are first-class timeline item types so that
// flights and hotels live on the same timeline as activities (single source).
export const CATEGORIES = [
  { key: 'activity', icon: '📍', labelKey: 'cat.activity' },
  { key: 'food', icon: '🍽️', labelKey: 'cat.food' },
  { key: 'sight', icon: '📷', labelKey: 'cat.sight' },
  { key: 'transport', icon: '🚆', labelKey: 'cat.transport' },
  { key: 'flight', icon: '✈️', labelKey: 'cat.flight' },
  { key: 'stay', icon: '🏨', labelKey: 'cat.stay' },
  { key: 'other', icon: '📌', labelKey: 'cat.other' },
]

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]))

// Sub-types for transport items (Grab / Taxi / Bus / Train / MRT / Walking /
// Rental Car / Other). Each maps to an emoji icon used on the timeline.
export const TRANSPORT_TYPES = [
  { key: 'grab', icon: '🚗', label: 'Grab' },
  { key: 'taxi', icon: '🚕', label: 'Taxi' },
  { key: 'bus', icon: '🚌', label: 'Bus' },
  { key: 'train', icon: '🚆', label: 'Train' },
  { key: 'mrt', icon: '🚇', label: 'MRT' },
  { key: 'walking', icon: '🚶', label: 'Walking' },
  { key: 'rental', icon: '🚙', label: 'Rental Car' },
  { key: 'other', icon: '🚦', label: 'Other' },
]

const TRANSPORT_MAP = Object.fromEntries(TRANSPORT_TYPES.map((t) => [t.key, t]))

export function transportIcon(key) {
  return (TRANSPORT_MAP[key] || TRANSPORT_MAP.other).icon
}

export function transportLabel(key) {
  return (TRANSPORT_MAP[key] || TRANSPORT_MAP.other).label
}

export function categoryIcon(type) {
  return (CAT_MAP[type] || CAT_MAP.other).icon
}

export function categoryLabelKey(type) {
  return (CAT_MAP[type] || CAT_MAP.other).labelKey
}
