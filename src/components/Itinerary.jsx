import { useState } from 'react'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { createId } from '../storage.js'
import { CATEGORIES, categoryIcon } from '../categories.js'
import { CURRENCIES } from '../budget.js'
import MapPanel from './MapPanel.jsx'
import CopyButton from './CopyButton.jsx'
import MapOpenButton from './MapOpenButton.jsx'

// Compute the calendar date for a given day index from the trip start date.
function dateForDay(startDate, dayIndex) {
  if (!startDate) return ''
  const d = new Date(startDate + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + dayIndex)
  return d.toISOString().slice(0, 10)
}

// Geocode an address via OpenStreetMap Nominatim (free, no key).
async function geocode(address) {
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
    encodeURIComponent(address)
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en' },
  })
  const data = await res.json()
  if (Array.isArray(data) && data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  }
  return null
}

function emptyDraft() {
  return {
    time: '09:00',
    title: '',
    note: '',
    category: 'other',
    address: '',
    ticketNo: '',
    price: '',
    currency: 'MYR',
    qrNote: '',
  }
}

export default function Itinerary({ trip, onUpdate }) {
  const { t } = useI18n()
  const [addingForDay, setAddingForDay] = useState(null)
  const [draft, setDraft] = useState(emptyDraft())
  const [dragIndex, setDragIndex] = useState(null)
  const [geoState, setGeoState] = useState({}) // per activity id: 'ing' | 'fail'
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState(null)

  const dayIndices = Array.from({ length: trip.days }, (_, i) => i)
  const itinerary = trip.itinerary || {}

  function activitiesForDay(dayIndex) {
    return [...(itinerary[dayIndex] || [])]
  }

  function updateDay(dayIndex, list) {
    onUpdate({ ...trip, itinerary: { ...itinerary, [dayIndex]: list } })
  }

  function startAdd(dayIndex) {
    setAddingForDay(dayIndex)
    setEditingId(null)
    setDraft(emptyDraft())
  }

  function fillSampleTicket(dayIndex) {
    setAddingForDay(dayIndex)
    setEditingId(null)
    setDraft({
      time: '14:00',
      title: 'teamLab Planets Tokyo',
      note: ' Evening session',
      category: 'sight',
      address: '6-1-16 Toyosu, Koto City, Tokyo',
      ticketNo: 'TK-774100',
      price: '3800',
      currency: 'JPY',
      qrNote: 'QR screenshot in Photos',
    })
  }

  async function commitAdd() {
    if (!draft.title.trim()) return
    let lat = undefined
    let lng = undefined
    if (draft.address.trim()) {
      try {
        const g = await geocode(draft.address.trim())
        if (g) {
          lat = g.lat
          lng = g.lng
        }
      } catch {
        /* geocoding is best-effort */
      }
    }
    const activity = {
      id: createId(),
      time: draft.time,
      title: draft.title.trim(),
      note: draft.note.trim(),
      category: draft.category,
      address: draft.address.trim(),
      ticketNo: draft.ticketNo.trim(),
      price: draft.price === '' ? '' : Number(draft.price),
      currency: draft.currency,
      qrNote: draft.qrNote.trim(),
      ...(lat != null ? { lat, lng } : {}),
    }
    updateDay(addingForDay, [...(itinerary[addingForDay] || []), activity])
    setAddingForDay(null)
  }

  function removeActivity(dayIndex, activityId) {
    updateDay(
      dayIndex,
      (itinerary[dayIndex] || []).filter((a) => a.id !== activityId),
    )
  }

  function setActivityField(dayIndex, activityId, patch) {
    updateDay(
      dayIndex,
      (itinerary[dayIndex] || []).map((a) =>
        a.id === activityId ? { ...a, ...patch } : a,
      ),
    )
  }

  function startEdit(dayIndex, activity) {
    setEditingId(activity.id)
    setAddingForDay(null)
    setEditDraft({
      time: activity.time || '',
      title: activity.title || '',
      note: activity.note || '',
      category: activity.category || 'other',
      address: activity.address || '',
      ticketNo: activity.ticketNo || '',
      price: activity.price ?? '',
      currency: activity.currency || 'MYR',
      qrNote: activity.qrNote || '',
    })
  }

  function commitEdit(dayIndex, activityId) {
    if (!editDraft.title.trim()) return
    setActivityField(dayIndex, activityId, {
      time: editDraft.time,
      title: editDraft.title.trim(),
      note: editDraft.note.trim(),
      category: editDraft.category,
      address: editDraft.address.trim(),
      ticketNo: editDraft.ticketNo.trim(),
      price: editDraft.price === '' ? '' : Number(editDraft.price),
      currency: editDraft.currency,
      qrNote: editDraft.qrNote.trim(),
    })
    setEditingId(null)
    setEditDraft(null)
  }

  async function locate(dayIndex, activity) {
    if (!activity.address?.trim()) return
    setGeoState((s) => ({ ...s, [activity.id]: 'ing' }))
    try {
      const g = await geocode(activity.address.trim())
      if (g) {
        setActivityField(dayIndex, activity.id, { lat: g.lat, lng: g.lng })
        setGeoState((s) => {
          const n = { ...s }
          delete n[activity.id]
          return n
        })
      } else {
        setGeoState((s) => ({ ...s, [activity.id]: 'fail' }))
      }
    } catch {
      setGeoState((s) => ({ ...s, [activity.id]: 'fail' }))
    }
  }

  // Drag & drop reordering within a day.
  function onDrop(dayIndex, targetIndex) {
    if (dragIndex == null) return
    const list = [...(itinerary[dayIndex] || [])]
    const [moved] = list.splice(dragIndex, 1)
    list.splice(targetIndex, 0, moved)
    setDragIndex(null)
    updateDay(dayIndex, list)
  }

  return (
    <section className="itinerary">
      <div className="itinerary-head">
        <h1>{trip.name}</h1>
        {trip.destination && <p className="trip-dest">{trip.destination}</p>}
      </div>

      <div className="itinerary-cols">
        <div className="days-scroll">
          {dayIndices.map((dayIndex) => {
            const items = activitiesForDay(dayIndex)
            const date = dateForDay(trip.startDate, dayIndex)
            return (
              <div className="day-card" key={dayIndex}>
                <div className="day-head">
                  <h3>
                    {t('itinerary.day')} {dayIndex + 1}
                  </h3>
                  {date && <span className="day-date">{date}</span>}
                </div>

                <ul className="activity-list" onDragOver={(e) => e.preventDefault()}>
                  {items.length === 0 && addingForDay !== dayIndex && editingId == null && (
                    <li className="activity-empty">{t('itinerary.emptyDay')}</li>
                  )}
                  {items.map((a, idx) => {
                    if (editingId === a.id && editDraft) {
                      return (
                        <li className="activity edit-mode" key={a.id}>
                          <div className="activity-form">
                            <div className="field-row">
                              <input
                                type="time"
                                value={editDraft.time}
                                onChange={(e) =>
                                  setEditDraft({ ...editDraft, time: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitEdit(dayIndex, a.id)
                                }}
                              />
                              <input
                                type="text"
                                className="activity-title-input"
                                placeholder={t('activity.titlePlaceholder')}
                                value={editDraft.title}
                                autoFocus
                                onChange={(e) =>
                                  setEditDraft({ ...editDraft, title: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitEdit(dayIndex, a.id)
                                }}
                              />
                            </div>
                            <div className="cat-row">
                              {CATEGORIES.map((c) => (
                                <button
                                  type="button"
                                  key={c.key}
                                  className={`cat-chip ${editDraft.category === c.key ? 'active' : ''}`}
                                  onClick={() => setEditDraft({ ...editDraft, category: c.key })}
                                  title={t(c.labelKey)}
                                >
                                  {c.icon}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              placeholder={t('activity.notePlaceholder')}
                              value={editDraft.note}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, note: e.target.value })
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEdit(dayIndex, a.id)
                              }}
                            />
                            <input
                              type="text"
                              placeholder={t('activity.addressPlaceholder')}
                              value={editDraft.address}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, address: e.target.value })
                              }
                            />
                            <div className="field-row">
                              <input
                                type="text"
                                placeholder={t('activity.ticketNoPlaceholder')}
                                value={editDraft.ticketNo}
                                onChange={(e) =>
                                  setEditDraft({ ...editDraft, ticketNo: e.target.value })
                                }
                              />
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder={t('activity.price')}
                                value={editDraft.price}
                                onChange={(e) =>
                                  setEditDraft({ ...editDraft, price: e.target.value })
                                }
                              />
                              <select
                                value={editDraft.currency}
                                onChange={(e) =>
                                  setEditDraft({ ...editDraft, currency: e.target.value })
                                }
                              >
                                {CURRENCIES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <input
                              type="text"
                              placeholder={t('activity.qrNotePlaceholder')}
                              value={editDraft.qrNote}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, qrNote: e.target.value })
                              }
                            />
                            <div className="form-actions">
                              <button
                                className="btn ghost small"
                                onClick={() => {
                                  setEditingId(null)
                                  setEditDraft(null)
                                }}
                              >
                                {t('form.cancel')}
                              </button>
                              <button
                                className="btn primary small"
                                onClick={() => commitEdit(dayIndex, a.id)}
                              >
                                {t('activity.save')}
                              </button>
                            </div>
                          </div>
                        </li>
                      )
                    }
                    return (
                      <li
                        className="activity"
                        key={a.id}
                        draggable
                        onDragStart={() => setDragIndex(idx)}
                        onDragEnd={() => setDragIndex(null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => onDrop(dayIndex, idx)}
                      >
                        <span className="drag-handle" title="drag">⠿</span>
                        <button
                          type="button"
                          className="activity-main-btn"
                          onClick={() => startEdit(dayIndex, a)}
                          aria-label={t('activity.edit')}
                        >
                          <span className="activity-icon">{categoryIcon(a.category)}</span>
                          <span className="activity-time">{a.time || '--:--'}</span>
                          <span className="activity-body">
                            <span className="activity-title">{a.title}</span>
                            {a.note && <span className="activity-note">{a.note}</span>}
                            {(a.address || a.lat != null) && (
                              <span className="activity-addr">
                                📍 {a.address || `${a.lat?.toFixed(4)}, ${a.lng?.toFixed(4)}`}
                                {a.address && <MapOpenButton address={a.address} />}
                              </span>
                            )}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="btn ghost tiny edit-pen"
                          onClick={() => startEdit(dayIndex, a)}
                          aria-label={t('activity.edit')}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn danger tiny"
                          onClick={() => removeActivity(dayIndex, a.id)}
                        >
                          {t('activity.delete')}
                        </button>
                      </li>
                    )
                  })}
                </ul>

                {addingForDay === dayIndex ? (
                  <div className="activity-form">
                    <div className="field-row">
                      <input
                        type="time"
                        value={draft.time}
                        onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                      />
                      <input
                        type="text"
                        className="activity-title-input"
                        placeholder={t('activity.titlePlaceholder')}
                        value={draft.title}
                        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                        autoFocus
                      />
                    </div>
                    <div className="cat-row">
                      {CATEGORIES.map((c) => (
                        <button
                          type="button"
                          key={c.key}
                          className={`cat-chip ${draft.category === c.key ? 'active' : ''}`}
                          onClick={() => setDraft({ ...draft, category: c.key })}
                          title={t(c.labelKey)}
                        >
                          {c.icon}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder={t('activity.notePlaceholder')}
                      value={draft.note}
                      onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder={t('activity.addressPlaceholder')}
                      value={draft.address}
                      onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                    />
                    <div className="sample-row">
                      <button
                        type="button"
                        className="btn ghost tiny"
                        onClick={() => fillSampleTicket(dayIndex)}
                      >
                        {t('fillSampleTicket')}
                      </button>
                    </div>
                    <div className="field-row">
                      <input
                        type="text"
                        placeholder={t('activity.ticketNoPlaceholder')}
                        value={draft.ticketNo}
                        onChange={(e) => setDraft({ ...draft, ticketNo: e.target.value })}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={t('activity.price')}
                        value={draft.price}
                        onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                      />
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
                    </div>
                    <input
                      type="text"
                      placeholder={t('activity.qrNotePlaceholder')}
                      value={draft.qrNote}
                      onChange={(e) => setDraft({ ...draft, qrNote: e.target.value })}
                    />
                    <div className="form-actions">
                      <button
                        className="btn ghost small"
                        onClick={() => setAddingForDay(null)}
                      >
                        {t('form.cancel')}
                      </button>
                      <button className="btn primary small" onClick={commitAdd}>
                        {t('activity.add')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn ghost small add-activity"
                    onClick={() => startAdd(dayIndex)}
                  >
                    + {t('itinerary.addActivity')}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className="map-panel">
          <h3 className="map-title">{t('map.title')}</h3>
          <MapPanel trip={trip} />
        </div>
      </div>
    </section>
  )
}
