import { useI18n } from '../i18n/LanguageContext.jsx'
import { categoryIcon } from '../categories.js'
import { computeBudget } from '../budget.js'

function dateForDay(startDate, dayIndex) {
  if (!startDate) return ''
  const d = new Date(startDate + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + dayIndex)
  return d.toISOString().slice(0, 10)
}

// Separate, print-optimized rendering of the trip used as the PDF source.
export default function PdfView({ trip }) {
  const { t } = useI18n()
  const budget = computeBudget(trip)
  return (
    <div id="pdf-root" className="pdf-root">
      <div className="pdf-header">
        <h1>{trip.name}</h1>
        {trip.destination && <p>📍 {trip.destination}</p>}
        {trip.startDate && (
          <p>
            🗓 {trip.startDate} · {trip.days} {t('form.days')}
          </p>
        )}
      </div>

      {trip.lodging && trip.lodging.length > 0 && (
        <div className="pdf-day">
          <h3>🏨 {t('stay.title')}</h3>
          <table className="pdf-table">
            <tbody>
              {trip.lodging.map((s) => (
                <tr key={s.id}>
                  <td className="pdf-icon">🏨</td>
                  <td>
                    <strong>{s.name}</strong>
                    {s.checkIn || s.checkOut
                      ? ` · ${s.checkIn || ''} → ${s.checkOut || ''}`
                      : ''}
                    {s.ref ? ` · #${s.ref}` : ''}
                    {s.price ? ` · ${s.price} ${s.currency}` : ''}
                    {s.address ? <div className="pdf-addr">📍 {s.address}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {Array.from({ length: trip.days }, (_, i) => i).map((dayIndex) => {
        const date = dateForDay(trip.startDate, dayIndex)
        const items = trip.itinerary?.[dayIndex] || []
        return (
          <div className="pdf-day" key={dayIndex}>
            <h3>
              {t('itinerary.day')} {dayIndex + 1}
              {date ? ` · ${date}` : ''}
            </h3>
            {items.length === 0 ? (
              <p className="pdf-empty">{t('itinerary.emptyDay')}</p>
            ) : (
              <table className="pdf-table">
                <tbody>
                  {items.map((a) => (
                    <tr key={a.id}>
                      <td className="pdf-time">{a.time || ''}</td>
                      <td className="pdf-icon">{categoryIcon(a.category)}</td>
                      <td>
                        <strong>{a.title}</strong>
                        {a.note ? ` — ${a.note}` : ''}
                        {a.ticketNo ? ` · 🎫 ${a.ticketNo}` : ''}
                        {a.price ? ` · ${a.price} ${a.currency}` : ''}
                        {a.address ? (
                          <div className="pdf-addr">📍 {a.address}</div>
                        ) : null}
                        {a.qrNote ? (
                          <div className="pdf-addr">📎 {a.qrNote}</div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      })}

      {budget.hasCost && (
        <div className="pdf-day">
          <h3>💰 {t('budget.title')}</h3>
          {Object.entries(budget.totalByCurrency).map(([code, val]) => (
            <div key={code} className="pdf-addr">
              {code}: {val.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          ))}
        </div>
      )}

      {trip.packing && trip.packing.length > 0 && (
        <div className="pdf-day">
          <h3>🎒 {t('pack.title')}</h3>
          <p className="pdf-addr">
            {trip.packing.map((it) => `${it.done ? '☑' : '☐'} ${it.label}`).join('   ')}
          </p>
        </div>
      )}
    </div>
  )
}
