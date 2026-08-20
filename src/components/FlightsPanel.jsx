import { useState } from 'react'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { createId } from '../storage.js'
import CopyButton from './CopyButton.jsx'
import Sheet from './Sheet.jsx'

const SAMPLE = {
  flightNo: 'AK512',
  departTime: '08:30',
  arriveTime: '16:45',
  from: 'KUL',
  to: 'HND',
  pnr: 'X7K2QP',
}

export default function FlightsPanel({ trip, onUpdate }) {
  const { t } = useI18n()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(blank())

  const flights = trip.flights || []

  function blank() {
    return { id: createId(), flightNo: '', departTime: '', arriveTime: '', from: '', to: '', pnr: '' }
  }

  function startAdd() {
    setDraft(blank())
    setEditingId(null)
    setAdding(true)
  }

  function startEdit(f) {
    setDraft({ ...f })
    setEditingId(f.id)
    setAdding(true)
  }

  function commit() {
    const list = [...flights]
    if (editingId) {
      const i = list.findIndex((f) => f.id === editingId)
      if (i >= 0) list[i] = { ...draft }
    } else {
      list.push({ ...draft })
    }
    onUpdate({ ...trip, flights: list })
    setAdding(false)
    setEditingId(null)
  }

  function remove(id) {
    onUpdate({ ...trip, flights: flights.filter((f) => f.id !== id) })
  }

  function fillSample() {
    setDraft({ ...blank(), ...SAMPLE })
  }

  return (
    <div className="panel flight-panel">
      <div className="panel-head">
        <h3>✈️ {t('flight.title')}</h3>
        {!adding && (
          <button className="btn ghost small" onClick={startAdd}>
            + {t('flight.add')}
          </button>
        )}
      </div>

      {!adding && flights.length === 0 && (
        <p className="empty-hint">{t('flight.empty')}</p>
      )}

      {!adding &&
        flights.map((f) => (
          <div className="wallet-card flight" key={f.id}>
            <div className="wallet-top">
              <span className="wallet-route">
                {f.from || '—'} <span className="wallet-arrow">→</span> {f.to || '—'}
              </span>
              <span className="wallet-flightno">{f.flightNo || ''}</span>
            </div>
            <div className="wallet-times">
              <div>
                <span className="wallet-t">{f.departTime || '--:--'}</span>
                <span className="wallet-l">{t('flight.departTime')}</span>
              </div>
              <div>
                <span className="wallet-t">{f.arriveTime || '--:--'}</span>
                <span className="wallet-l">{t('flight.arriveTime')}</span>
              </div>
            </div>
            {f.pnr && (
              <div className="wallet-ref">
                <span className="wallet-ref-label">{t('flight.pnr')}</span>
                <span className="wallet-ref-val">{f.pnr}</span>
                <CopyButton value={f.pnr} />
              </div>
            )}
            <div className="wallet-actions">
              <button className="btn ghost tiny" onClick={() => startEdit(f)}>
                {t('stay.edit')}
              </button>
              <button className="btn danger tiny" onClick={() => remove(f.id)}>
                {t('trips.delete')}
              </button>
            </div>
          </div>
        ))}

      <Sheet
        open={adding}
        onClose={() => {
          setAdding(false)
          setEditingId(null)
        }}
        title={editingId ? t('stay.edit') : t('flight.add')}
      >
        <div className="stay-form">
          <div className="sample-row">
            <button type="button" className="btn ghost tiny" onClick={fillSample}>
              {t('fillSampleFlight')}
            </button>
          </div>
          <label className="field">
            <span>{t('flight.no')}</span>
            <input
              type="text"
              value={draft.flightNo}
              placeholder={t('flight.noPlaceholder')}
              onChange={(e) => setDraft({ ...draft, flightNo: e.target.value })}
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>{t('flight.departTime')}</span>
              <input
                type="time"
                value={draft.departTime}
                onChange={(e) => setDraft({ ...draft, departTime: e.target.value })}
              />
            </label>
            <label className="field">
              <span>{t('flight.arriveTime')}</span>
              <input
                type="time"
                value={draft.arriveTime}
                onChange={(e) => setDraft({ ...draft, arriveTime: e.target.value })}
              />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>{t('flight.from')}</span>
              <input
                type="text"
                value={draft.from}
                placeholder={t('flight.fromPlaceholder')}
                onChange={(e) => setDraft({ ...draft, from: e.target.value })}
              />
            </label>
            <label className="field">
              <span>{t('flight.to')}</span>
              <input
                type="text"
                value={draft.to}
                placeholder={t('flight.toPlaceholder')}
                onChange={(e) => setDraft({ ...draft, to: e.target.value })}
              />
            </label>
          </div>
          <label className="field">
            <span>{t('flight.pnr')}</span>
            <input
              type="text"
              value={draft.pnr}
              placeholder={t('flight.pnrPlaceholder')}
              onChange={(e) => setDraft({ ...draft, pnr: e.target.value })}
            />
          </label>
          <div className="form-actions">
            <button
              className="btn ghost small"
              onClick={() => {
                setAdding(false)
                setEditingId(null)
              }}
            >
              {t('form.cancel')}
            </button>
            <button className="btn primary small" onClick={commit}>
              {t('activity.save')}
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}
