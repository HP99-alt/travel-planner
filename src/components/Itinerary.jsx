import { Fragment, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { createId } from '../storage.js'
import { CATEGORIES, categoryIcon } from '../categories.js'
import { CURRENCIES } from '../budget.js'
import MapPanel from './MapPanel.jsx'
import CopyButton from './CopyButton.jsx'
import MapOpenButton from './MapOpenButton.jsx'
import LinkifiedText from './LinkifiedText.jsx'
import { dateForDay } from '../date.js'
import { travelMinutes, travelModeFor, travelIconFor, directionsUrl } from '../travel.js'

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

// 自动计算住宿天数/晚数
function computeNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return ''
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  const diffTime = end - start
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? `${diffDays} night${diffDays > 1 ? 's' : ''}` : ''
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
  const sym =
    {
      MYR: 'RM',
      USD: '$',
      CNY: '¥',
      EUR: '€',
      GBP: '£',
      KRW: '₩',
      JPY: '￥',
      HKD: 'HK$',
      SGD: 'S$',
      AUD: 'A$',
      THB: '฿',
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

// 扩展草稿结构，加入住宿日期和电话字段
function emptyDraft(section = 'activity') {
  return {
    section,
    time: '',
    endTime: '',
    checkIn: '',
    checkOut: '',
    phone: '',
    title: '',
    note: '',
    category: section === 'flight' ? 'flight' : section === 'accommodation' ? 'hotel' : 'activity',
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
  const [addingState, setAddingState] = useState(null)
  const [draft, setDraft] = useState(emptyDraft())
  const [showBudget, setShowBudget] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState(null)
  const [editBudget, setEditBudget] = useState(false)
  const editDayRef = useRef(null)
  const fileRef = useRef(null)
  const [lightbox, setLightbox] = useState(null)
  const [travel, setTravel] = useState({})

  const dayIndices = Array.from({ length: trip.days }, (_, i) => i)
  const itinerary = trip.itinerary || {}

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const next = {}
      for (const di of dayIndices) {
        const list = sortByTime(itinerary[di] || []).filter(
          (a) => typeof a.lat === 'number' && typeof a.lng === 'number',
        )
        const conns = []
        for (let i = 0; i < list.length - 1; i++) {
          const a = list[i]
          const b = list[i + 1]
          const mode = travelModeFor(b)
          const minutes = await travelMinutes(
            { lat: a.lat, lng: a.lng },
            { lat: b.lat, lng: b.lng },
            mode === 'transit' ? 'driving' : mode,
          )
          conns.push({ minutes, mode, aId: a.id, bId: b.id })
        }
        if (conns.length) next[di] = conns
      }
      if (!cancelled) setTravel(next)
    })()
    return () => {
      cancelled = true
    }
  }, [JSON.stringify(trip.itinerary), trip.days])

  function activitiesForDay(dayIndex, section) {
    const sorted = sortByTime(itinerary[dayIndex] || [])
    return sorted.filter((a) => (a.section || 'activity') === section)
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
    updateDay(
      dayIndex,
      (itinerary[dayIndex] || []).filter((a) => a.id !== activityId),
    )
  }

  function addDay() {
    onUpdate({ ...trip, days: trip.days + 1 })
  }

  function removeDay(dayIndex) {
    if (trip.days <= 1) return
    if ((itinerary[dayIndex] || []).length > 0) {
      if (!window.confirm(t('itinerary.removeDayConfirm'))) return
    }
    const next = {}
    for (let d = 0; d < trip.days; d++) {
      if (d === dayIndex) continue
      const target = d > dayIndex ? d - 1 : d
      next[target] = itinerary[d] || []
    }
    onUpdate({ ...trip, days: trip.days - 1, itinerary: next })
  }

  function changeStartDate(value) {
    if (!value) return
    onUpdate({ ...trip, startDate: value })
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
    // 即使 title 为空也允许设置默认名称保存
    const finalTitle = (item.title || '').trim() || (item.section === 'accommodation' ? 'Accommodation Place' : 'Untitled Event')
    const full = { ...item, title: finalTitle, ...(lat != null ? { lat, lng } : {}) }
    if (isNew) updateDay(dayIndex, [...(itinerary[dayIndex] || []), full])
    else patchDay(dayIndex, item.id, full)
  }

  function startAdd(dayIndex, section) {
    setAddingState({ day: dayIndex, section })
    setEditingId(null)
    setShowBudget(false)
    setDraft({ ...emptyDraft(section), time: section === 'accommodation' ? '' : '09:00' })
  }

  function startEdit(dayIndex, a) {
    setEditingId(a.id)
    setAddingState(null)
    setDraft(null)
    editDayRef.current = dayIndex
    setEditDraft({ ...emptyDraft(a.section || 'activity'), ...a, images: a.images || [], custom: a.custom || [] })
    setEditBudget(a.estCost !== '' || a.actCost !== '')
  }

  function startDuplicate(dayIndex, a) {
    setEditingId('new')
    setAddingState({ day: dayIndex, section: a.section || 'activity' })
    editDayRef.current = dayIndex
    setDraft({
      ...emptyDraft(a.section || 'activity'),
      ...a,
      id: undefined,
      title: a.title ? `${a.title} (copy)` : '',
      ticketNo: '',
      images: a.images || [],
      custom: a.custom || [],
    })
    setShowBudget(a.estCost !== '' || a.actCost !== '')
  }

  // 取消强制拦截：即便没有输入 title，依然可以直接提交保存
  async function commitAdd() {
    await persist({ ...draft, id: createId() }, addingState.day, true)
    setAddingState(null)
    setShowBudget(false)
  }

  async function commitEdit() {
    await persist(editDraft, editDayRef.current, false)
    setEditingId(null)
    setEditDraft(null)
    setEditBudget(false)
  }

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

  function renderSection(dayIndex, sectionKey, sectionTitle, sectionIcon) {
    const items = activitiesForDay(dayIndex, sectionKey)
    const isAdding = addingState?.day === dayIndex && addingState?.section === sectionKey

    return (
      <div className="itinerary-section" style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '14px', margin: '8px 0 6px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>{sectionIcon}</span> {sectionTitle}
        </h4>

        <ul className="timeline">
          {items.map((a, idx) => {
            if (editingId === a.id && editDraft) {
              return (
                <li className="tl-item edit-mode" key={a.id}>
                  <ActivityForm
                    draft={editDraft}
                    setDraft={setEditDraft}
                    showBudget={editBudget}
                    setShowBudget={setEditBudget}
                    onAdd={() => commitEdit()}
                    onCancel={() => {
                      setEditingId(null)
                      setEditDraft(null)
                    }}
                    addLabel={t('activity.save') || 'Save'}
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
            const nights = computeNights(a.checkIn, a.checkOut)

            return (
              <Fragment key={a.id}>
                <li className="tl-item">
                  <div className="tl-time">
                    {a.section === 'accommodation' && (a.checkIn || a.checkOut) ? (
                      <span style={{ fontSize: '12px' }}>
                        {a.checkIn || '—'} → {a.checkOut || '—'}
                      </span>
                    ) : (
                      <>
                        {a.time ? formatTime12(a.time, lang) : '—'}
                        {a.endTime ? ` – ${formatTime12(a.endTime, lang)}` : ''}
                      </>
                    )}
                  </div>
                  <div className="tl-dot" aria-hidden="true">
                    {categoryIcon(a.category)}
                  </div>
                  <div className="tl-body">
                    <div className="tl-title">{a.title}</div>
                    
                    {/* 新增：如果填写了电话，支持直接拨打 */}
                    {a.phone && (
                      <div className="tl-meta">
                        📞 <a href={`tel:${a.phone}`} style={{ color: '#60a5fa', textDecoration: 'underline' }}>{a.phone}</a>
                      </div>
                    )}

                    {a.address && (
                      <div className="tl-meta">
                        📍 <LinkifiedText text={a.address} />
                        <MapOpenButton address={a.address} />
                      </div>
                    )}
                    {nights && <div className="tl-meta">🌙 {nights}</div>}
                    {dur && <div className="tl-meta">⏱ {dur}</div>}
                    {a.note && <div className="tl-note"><LinkifiedText text={a.note} /></div>}
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
                            onClick={() => setLightbox(src)}
                          />
                        ))}
                      </div>
                    )}
                    {a.custom && a.custom.length > 0 && (
                      <div className="tl-custom">
                        {a.custom.map((row, i) => (
                          <div className="tl-custom-row" key={i} style={{ fontSize: '13px', margin: '2px 0' }}>
                            {row.key && <strong>{row.key}: </strong>}
                            <span>
                              <LinkifiedText text={row.value} />
                              {row.value && <CopyButton value={row.value} />}
                            </span>
                          </div>
                        ))}
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
              </Fragment>
            )
          })}
        </ul>

        {isAdding ? (
          <ActivityForm
            draft={draft}
            setDraft={setDraft}
            showBudget={showBudget}
            setShowBudget={setShowBudget}
            onAdd={commitAdd}
            onCancel={() => setAddingState(null)}
            addLabel={t('activity.add') || 'Save'}
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
          <button
            className="btn ghost small add-activity"
            style={{ marginTop: '4px', width: '100%' }}
            onClick={() => startAdd(dayIndex, sectionKey)}
          >
            + Add {sectionTitle}
          </button>
        )}
      </div>
    )
  }

  return (
    <section className="itinerary">
      <div className="itinerary-head">
        <div className="ih-top">
          <div>
            <h1>{trip.name}</h1>
            {trip.destination && <p className="trip-dest">{trip.destination}</p>}
          </div>
          <div className="day-mgmt">
            <label className="dm-start" title={t('itinerary.startDate')}>
              📅
              <input type="date" value={trip.startDate || ''} onChange={(e) => changeStartDate(e.target.value)} />
            </label>
            <button type="button" className="btn ghost tiny" onClick={addDay}>
              ＋ {t('itinerary.addDay')}
            </button>
          </div>
        </div>
        <p className="ih-hint">
          {t('itinerary.date')}: {dateForDay(trip.startDate, 0)} → {dateForDay(trip.startDate, trip.days - 1)} · {trip.days} {t('itinerary.daysLabel')}
        </p>
      </div>

      <div className="itinerary-cols">
        <div className="days-scroll">
          {dayIndices.map((dayIndex) => {
            const date = dateForDay(trip.startDate, dayIndex)
            return (
              <div className="day-card" key={dayIndex}>
                <div className="day-head">
                  <h3>
                    {t('itinerary.day')} {dayIndex + 1}
                  </h3>
                  <div className="day-head-right">
                    {date && <span className="day-date">{date}</span>}
                    <button
                      type="button"
                      className="day-remove"
                      title={t('itinerary.removeDay')}
                      aria-label={t('itinerary.removeDay')}
                      onClick={() => removeDay(dayIndex)}
                      disabled={trip.days <= 1}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {renderSection(dayIndex, 'flight', 'Flights / Transport', '✈️')}
                {renderSection(dayIndex, 'accommodation', 'Accommodation', '🏨')}
                {renderSection(dayIndex, 'activity', 'Activities', '📌')}
              </div>
            )
          })}
        </div>

        <div className="map-panel">
          <h3 className="map-title">{t('map.title')}</h3>
          <MapPanel trip={trip} onUpdate={onUpdate} />
        </div>
      </div>

      {lightbox && (
        <div className="img-lightbox" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <button type="button" className="img-lightbox-close" aria-label="close" onClick={() => setLightbox(null)}>×</button>
          <img src={lightbox} alt="" className="img-lightbox-img" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
  )
}

function ActivityForm({
  draft,
  setDraft,
  showBudget,
  setShowBudget,
  onAdd,
  onCancel,
  addLabel,
  t,
  CURRENCIES,
  addCustom,
  setCustomAt,
  removeCustomAt,
  onImagesPicked,
  fileRef,
  onImageClick,
}) {
  const set = (patch) =>
    setDraft((d) => ({ ...(d || {}), ...(typeof patch === 'function' ? patch(d) : patch) }))
  const dur = computeDuration(draft.time, draft.endTime)
  const nights = computeNights(draft.checkIn, draft.checkOut)
  const custom = draft.custom || []
  const [pasteActive, setPasteActive] = useState(false)
  const isAccommodation = draft.section === 'accommodation'

  async function handlePaste(e) {
    const cd = e.clipboardData
    if (!cd) return
    const files = []
    if (cd.files && cd.files.length) {
      for (const f of Array.from(cd.files)) if (f.type.startsWith('image/')) files.push(f)
    }
    if (!files.length && cd.items) {
      for (const it of Array.from(cd.items)) {
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          const f = it.getAsFile()
          if (f) files.push(f)
        }
      }
    }
    if (!files.length) return
    e.preventDefault()
    onImagesPicked(files, draft.images || [], (next) => set({ images: next }))
  }

  return (
    <div className="activity-form">
      {/* 如果是 Accommodation，显示日期范围输入框；否则显示时间框 */}
      {isAccommodation ? (
        <div className="af-row" style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Check-in</span>
            <input type="date" value={draft.checkIn || ''} onChange={(e) => set({ checkIn: e.target.value })} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Check-out</span>
            <input type="date" value={draft.checkOut || ''} onChange={(e) => set({ checkOut: e.target.value })} />
          </div>
        </div>
      ) : (
        <div className="af-row">
          <input type="time" value={draft.time} aria-label="Start Time" onChange={(e) => set({ time: e.target.value })} />
          <input type="time" value={draft.endTime} aria-label="End Time" onChange={(e) => set({ endTime: e.target.value })} />
        </div>
      )}

      {nights && <div className="af-dur">🌙 {nights}</div>}
      {dur && !isAccommodation && <div className="af-dur">⏱ {dur}</div>}

      <input
        type="text"
        className="af-title"
        placeholder={isAccommodation ? "Hotel / Accommodation Name..." : "Title / Name..."}
        value={draft.title}
        autoFocus
        onChange={(e) => set({ title: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onAdd()
        }}
      />

      {/* 新增：电话号码输入框 */}
      <input
        type="tel"
        placeholder="Contact Phone Number..."
        value={draft.phone || ''}
        onChange={(e) => set({ phone: e.target.value })}
      />

      <input type="text" placeholder={t('activity.notePlaceholder')} value={draft.note} onChange={(e) => set({ note: e.target.value })} />
      <input type="text" placeholder={t('activity.addressPlaceholder')} value={draft.address} onChange={(e) => set({ address: e.target.value })} />

      {/* Custom Rows */}
      <div className="custom-fields-section" style={{ marginTop: '8px', marginBottom: '8px' }}>
        {custom.map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Title / Label"
              value={row.key}
              onChange={(e) => setCustomAt(setDraft, i, { key: e.target.value })}
              style={{ width: '35%' }}
            />
            <input
              type="text"
              placeholder="Description / Value / URL"
              value={row.value}
              onChange={(e) => setCustomAt(setDraft, i, { value: e.target.value })}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={() => removeCustomAt(setDraft, i)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0 4px',
              }}
              title="Delete row"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn ghost tiny"
          onClick={() => addCustom(setDraft)}
          style={{ width: '100%', borderStyle: 'dashed', marginTop: '4px' }}
        >
          ＋ Add Custom Row
        </button>
      </div>

      <div
        className={`af-images ${pasteActive ? 'paste-active' : ''}`}
        onPaste={handlePaste}
        onDragOver={(e) => {
          if (Array.from(e.dataTransfer.items || []).some((i) => i.kind === 'file')) {
            e.preventDefault()
            setPasteActive(true)
          }
        }}
        onDragLeave={() => setPasteActive(false)}
        onDrop={(e) => {
          const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'))
          if (files.length) {
            e.preventDefault()
            onImagesPicked(files, draft.images || [], (next) => set({ images: next }))
          }
          setPasteActive(false)
        }}
      >
        {(draft.images || []).map((src, i) => (
          <div className="af-thumb-wrap" key={i}>
            <img
              src={src}
              alt=""
              className="af-thumb"
              onClick={() => onImageClick && onImageClick(src)}
            />
            <button type="button" className="af-thumb-x" onClick={() => set({ images: draft.images.filter((_, idx) => idx !== i) })}>
              ×
            </button>
          </div>
        ))}
        <button type="button" className="af-img-add" onClick={() => fileRef.current?.click()}>
          🖼 {t('activity.image')}
        </button>
        <span className="af-paste-hint" title={t('activity.pasteImageHint')}>
          {t('activity.pasteImageHint')}
        </span>
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
            <input type="number" placeholder="Est. Cost" value={draft.estCost} onChange={(e) => set({ estCost: e.target.value })} />
            <input type="number" placeholder="Act. Cost" value={draft.actCost} onChange={(e) => set({ actCost: e.target.value })} />
            <select value={draft.currency} onChange={(e) => set({ currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="af-buttons">
        <button type="button" className="btn ghost small" onClick={onCancel}>
          {t('activity.cancel') || 'Cancel'}
        </button>
        <button type="button" className="btn primary small" onClick={onAdd}>
          {addLabel}
        </button>
      </div>
    </div>
  )
}
