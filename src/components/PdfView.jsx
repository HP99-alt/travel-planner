import { useI18n } from '../i18n/LanguageContext.jsx'
import { categoryIcon } from '../categories.js'
import { computeBudget } from '../budget.js'

function dateForDay(startDate, dayIndex) {
  if (!startDate) return ''
  const d = new Date(startDate + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + dayIndex)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
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

      {Array.from({ length: trip.days }, (_, i) => i).map((dayIndex) => {
        const date = dateForDay(trip.startDate, dayIndex)
        const items = (trip.itinerary?.[dayIndex] || []).slice().sort((a, b) =>
          (a.time || '99:99').localeCompare(b.time || '99:99'),
        )
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
                      <td className="pdf-time">
                        {a.time || ''}
                        {a.endTime ? `–${a.endTime}` : ''}
                      </td>
                      <td className="pdf-icon">{categoryIcon(a.category)}</td>
                      <td>
                        <strong>{a.title}</strong>
                        {a.note ? ` — ${a.note}` : ''}
                        {a.ticketNo ? ` · 🎫 ${a.ticketNo}` : ''}
                        {(a.estCost || a.price) ? ` · ${a.estCost || a.price} ${a.currency}` : ''}
                        {a.address ? (
                          <div className="pdf-addr">📍 {a.address}</div>
                        ) : null}
                        {(a.custom || []).map((r, i) =>
                          r.key || r.value ? (
                            <div className="pdf-addr" key={i}>
                              {r.key}: {r.value}
                            </div>
                          ) : null,
                        )}
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
          <div className="pdf-addr">
            {t('budget.totalEstMYR')}: RM {Math.round(budget.estMYR).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="pdf-addr">
            {t('budget.totalActMYR')}: RM {Math.round(budget.actMYR).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          {Object.entries(budget.estByCurrency).map(([code, val]) => (
            <div key={code} className="pdf-addr">
              {t('budget.estimated')} {code}: {val.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          ))}
          {Object.entries(budget.actByCurrency).map(([code, val]) => (
            <div key={code} className="pdf-addr">
              {t('budget.actual')} {code}: {val.toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
