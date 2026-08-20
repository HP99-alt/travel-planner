import { useI18n } from '../i18n/LanguageContext.jsx'

export default function TripList({ trips, activeId, onSelect, onNew, onDelete }) {
  const { t } = useI18n()

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <h2>{t('trips.title')}</h2>
        <button className="btn primary small" onClick={onNew}>
          + {t('trips.new')}
        </button>
      </div>

      {trips.length === 0 ? (
        <p className="empty-hint">{t('trips.empty')}</p>
      ) : (
        <ul className="trip-items">
          {trips.map((trip) => (
            <li
              key={trip.id}
              className={`trip-item ${trip.id === activeId ? 'active' : ''}`}
              onClick={() => onSelect(trip.id)}
            >
              <div className="trip-item-main">
                <span className="trip-item-name">{trip.name}</span>
                {trip.destination && (
                  <span className="trip-item-sub">{trip.destination}</span>
                )}
                <span className="trip-item-meta">
                  {trip.days} {t('form.days')}
                  {trip.startDate ? ` · ${trip.startDate}` : ''}
                </span>
              </div>
              <button
                className="btn danger tiny"
                onClick={(e) => {
                  e.stopPropagation()
                  if (window.confirm(t('trips.confirmDelete'))) onDelete(trip.id)
                }}
                aria-label={t('trips.delete')}
              >
                {t('trips.delete')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
