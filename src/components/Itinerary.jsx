import { useRef, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { createId } from '../storage.js'
import { CATEGORIES, categoryIcon } from '../categories.js'
import { CURRENCIES } from '../budget.js'
import MapPanel from './MapPanel.jsx'
import CopyButton from './CopyButton.jsx'
import MapOpenButton from './MapOpenButton.jsx'

// Build a YYYY-MM-DD string from local Y/M/D without timezone shifting.
function isoYMD(y, m, d) {
  const mm = String(m + 1).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

// Compute the calendar date for a given day index from the trip start date.
// Day 1 (index 0) === start date. Timezone-safe (no toISOString).
function dateForDay(startDate, dayIndex) {
  if (!startDate) return ''
  const d = new Date(startDate + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + dayIndex)
  return isoYMD(d.getFullYear(), d.getMonth(), d.getDate())
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

// Sort activities for a day by start time (HH:MM) ascending; blank times last.
function sortByTime(list) {
  return [...list].sort((a, b) => {
    const ta = a.time || '99:99'
    const tb = b.time || '99:99'
    return ta.localeCompare(tb)
  })
}

// Format 24h "09:00" -> "9:00 AM" (locale-aware for zh/en handled by i18n).
function formatTime12(time, lang) {
  if (!time) return ''
  const [hStr, mStr] = time.split(':')
  let h = Number(hStr)
  const m = mStr || '00'
  const ampm = h < 12 ? (lang === 'zh' ? '上午' : 'AM') : lang === 'zh' ? '下午' : 'PM'
  let h12 = h % 12
  if (h12 === 0) h12 = 12
  return `${h12}:${m} ${ampm}`
}

// Format a price with its currency, e.g. "RM 15" / "¥ 3000".
function formatCost(price, currency) {
  if (price === '' || price == null) return ''
  const sym = {
    MYR: 'RM', USD: '$', CNY: '¥', EUR: '€', GBP: '£', KRW: '₩', JPY: '￥',
    HKD: 'HK$', SGD: 'S$', AUD: 'A$', THB: '฿',
  }[currency] || currency
  return `${sym} ${price}`
}

function emptyDraft() {
  return {
    time: '',
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
  const { t, lang } = useI18n()
  const [addingForDay, setAddingForDay] = useState(null)
  const [draft, setDraft] = useState(emptyDraft())
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const [geoState, setGeoState] = useState({}) // per activity id: 'ing' | 'fail'
  // editingId holds the id of the activity being edited, or 'new' for a fresh add.
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState(null)
  const [editAdvanced, setEditAdvanced] = useState(false)
  // Holds the day index of the activity currently being edited/duplicated,
  // so commitEdit/commitDuplicate know which day to write into.
  const editDayRef = useRef(null)

  const dayIndices = Array.from({ length: trip.days }, (_, i) => i)
  const itinerary = trip.itinerary || {}

  function activitiesForDay(dayIndex) {
    return sortByTime(itinerary[dayIndex] || [])
  }

  function updateDay(dayIndex, list) {
    // Auto-sort the day's activities by start time (HH:MM) so the stored
    // order always matches the timeline view.
    onUpdate({ ...trip, itinerary: { ...itinerary, [dayIndex]: sortByTime(list) } })
  }

  function startAdd(dayIndex) {
    setAddingForDay(dayIndex)
    setEditingId(null)
    setShowAdvanced(false)
    setDraft(emptyDraft())
    setDraft((d) => ({ ...d, time: '09:00' }))
  }

  function fillSampleTicket(dayIndex) {
    setAddingForDay(dayIndex)
    setEditingId(null)
    setShowAdvanced(true)
    setDraft({
      time: '14:00',
      title: 'teamLab Planets Tokyo',
      note: 'Evening session',
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
    setShowAdvanced(false)
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
    setDraft(null)
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
    setEditAdvanced(!!(activity.ticketNo || activity.qrNote))
    editDayRef.current = dayIndex
  }

  function startDuplicate(dayIndex, activity) {
    setEditingId('new')
    setAddingForDay(dayIndex)
    editDayRef.current = dayIndex
    setEditAdvanced(!!(activity.ticketNo || activity.qrNote))
    setDraft({
      time: activity.time || '',
      title: activity.title ? `${activity.title} (copy)` : '',
      note: activity.note || '',
      category: activity.category || 'other',
      address: activity.address || '',
      ticketNo: '',
      price: activity.price ?? '',
      currency: activity.currency || 'MYR',
      qrNote: '',
    })
  }

  function commitEdit(activityId) {
    if (!editDraft.title.trim()) return
    setActivityField(editDayRef.current, activityId, {
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
    setEditAdvanced(false)
  }

  async function commitDuplicate(dayIndex) {
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
        /* best-effort */
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
    updateDay(dayIndex, [...(itinerary[dayIndex] || []), activity])
    setAddingForDay(null)
    setEditingId(null)
    setShowAdvanced(false)
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

                <ul className="timeline">
                  {items.length === 0 && addingForDay !== dayIndex && editingId == null && (
                    <li className="activity-empty">{t('itinerary.emptyDay')}</li>
                  )}
                  {items.map((a, idx) => {
                    if (editingId === a.id && editDraft) {
                      // Edit form for this activity.
                      const fd = editDraft
                      const setFd = (patch) => setEditDraft({ ...editDraft, ...patch })
                      return (
                        <li className="tl-item edit-mode" key={a.id}>
                          <ActivityForm
                            draft={fd}
                            setDraft={setFd}
                            showAdvanced={editAdvanced}
                            setShowAdvanced={setEditAdvanced}
                            onAdd={() => commitEdit(a.id)}
                            onCancel={() => {
                              setEditingId(null)
                              setEditDraft(null)
                              setEditAdvanced(false)
                            }}
                            addLabel={t('activity.save')}
                            t={t}
                            CURRENCIES={CURRENCIES}
                            CATEGORIES={CATEGORIES}
                          />
                        </li>
                      )
                    }
                    return (
                      <li
                        className="tl-item"
                        key={a.id}
                        draggable
                        onDragStart={() => setDragIndex(idx)}
                        onDragEnd={() => setDragIndex(null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => onDrop(dayIndex, idx)}
                      >
                        <div className="tl-time">
                          {a.time ? formatTime12(a.time, lang) : '—'}
                        </div>
                        <div className="tl-dot" aria-hidden="true">
                          {categoryIcon(a.category)}
                        </div>
                        <div className="tl-body">
                          <div className="tl-title">{a.title}</div>
                          {a.address && (
                            <div className="tl-meta">
                              📍 {a.address}
                              <MapOpenButton address={a.address} />
                            </div>
                          )}
                          {a.price !== '' && a.price != null && (
                            <div className="tl-meta">💰 {formatCost(a.price, a.currency)}</div>
                          )}
                          {a.note && <div className="tl-note">{a.note}</div>}
                          <div className="tl-actions">
                            <button
                              type="button"
                              className="btn ghost tiny"
                              onClick={() => startEdit(dayIndex, a)}
                            >
                              ✏️ {t('activity.edit')}
                            </button>
                            <button
                              type="button"
                              className="btn ghost tiny"
                              onClick={() => startDuplicate(dayIndex, a)}
                            >
                              📋 {t('activity.duplicate')}
                            </button>
                            <button
                              type="button"
                              className="btn danger tiny"
                              onClick={() => removeActivity(dayIndex, a.id)}
                            >
                              {t('activity.delete')}
                            </button>
                          </div>
                        </div>
                        {(a.ticketNo || a.qrNote) && (
                          <div className="tl-ticket">
                            {a.ticketNo && (
                              <div className="field-with-copy">
                                <input
                                  type="text"
                                  className="ticket-input"
                                  value={a.ticketNo}
                                  readOnly
                                />
                                <CopyButton value={a.ticketNo} />
                              </div>
                            )}
                            {a.qrNote && <div className="tl-qr">📎 {a.qrNote}</div>}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>

                {addingForDay === dayIndex ? (
                  editingId === 'new' ? (
                    // Duplicate form (reuses draft + add layout)
                    <ActivityForm
                      draft={draft}
                      setDraft={(patch) => setDraft({ ...draft, ...patch })}
                      showAdvanced={showAdvanced}
                      setShowAdvanced={setShowAdvanced}
                      onAdd={() => commitDuplicate(dayIndex)}
                      onCancel={() => {
                        setAddingForDay(null)
                        setEditingId(null)
                        setShowAdvanced(false)
                      }}
                      addLabel={t('activity.add')}
                      t={t}
                      CURRENCIES={CURRENCIES}
                      CATEGORIES={CATEGORIES}
                    />
                  ) : (
                    <ActivityForm
                      draft={draft}
                      setDraft={(patch) => setDraft({ ...draft, ...patch })}
                      showAdvanced={showAdvanced}
                      setShowAdvanced={setShowAdvanced}
                      onAdd={commitAdd}
                      onCancel={() => {
                        setAddingForDay(null)
                        setShowAdvanced(false)
                      }}
                      addLabel={t('activity.add')}
                      t={t}
                      CURRENCIES={CURRENCIES}
                      CATEGORIES={CATEGORIES}
                    />
                  )
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

// Shared Add / Edit / Duplicate form. Primary fields: time, name, location,
// notes, cost. Secondary fields behind "Advanced Details": category, ticket,
// booking ref, screenshot/qr note.
function ActivityForm({
  draft,
  setDraft,
  showAdvanced,
  setShowAdvanced,
  onAdd,
  onCancel,
  addLabel,
  t,
  CURRENCIES,
  CATEGORIES,
}) {
  const set = (patch) => setDraft(patch)
  return (
    <div className="activity-form">
      <div className="af-row">
        <input
          type="time"
          value={draft.time}
          onChange={(e) => set({ time: e.target.value })}
          aria-label={t('activity.time')}
        />
        <input
          type="text"
          className="af-title"
          placeholder={t('activity.titlePlaceholder')}
          value={draft.title}
          autoFocus
          onChange={(e) => set({ title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onAdd()
          }}
        />
      </div>
      <input
        type="text"
        placeholder={t('activity.addressPlaceholder')}
        value={draft.address}
        onChange={(e) => set({ address: e.target.value })}
      />
      <input
        type="text"
        placeholder={t('activity.notePlaceholder')}
        value={draft.note}
        onChange={(e) => set({ note: e.target.value })}
      />
      <div className="af-row">
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder={t('activity.price')}
          value={draft.price}
          onChange={(e) => set({ price: e.target.value })}
        />
        <select
          value={draft.currency}
          onChange={(e) => set({ currency: e.target.value })}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="adv-toggle"
        onClick={() => setShowAdvanced(!showAdvanced)}
        aria-expanded={showAdvanced}
      >
        {showAdvanced ? '▾' : '▸'} {t('activity.advanced')}
      </button>

      {showAdvanced && (
        <div className="adv-fields">
          <div className="cat-row">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.key}
                className={`cat-chip ${draft.category === c.key ? 'active' : ''}`}
                onClick={() => set({ category: c.key })}
                title={t(c.labelKey)}
              >
                {c.icon}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder={t('activity.ticketNoPlaceholder')}
            value={draft.ticketNo}
            onChange={(e) => set({ ticketNo: e.target.value })}
          />
          <input
            type="text"
            placeholder={t('activity.qrNotePlaceholder')}
            value={draft.qrNote}
            onChange={(e) => set({ qrNote: e.target.value })}
          />
        </div>
      )}

      <div className="form-actions">
        <button className="btn ghost small" onClick={onCancel}>
          {t('form.cancel')}
        </button>
        <button className="btn primary small" onClick={onAdd} disabled={!draft.title.trim()}>
          {addLabel}
        </button>
      </div>
    </div>
  )
}
