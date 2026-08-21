// Best-effort forward geocoding via OpenStreetMap Nominatim (free, no key).
// Returns { lat, lng } or null. Caller should debounce / cache as needed.
export async function geocode(address) {
  if (!address || !address.trim()) return null
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
    encodeURIComponent(address.trim())
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    const data = await res.json()
    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat)
      const lng = parseFloat(data[0].lon)
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng }
    }
  } catch {
    /* network / rate-limit — best effort */
  }
  return null
}
