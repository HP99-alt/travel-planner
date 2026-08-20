import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n/LanguageContext.jsx'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons broken by bundlers (missing image paths).
const PIN_SVG =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">' +
      '<path fill="#2f6df6" stroke="#fff" stroke-width="1.5" d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 24 12 24s12-15.6 12-24C24 5.4 18.6 0 12 0z"/>' +
      '<circle cx="12" cy="12" r="5" fill="#fff"/></svg>',
  )
const pinIcon = L.icon({
  iconUrl: PIN_SVG,
  iconSize: [24, 36],
  iconAnchor: [12, 36],
  popupAnchor: [0, -32],
})

// Collect geocoded pins from a trip (activities that have lat/lng).
function collectPins(trip) {
  const pins = []
  const itinerary = trip.itinerary || {}
  Object.keys(itinerary).forEach((dayIndex) => {
    ;(itinerary[dayIndex] || []).forEach((a) => {
      if (typeof a.lat === 'number' && typeof a.lng === 'number') {
        pins.push({
          dayIndex: Number(dayIndex),
          activity: a,
          lat: a.lat,
          lng: a.lng,
        })
      }
    })
  })
  return pins
}

export default function MapPanel({ trip }) {
  const { t } = useI18n()
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)

  const pins = collectPins(trip)

  useEffect(() => {
    if (!elRef.current) return
    if (!mapRef.current) {
      mapRef.current = L.map(elRef.current, { scrollWheelZoom: false }).setView(
        [35.68, 139.76],
        11,
      )
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current)
      layerRef.current = L.layerGroup().addTo(mapRef.current)
    }
    return () => {
      // Keep the map instance alive across renders; cleaned up on unmount.
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
      const marker = L.marker([p.lat, p.lng], { icon: pinIcon })
      const label = `${t('itinerary.day')} ${p.dayIndex + 1} · ${p.activity.title || ''}`
      marker.bindPopup(`<strong>${label}</strong><br/>${p.activity.address || ''}`)
      layer.addLayer(marker)
    })
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 14)
    } else {
      map.fitBounds(bounds.pad(0.2))
    }
  }, [pins, t])

  useEffect(() => {
    // Fix map sizing once on mount and on window resize — NOT on every render
    // (running invalidateSize each render was a key cause of input lag).
    const fix = () => mapRef.current && mapRef.current.invalidateSize()
    fix()
    window.addEventListener('resize', fix)
    return () => window.removeEventListener('resize', fix)
  }, [])

  if (pins.length === 0) {
    return <p className="map-empty">{t('map.noPins')}</p>
  }

  return (
    <div className="map-wrap">
      <div ref={elRef} className="map-canvas" />
    </div>
  )
}
