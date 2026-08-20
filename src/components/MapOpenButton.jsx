import { useI18n } from '../i18n/LanguageContext.jsx'

// Opens an address in an external maps app via a web maps search URL.
export default function MapOpenButton({ address }) {
  const { t } = useI18n()
  if (!address || !address.trim()) return null
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address.trim(),
  )}`
  return (
    <a
      className="map-open-btn"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('map.open')}
      title={t('map.open')}
    >
      🧭
    </a>
  )
}
