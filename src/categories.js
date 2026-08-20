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

export function categoryIcon(type) {
  return (CAT_MAP[type] || CAT_MAP.other).icon
}

export function categoryLabelKey(type) {
  return (CAT_MAP[type] || CAT_MAP.other).labelKey
}
