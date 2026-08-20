import { useState } from 'react'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { createId } from '../storage.js'
import { CURRENCIES } from '../budget.js'
import CopyButton from './CopyButton.jsx'
import Sheet from './Sheet.jsx'

const HOTEL_SAMPLE = {
  name: 'Shinjuku Granbell Hotel',
  checkIn: '2026-09-01',
  checkOut: '2026-09-05',
  ref: 'BK-998877',
  address: '2-14-5 Kabukicho, Shinjuku City, Tokyo',
  price: '72000',
  currency: 'JPY',
  note: 'Non-smoking twin, high floor',
}

export default function LodgingPanel({ trip, onUpdate }) {
  const { t } = useI18n()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(blank())

  const lodging = trip.lodging || []

  function fillSample() {
    setDraft({ ...blank(), ...HOTEL_SAMPLE })
  }

  function blank() {
    return {
      id: createId(),
      name: '',
      checkIn: '',
      checkOut: '',
      ref: '',
      address: '',
      price: '',
      currency: 'CNY',
      note: '',
    }
  }

  function startAdd() {
    setDraft(blank())
    setEditingId(null)
    setAdding(true)
  }

  function startEdit(stay) {
    setDraft({ ...stay })
    setEditingId(stay.id)
    setAdding(true)
  }

  function commit() {
    const list = [...lodging]
    if (editingId) {
      const i = list.findIndex((s) => s.id === editingId)
      if (i >= 0) list[i] = { ...draft }
    } else {
      list.push({ ...draft })
    }
    onUpdate({ ...trip, lodging: list })
    setAdding(false)
    setEditingId(null)
  }

  function remove(id) {
    onUpdate({ ...trip, lodging: lodging.filter((s) => s.id !== id) })
  }

  return (
    <div className="panel lodging-panel">
      <div className="panel-head">
        <h3>🏨 {t('stay.title')}</h3>
        {!adding && (
          <button className="btn ghost small" onClick={startAdd}>
            + {t('stay.add')}
          </button>
        )}
      </div>

      {!adding && lodging.length === 0 && (
        <p className="empty-hint">{t('stay.empty')}</p>
      )}

      {!adding &&
        lodging.map((s) => (
          <div className="wallet-card hotel" key={s.id}>
            <div className="wallet-top">
              <span className="wallet-name">{s.name || '—'}</span>
            </div>
            <div className="wallet-meta">
              {s.checkIn && s.checkOut
                ? `${s.checkIn} → ${s.checkOut}`
                : s.checkIn || s.checkOut || ''}
              {s.price ? ` · ${s.price} ${s.currency}` : ''}
            </div>
            {s.address && (
              <div className="wallet-addr">
                <span className="wallet-addr-text">📍 {s.address}</span>
                <CopyButton value={s.address} />
              </div>
            )}
            {s.ref && (
              <div className="wallet-ref">
                <span className="wallet-ref-label">{t('stay.ref')}</span>
                <span className="wallet-ref-val">{s.ref}</span>
                <CopyButton value={s.ref} />
              </div>
            )}
            {s.note && <div className="wallet-note">{s.note}</div>}
            <div className="wallet-actions">
              <button className="btn ghost tiny" onClick={() => startEdit(s)}>
                {t('stay.edit')}
              </button>
              <button className="btn danger tiny" onClick={() => remove(s.id)}>
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
        title={editingId ? t('stay.edit') : t('stay.add')}
      >
        <div className="stay-form">
          <div className="sample-row">
            <button type="button" className="btn ghost tiny" onClick={fillSample}>
              {t('fillSampleHotel')}
            </button>
          </div>
          <label className="field">
            <span>{t('stay.name')}</span>
            <input
              type="text"
              value={draft.name}
              placeholder={t('stay.namePlaceholder')}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>{t('stay.checkIn')}</span>
              <input
                type="date"
                value={draft.checkIn}
                onChange={(e) => setDraft({ ...draft, checkIn: e.target.value })}
              />
            </label>
            <label className="field">
              <span>{t('stay.checkOut')}</span>
              <input
                type="date"
                value={draft.checkOut}
                onChange={(e) => setDraft({ ...draft, checkOut: e.target.value })}
              />
            </label>
          </div>
          <label className="field">
            <span>{t('stay.ref')}</span>
            <input
              type="text"
              value={draft.ref}
              placeholder={t('stay.refPlaceholder')}
              onChange={(e) => setDraft({ ...draft, ref: e.target.value })}
            />
          </label>
          <label className="field">
            <span>{t('activity.address')}</span>
            <input
              type="text"
              value={draft.address}
              placeholder={t('activity.addressPlaceholder')}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>{t('activity.price')}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              />
            </label>
            <label className="field">
              <span>{t('activity.currency')}</span>
              <select
                value={draft.currency}
                onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>{t('stay.note')}</span>
            <input
              type="text"
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
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
