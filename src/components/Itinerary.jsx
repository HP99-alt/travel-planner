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

function dateForDay(startDate, dayIndex) {
  if (!startDate) return ''
  const d = new Date(startDate + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + dayIndex)
  return isoYMD(d.getFullYear(), d.getMonth(), d.getDate())
}

// Compute duration label (e.g. "1h 30m") from start/end time; blank if invalid.
function computeDuration(start, end) {
  if (!start || !end) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return ''
  let mins = eh * 60 + em - (sh * 60 + sm)
  if (mins <= 0) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

async function geocode(address) {
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
    encodeURIComponent(address)
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    const data = await res.json()
    if (Array.isArray(data) && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
  } catch {
    /* best-effort */
  }
  return null
}

function sortByTime(list) {
  return [...list].sort((a, b) => {
    const ta = a.time || '99:99'
    const tb = b.time || '99:99'
    return ta.localeCompare(tb)
  })
}

// Convert "HH:MM" to minutes since midnight; null if missing/invalid.
function toMinutes(t) {
  if (!t || typeof t !== 'string' || !t.includes(':')) return null
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

// Two time intervals [s1, e1) and [s2, e2) overlap when both have a defined
// end and the start of one is strictly before the end of the other (and vice
// versa). Point-in-time items (no endTime) never overlap — e.g. a "Hotel
// Check-in" at 15:00 should not clash with a 14:00–16:00 activity.
function intervalsOverlap(a, b) {
  const as = toMinutes(a.time)
  const ae = toMinutes(a.endTime)
  const bs = toMinutes(b.time)
  const be = toMinutes(b.endTime)
  if (as == null || ae == null || bs == null || be == null) return false
  return as < be && bs < ae
}

// Returns a Set of item ids on a given day that overlap with at least one
// other item on that same day. Does not block editing — only warns gently.
function findOverlaps(list) {
  const ids = new Set()
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (intervalsOverlap(list[i], list[j])) {
        ids.add(list[i].id)
        ids.add(list[j].id)
      }
    }
  }
  return ids
}

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

function formatCost(price, currency) {
  if (price === '' || price == null) return ''
  const sym = {
    MYR: 'RM', USD: '$', CNY: '¥', EUR: '€', GBP: '£', KRW: '₩', JPY: '￥',
    HKD: 'HK$', SGD: 'S$', AUD: 'A$', THB: '฿',
  }[currency] || currency
  return `${sym} ${price}`
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.onerror = reject
    fr.readAsDataURL(file)
  })
}

function emptyDraft() {
  return {
    time: '',
    endTime: '',
    title: '',
    note: '',
    category: 'activity',
    address: '',
    ticketNo: '',
    estCost: '',
    actCost: '',
    currency: 'MYR',
    images: [],
    custom: [],
  }
}

export default function Itinerary({ trip, onUpdate }) {
  const { t, lang } = useI18n()
  const [addingForDay, setAddingForDay] = useState(null)
  const [draft, setDraft] = useState(emptyDraft())
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showBudget, setShowBudget] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const [geoState, setGeoState] = useState({})
  const [editingId, setEditingId] = useState(null) // activity id, or 'new' for dup
  const [editDraft, setEditDraft] = useState(null)
  const [editAdvanced, setEditAdvanced] = useState(false)
  const [editBudget, setEditBudget] = useState(false)
  const editDayRef = useRef(null)
  const fileRef = useRef(null)
  const [lightbox, setLightbox] = useState(null) // enlarged image src (click to view)

  const dayIndices = Array.from({ length: trip.days }, (_, i) => i)
  const itinerary = trip.itinerary || {}

  function activitiesForDay(dayIndex) {
    const sorted = sortByTime(itinerary[dayIndex] || [])
    const overlapIds = findOverlaps(sorted)
    // Flag overlapping items (passive warning only — never blocks the user).
    return sorted.map((a) => ({ ...a, overlap: overlapIds.has(a.id) }))
  }

  function updateDay(dayIndex, list) {
    onUpdate({ ...trip, itinerary: { ...itinerary, [dayIndex]: sortByTime(list) } })
  }

  function patchDay(dayIndex, activityId, patch) {
    updateDay(
      dayIndex,
      (itinerary[dayIndex] || []).map((a) => (a.id === activityId ? { ...a, ...patch } : a)),
    )
  }

  function removeActivity(dayIndex, activityId) {
    updateDay(dayIndex, (itinerary[dayIndex] || []).filter((a) => a.id !== activityId))
  }

  async function persist(item, dayIndex, isNew) {
    let lat = undefined
    let lng = undefined
    if (item.address?.trim()) {
      const g = await geocode(item.address.trim())
      if (g) {
        lat = g.lat
        lng = g.lng
      }
    }
    const full = { ...item, ...(lat != null ? { lat, lng } : {}) }
    if (isNew) updateDay(dayIndex, [...(itinerary[dayIndex] || []), full])
    else patchDay(dayIndex, item.id, full)
  }

  function startAdd(dayIndex) {
    setAddingForDay(dayIndex)
    setEditingId(null)
    setShowAdvanced(false)
    setShowBudget(false)
    setDraft({ ...emptyDraft(), time: '09:00' })
  }

  function startEdit(dayIndex, a) {
    setEditingId(a.id)
    setAddingForDay(null)
    setDraft(null)
    editDayRef.current = dayIndex
    setEditDraft({ ...emptyDraft(), ...a, images: a.images || [], custom: a.custom || [] })
    setEditAdvanced(!!(a.ticketNo || (a.custom && a.custom.length)))
    setEditBudget(a.estCost !== '' || a.actCost !== '')
  }

  function startDuplicate(dayIndex, a) {
    setEditingId('new')
    setAddingForDay(dayIndex)
    editDayRef.current = dayIndex
    setDraft({ ...emptyDraft(), ...a, id: undefined, title: a.title ? `${a.title} (copy)` : '', ticketNo: '', images: a.images || [], custom: a.custom || [] })
    setShowAdvanced(!!(a.ticketNo || (a.custom && a.custom.length)))
    setShowBudget(a.estCost !== '' || a.actCost !== '')
  }

  async function commitAdd() {
    if (!(draft.title || '').trim()) return
    await persist({ ...draft, id: createId() }, addingForDay, true)
    setAddingForDay(null)
    setShowAdvanced(false)
    setShowBudget(false)
  }

  async function commitEdit(activityId) {
    if (!(editDraft.title || '').trim()) return
    await persist(editDraft, editDayRef.current, false)
    setEditingId(null)
    setEditDraft(null)
    setEditAdvanced(false)
    setEditBudget(false)
  }

  async function commitDuplicate(dayIndex) {
    if (!(draft.title || '').trim()) return
    await persist({ ...draft, id: createId() }, dayIndex, true)
    setAddingForDay(null)
    setEditingId(null)
    setShowAdvanced(false)
    setShowBudget(false)
  }

  // Custom key-value rows operate on the draft's `custom` array. Each helper
  // receives the draft setter so it works for both the ADD draft and the EDIT
  // draft (draft / editDraft) without tangled prop wiring.
  function addCustom(setDraftFn) {
    setDraftFn((d) => ({ ...d, custom: [...(d.custom || []), { key: '', value: '' }] }))
  }
  function setCustomAt(setDraftFn, i, patch) {
    setDraftFn((d) => ({
      ...d,
      custom: (d.custom || []).map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    }))
  }
  function removeCustomAt(setDraftFn, i) {
    setDraftFn((d) => ({ ...d, custom: (d.custom || []).filter((_, idx) => idx !== i) }))
  }

  async function onImagesPicked(files, arr, setArr) {
    const adds = []
    for (const f of Array.from(files)) {
      if (f.type.startsWith('image/')) {
        try {
          adds.push(await readImage(f))
        } catch {
          /* skip */
        }
      }
    }
    setArr([...arr, ...adds])
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
            const isAdding = addingForDay === dayIndex
            return (
              <div className="day-card" key={dayIndex}>
                <div className="day-head">
                  <h3>
                    {t('itinerary.day')} {dayIndex + 1}
                  </h3>
                  {date && <span className="day-date">{date}</span>}
                </div>

                <ul className="timeline">
                  {items.length === 0 && !isAdding && editingId == null && (
                    <li className="activity-empty">{t('itinerary.emptyDay')}</li>
                  )}
                  {items.map((a, idx) => {
                    if (editingId === a.id && editDraft) {
                      return (
                        <li className="tl-item edit-mode" key={a.id}>
                          <ActivityForm
                            draft={editDraft}
                            setDraft={(patch) =>
                              setEditDraft((d) => ({ ...(d || {}), ...(typeof patch === 'function' ? patch(d) : patch) }))
                            }
                            showAdvanced={editAdvanced}
                            setShowAdvanced={setEditAdvanced}
                            showBudget={editBudget}
                            setShowBudget={setEditBudget}
                            onAdd={() => commitEdit(a.id)}
                            onCancel={() => {
                              setEditingId(null)
                              setEditDraft(null)
                            }}
                            addLabel={t('activity.save')}
                            t={t}
                            lang={lang}
                            CURRENCIES={CURRENCIES}
                            CATEGORIES={CATEGORIES}
                            addCustom={addCustom}
                            setCustomAt={setCustomAt}
                            removeCustomAt={removeCustomAt}
                            onImagesPicked={onImagesPicked}
                            fileRef={fileRef}
                    onImageClick={setLightbox}
                          />
                        </li>
                      )
                    }
                    const dur = computeDuration(a.time, a.endTime)
                    return (
                      <li
                        className="tl-item"
                        key={a.id}
                        draggable
                        onDragStart={() => setDragIndex(idx)}
                        onDragEnd={() => setDragIndex(null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragIndex == null) return
                          const list = [...(itinerary[dayIndex] || [])]
                          const [moved] = list.splice(dragIndex, 1)
                          list.splice(idx, 0, moved)
                          setDragIndex(null)
                          updateDay(dayIndex, list)
                        }}
                      >
                        <div className="tl-time">
                          {a.time ? formatTime12(a.time, lang) : '—'}
                          {a.endTime ? ` – ${formatTime12(a.endTime, lang)}` : ''}
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
                          {dur && <div className="tl-meta">⏱ {dur}</div>}
                          {a.note && <div className="tl-note">{a.note}</div>}
                          {(a.estCost !== '' && a.estCost != null) || (a.actCost !== '' && a.actCost != null) ? (
                            <div className="tl-meta">
                              💰{' '}
                              {a.actCost !== '' && a.actCost != null
                                ? `${formatCost(a.actCost, a.currency)} (${t('budget.actual')})`
                                : formatCost(a.estCost, a.currency)}
                            </div>
                          ) : null}
                          {a.images && a.images.length > 0 && (
                            <div className="tl-images">
                              {a.images.map((src, i) => (
                                <img
                                  key={i}
                                  src={src}
                                  alt=""
                                  className="tl-thumb"
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => setLightbox(src)}
                                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLightbox(src) }}
                                />
                              ))}
                            </div>
                          )}
                          {a.custom && a.custom.length > 0 && (
                            <div className="tl-custom">
                              {a.custom.map((row, i) => (
                                <div className="tl-custom-row" key={i}>
                                  <span className="tl-custom-k">{row.key}</span>
                                  <span className="tl-custom-v">
                                    {row.value}
                                    {row.value && <CopyButton value={row.value} />}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {a.overlap && (
                            <div className="tl-overlap" role="status">
                              ⚠️ {t('activity.overlap')}
                            </div>
                          )}
                          <div className="tl-actions">
                            <button type="button" className="btn ghost tiny" onClick={() => startEdit(dayIndex, a)}>
                              ✏️ {t('activity.edit')}
                            </button>
                            <button type="button" className="btn ghost tiny" onClick={() => startDuplicate(dayIndex, a)}>
                              📋 {t('activity.duplicate')}
                            </button>
                            <button type="button" className="btn danger tiny" onClick={() => removeActivity(dayIndex, a.id)}>
                              {t('activity.delete')}
                            </button>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>

                {isAdding ? (
                  <ActivityForm
                    draft={draft}
                    setDraft={(patch) =>
                      setDraft((d) => ({ ...(d || {}), ...(typeof patch === 'function' ? patch(d) : patch) }))
                    }
                    showAdvanced={showAdvanced}
                    setShowAdvanced={setShowAdvanced}
                    showBudget={showBudget}
                    setShowBudget={setShowBudget}
                    onAdd={commitAdd}
                    onCancel={() => {
                      setAddingForDay(null)
                      setShowAdvanced(false)
                      setShowBudget(false)
                    }}
                    addLabel={t('activity.add')}
                    t={t}
                    lang={lang}
                    CURRENCIES={CURRENCIES}
                    CATEGORIES={CATEGORIES}
                    addCustom={addCustom}
                    setCustomAt={setCustomAt}
                    removeCustomAt={removeCustomAt}
                    onImagesPicked={onImagesPicked}
                    fileRef={fileRef}
                    onImageClick={setLightbox}
                  />
                ) : (
                  <button className="btn ghost small add-activity" onClick={() => startAdd(dayIndex)}>
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

      {lightbox && (
        <div className="img-lightbox" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <button type="button" className="img-lightbox-close" aria-label="close" onClick={() => setLightbox(null)}>×</button>
          <img src={lightbox} alt="" className="img-lightbox-img" onClick={(e) => e.stopPropagation()} />
          <span className="img-lightbox-hint">{t('activity.lightboxHint')}</span>
        </div>
      )}

    </section>
  )
}

// Shared Add / Edit / Duplicate form. Minimal by default; Advanced Details and
// Budget expand on demand. `draft` shape matches the unified Activity model.
function ActivityForm({
  draft,
  setDraft,
  showAdvanced,
  setShowAdvanced,
  showBudget,
  setShowBudget,
  onAdd,
  onCancel,
  addLabel,
  t,
  lang,
  CURRENCIES,
  CATEGORIES,
  addCustom,
  setCustomAt,
  removeCustomAt,
  onImagesPicked,
  fileRef,
  onImageClick,
}) {
  // Merge patch into the draft (works for both the ADD draft and the EDIT
  // draft, whose setters have different shapes). Always use a functional
  // update so a single-field edit never wipes the other fields.
  const set = (patch) =>
    setDraft((d) => ({ ...(d || {}), ...(typeof patch === 'function' ? patch(d) : patch) }))
  const dur = computeDuration(draft.time, draft.endTime)
  const custom = draft.custom || []

  return (
    <div className="activity-form">
      <div className="af-row">
        <input type="time" value={draft.time} aria-label={t('activity.startTime')} onChange={(e) => set({ time: e.target.value })} />
        <input type="time" value={draft.endTime} aria-label={t('activity.endTime')} onChange={(e) => set({ endTime: e.target.value })} />
      </div>
      {dur && <div className="af-dur">⏱ {dur}</div>}

      <input type="text" className="af-title" placeholder={t('activity.titlePlaceholder')} value={draft.title} autoFocus onChange={(e) => set({ title: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') onAdd() }} />
      <input type="text" placeholder={t('activity.notePlaceholder')} value={draft.note} onChange={(e) => set({ note: e.target.value })} />
      <input type="text" placeholder={t('activity.addressPlaceholder')} value={draft.address} onChange={(e) => set({ address: e.target.value })} />

      <div className="af-images">
        {(draft.images || []).map((src, i) => (
          <div className="af-thumb-wrap" key={i}>
            <img
              src={src}
              alt=""
              className="af-thumb"
              role="button"
              tabIndex={0}
              onClick={() => onImageClick && onImageClick(src)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onImageClick && onImageClick(src) }}
            />
            <button type="button" className="af-thumb-x" onClick={() => set({ images: draft.images.filter((_, idx) => idx !== i) })} aria-label="delete">×</button>
          </div>
        ))}
        <button type="button" className="af-img-add" onClick={() => fileRef.current?.click()}>
          🖼 {t('activity.image')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            onImagesPicked(e.target.files, draft.images || [], (imgs) => set({ images: imgs }))
            e.target.value = ''
          }}
        />
      </div>

      <button type="button" className="adv-toggle" onClick={() => setShowBudget(!showBudget)} aria-expanded={showBudget}>
        {showBudget ? '▾' : '▸'} {t('activity.budget')} <span className="opt-tag">{t('activity.optional')}</span>
      </button>

      {showBudget && (
        <div className="adv-fields">
          <div className="af-row">
            <label className="af-cost">
              <span>{t('budget.estimated')}</span>
              <input type="number" min="0" step="0.01" value={draft.estCost} onChange={(e) => set({ estCost: e.target.value })} />
            </label>
            <label className="af-cost">
              <span>{t('budget.actual')}</span>
              <input type="number" min="0" step="0.01" value={draft.actCost} onChange={(e) => set({ actCost: e.target.value })} />
            </label>
            <select value={draft.currency} onChange={(e) => set({ currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <button type="button" className="adv-toggle" onClick={() => setShowAdvanced(!showAdvanced)} aria-expanded={showAdvanced}>
        {showAdvanced ? '▾' : '▸'} {t('activity.advanced')}
      </button>

      {showAdvanced && (
        <div className="adv-fields">
          <div className="cat-row">
            {CATEGORIES.map((c) => (
              <button type="button" key={c.key} className={`cat-chip ${draft.category === c.key ? 'active' : ''}`} onClick={() => set({ category: c.key })} title={t(c.labelKey)}>
                {c.icon}
              </button>
            ))}
          </div>
          <div className="af-row">
            <input type="text" placeholder={t('activity.ticketNoPlaceholder')} value={draft.ticketNo} onChange={(e) => set({ ticketNo: e.target.value })} />
          </div>
          <div className="custom-rows">
            {custom.map((row, i) => (
              <div className="custom-row" key={i}>
                <input type="text" placeholder={t('activity.fieldName')} value={row.key} onChange={(e) => setCustomAt(setDraft, i, { key: e.target.value })} />
                <input type="text" placeholder={t('activity.fieldValue')} value={row.value} onChange={(e) => setCustomAt(setDraft, i, { value: e.target.value })} />
                <button type="button" className="custom-x" onClick={() => removeCustomAt(setDraft, i)} aria-label="delete">×</button>
              </div>
            ))}
            <button type="button" className="custom-add" onClick={() => addCustom(setDraft)}>
              + {t('activity.addRow')}
            </button>
          </div>
        </div>
      )}

      <div className="form-actions">
        <button className="btn ghost small" onClick={onCancel}>{t('form.cancel')}</button>
        <button className="btn primary small" onClick={onAdd} disabled={!(draft.title || '').trim()}>{addLabel}</button>
      </div>
    </div>
  )
}
