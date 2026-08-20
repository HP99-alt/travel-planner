import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { loadTrips, saveTrips, createId } from '../storage.js'

export default function TripForm({ initial, onSubmit, onCancel }) {
  const { t } = useI18n()
  const [name, setName] = useState(initial?.name ?? '')
  const [destination, setDestination] = useState(initial?.destination ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [days, setDays] = useState(initial?.days ?? 3)

  useEffect(() => {
    setName(initial?.name ?? '')
    setDestination(initial?.destination ?? '')
    setStartDate(initial?.startDate ?? '')
    setDays(initial?.days ?? 3)
  }, [initial])

  const isEdit = !!initial

  function handleSubmit(e) {
    e.preventDefault()
    const dayCount = Math.max(1, Math.min(60, Number(days) || 1))
    const payload = {
      name: name.trim() || (isEdit ? initial.name : 'Untitled Trip'),
      destination: destination.trim(),
      startDate,
      days: dayCount,
    }
    if (isEdit) {
      // Preserve existing itinerary when editing
      onSubmit({ ...initial, ...payload, days: dayCount })
    } else {
      onSubmit({
        id: createId(),
        itinerary: {},
        createdAt: Date.now(),
        ...payload,
        days: dayCount,
      })
    }
  }

  return (
    <form className="trip-form" onSubmit={handleSubmit}>
      <h2>{isEdit ? t('form.editTrip') : t('form.create')}</h2>

      <label className="field">
        <span>{t('form.name')}</span>
        <input
          type="text"
          value={name}
          placeholder={t('form.namePlaceholder')}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </label>

      <label className="field">
        <span>{t('form.destination')}</span>
        <input
          type="text"
          value={destination}
          placeholder={t('form.destinationPlaceholder')}
          onChange={(e) => setDestination(e.target.value)}
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>{t('form.startDate')}</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        <label className="field">
          <span>{t('form.days')}</span>
          <input
            type="number"
            min="1"
            max="60"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </label>
      </div>

      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>
          {t('form.cancel')}
        </button>
        <button type="submit" className="btn primary">
          {isEdit ? t('form.save') : t('form.create')}
        </button>
      </div>
    </form>
  )
}
