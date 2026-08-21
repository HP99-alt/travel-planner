import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { categoryIcon, transportIcon } from '../categories.js'
import { geocode } from '../geocode.js'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons broken by bundlers (missing image paths).
function makeIcon(color) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="38" viewBox="0 0 24 36">` +
    `<path fill="${color}" stroke="#fff" stroke-width="1.5" d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 24 12 24s12-15.6 12-24C24 5.4 18.6 0 12 0z"/>` +
    `<circle cx="12" cy="12" r="5" fill="#fff"/></svg>`
  return L.icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(svg),
    iconSize: [26, 38],
    iconAnchor: [13, 38],
    popupAnchor: [0, -34],
  })
}

const CAT_COLOR = {
  flight: '#2f6df6',
  stay: '#e5484d',
  transport: '#f59e0b',
  food: '#16a34a',
  sight: '#8b5cf6',
  activity: '#0ea5e9',
  other: '#6b7280',
}
const iconCache = {}
function iconFor(category) {
  const c = CAT_COLOR[category] || CAT_COLOR.other
  if (!iconCache[c]) iconCache[c] = makeIcon(c)
  return iconCache[c]
}

// Build the list of address-bearing activities.
function buildItems(trip) {
  const items = []
  const itinerary = trip.itinerary || {}
  Object.keys(itinerary).forEach((dayIndex) => {
    ;(itinerary[dayIndex] || []).forEach((a) => {
      if (a.address && a.address.trim()) {
        items.push({
          dayIndex: Number(dayIndex),
          activity: a,
          lat: typeof a.lat === 'number' ? a.lat : null,
          lng: typeof a.lng === 'number' ? a.lng : null,
        })
      }
    })
  })
  return items
}

export default function MapPanel({ trip, onUpdate }) {
  const { t } = useI18n()
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const [resolved, setResolved] = useState({}) // address -> {lat,lng} cache
  const [geocoding, setGeocoding] = useState(false)

  const items = buildItems(trip)

  // Resolve coordinates for any item missing them (best-effort, async), then
  // persist them back onto the trip so pins + travel-time survive reloads.
  useEffect(() => {
    let cancelled = false
    const missing = items.filter((it) => it.lat == null || it.lng == null)
    if (missing.length === 0) return
    setGeocoding(true)
    ;(async () => {
      const next = {}
      for (const it of missing) {
        const key = it.activity.address.trim()
        if (resolved[key]) continue
        const g = await geocode(key)
        if (g) next[key] = g
      }
      if (cancelled) return
      setResolved((prev) => ({ ...prev, ...next }))
      setGeocoding(false)
      // Persist resolved coords back onto the owning activities.
      if (Object.keys(next).length && onUpdate) {
        const itinerary = { ...(trip.itinerary || {}) }
        let changed = false
        Object.keys(itinerary).forEach((di) => {
          itinerary[di] = itinerary[di].map((a) => {
            if (a.address && next[a.address.trim()]) {
              changed = true
              return { ...a, lat: next[a.address.trim()].lat, lng: next[a.address.trim()].lng }
            }
            return a
          })
        })
        if (changed) onUpdate({ ...trip, itinerary })
      }
    })()
    return () => { cancelled = true }
  }, [items, resolved, onUpdate, trip.itinerary])

  // Pins: items that have coords (from the trip, or just resolved).
  const pins = items
    .map((it) => {
      const r = it.lat != null ? { lat: it.lat, lng: it.lng } : resolved[it.activity.address.trim()]
      return r ? { ...it, lat: r.lat, lng: r.lng } : null
    })
    .filter(Boolean)

  useEffect(() => {
    if (!elRef.current) return
    if (!mapRef.current) {
      mapRef.current = L.map(elRef.current, { scrollWheelZoom: false }).setView([35.68, 139.76], 11)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current)
      layerRef.current = L.layerGroup().addTo(mapRef.current)
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    if (pins.length === 0) {
      map.setView([35.68, 139.76], 11)
      return
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng]))
    pins.forEach((p) => {
      const a = p.activity
      const icon = a.category === 'transport' && a.transportType ? transportIcon(a.transportType) : categoryIcon(a.category)
      const label = `${icon} ${t('itinerary.day')} ${p.dayIndex + 1} · ${a.title || ''}`
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.address)}`
      const popup = `<strong>${label}</strong><br/>${a.address || ''}` +
        (a.time ? `<br/>🕒 ${a.time}${a.endTime ? '–' + a.endTime : ''}` : '') +
        `<br/><a href="${mapsUrl}" target="_blank" rel="noopener">${t('map.open')}</a>`
      const marker = L.marker([p.lat, p.lng], { icon: iconFor(a.category) })
      marker.bindPopup(popup)
      layer.addLayer(marker)
    })
    if (pins.length === 1) map.setView([pins[0].lat, pins[0].lng], 14)
    else map.fitBounds(bounds.pad(0.2))
  }, [pins, t])

  useEffect(() => {
    const fix = () => mapRef.current && mapRef.current.invalidateSize()
    fix()
    window.addEventListener('resize', fix)
    return () => window.removeEventListener('resize', fix)
  }, [])

  if (pins.length === 0) {
    return <p className="map-empty">{geocoding ? '📍 …' : t('map.noPins')}</p>
  }

  return (
    <div className="map-wrap">
      <div ref={elRef} className="map-canvas" />
    </div>
  )
}
