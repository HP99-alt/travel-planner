import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { createId } from '../storage.js'

const MONTHS_EN = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

function diffDays(a, b) {
  const da = new Date(a + 'T00:00:00')
  const db = new Date(b + 'T00:00:00')
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return 0
  return Math.round((db - da) / 86400000)
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// Parse a line like "Aug 20 10:00 Senso-ji" or "8月20日 10:00 浅草寺"
// Returns { dayOffset, time, title } where dayOffset is days after trip start
// (null when no date found -> caller treats as day 0).
function parseLine(line, startDate) {
  const text = line.trim()
  if (!text) return null

  const timeMatch = text.match(/(\d{1,2})[:：](\d{2})/)
  const time = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : ''

  let dayOffset = null
  // Chinese: 8月20日 / 8/20
  const cn = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日?/)
  // English: Aug 20 / Aug. 20 / 8/20 / 2026-08-20
  const en = text.match(
    /\b([A-Za-z]{3,9})[.]?\s*(\d{1,2})\b|\b(\d{1,2})\/(\d{1,2})\b|\b(\d{4})-(\d{2})-(\d{2})\b/,
  )
  let matchMonth = null
  let matchDay = null
  if (cn) {
    matchMonth = Number(cn[1]) - 1
    matchDay = Number(cn[2])
  } else if (en) {
    if (en[5] != null) {
      // YYYY-MM-DD
      matchMonth = Number(en[6]) - 1
      matchDay = Number(en[7])
    } else if (en[1] != null) {
      const m = en[1].slice(0, 3).toLowerCase()
      matchMonth = MONTHS_EN[m] ?? null
      matchDay = Number(en[2])
    } else if (en[3] != null) {
      // M/D (assume current year, month=en[3], day=en[4])
      matchMonth = Number(en[3]) - 1
      matchDay = Number(en[4])
    }
  }

  if (matchMonth != null && matchDay != null && startDate) {
    const year = new Date(startDate + 'T00:00:00').getFullYear()
    const d = new Date(year, matchMonth, matchDay)
    if (!Number.isNaN(d.getTime())) {
      dayOffset = diffDays(startDate, d.toISOString().slice(0, 10))
    }
  }

  // Title = text with time and date tokens removed.
  let title = text
    .replace(/(\d{1,2})[:：](\d{2})/g, '')
    .replace(/(\d{1,2})\s*月\s*\d{1,2}\s*日?/g, '')
    .replace(/\b([A-Za-z]{3,9})[.]?\s*\d{1,2}\b/g, '')
    .replace(/\b\d{1,2}\/\d{1,2}\b/g, '')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '')
    .replace(/[，,、]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return { dayOffset, time, title }
}

function parseItinerary(text, startDate) {
  const lines = text.split(/\n|\n/).flatMap((l) => l.split(/(?<=[。.!?])\s*/))
  const result = {}
  let maxOffset = 0
  for (const raw of lines) {
    const parsed = parseLine(raw, startDate)
    if (!parsed || !parsed.title) continue
    const offset = parsed.dayOffset != null && parsed.dayOffset >= 0 ? parsed.dayOffset : 0
    maxOffset = Math.max(maxOffset, offset)
    const act = {
      id: createId(),
      time: parsed.time,
      title: parsed.title,
      note: '',
      category: 'other',
      address: '',
      ticketNo: '',
      price: '',
      currency: 'CNY',
      qrNote: '',
    }
    result[offset] = result[offset] || []
    result[offset].push(act)
  }
  return { itinerary: result, maxOffset }
}

const TEMPLATES = {
  tokyo: {
    name: '',
    destination: 'Tokyo',
    startOffset: 0,
    days: 5,
    text: `Day1 09:00 Senso-ji Temple, 14:00 Ginza shopping
Day2 08:30 teamLab Planets, 19:00 Shibuya Sky
Day3 10:00 Meiji Shrine, 13:00 Harajuku, 18:00 Ramen dinner
Day4 09:00 Tsukiji Outer Market, 15:00 Akihabara
Day5 11:00 Tokyo Tower, 16:00 Departure`,
  },
  weekend: {
    name: '',
    destination: 'Weekend Getaway',
    startOffset: 0,
    days: 2,
    text: `Day1 10:00 Check-in hotel, 13:00 Old town walk, 19:00 Local food
Day2 09:00 Museum, 12:00 Brunch, 15:00 Check-out`,
  },
}

export default function TripForm({ initial, onSubmit, onCancel }) {
  const { t, lang } = useI18n()
  const [name, setName] = useState(initial?.name ?? '')
  const [destination, setDestination] = useState(initial?.destination ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayISO())
  const [endDate, setEndDate] = useState(
    initial?.endDate ?? addDays(initial?.startDate ?? todayISO(), (initial?.days ?? 3) - 1),
  )
  const [itinerary, setItinerary] = useState(initial?.itinerary ?? {})
  const [pasteText, setPasteText] = useState('')
  const [parsedMsg, setParsedMsg] = useState('')

  const isEdit = !!initial

  useEffect(() => {
    setName(initial?.name ?? '')
    setDestination(initial?.destination ?? '')
    setStartDate(initial?.startDate ?? todayISO())
    setEndDate(
      initial?.endDate ?? addDays(initial?.startDate ?? todayISO(), (initial?.days ?? 3) - 1),
    )
    setItinerary(initial?.itinerary ?? {})
    setPasteText('')
    setParsedMsg('')
  }, [initial])

  const days = Math.max(1, diffDays(startDate, endDate) + 1)

  // Auto-title: when destination typed and name empty.
  function onDestination(v) {
    setDestination(v)
    if (!name.trim()) {
      const base = v.trim()
      if (base) setName(lang === 'zh' ? `${base}之旅` : `${base} Trip`)
    }
  }

  function applyTemplate(key) {
    const tpl = TEMPLATES[key]
    const start = todayISO()
    setDestination(tpl.destination)
    setName(lang === 'zh' ? `${tpl.destination}之旅` : `${tpl.destination} Trip`)
    setStartDate(start)
    setEndDate(addDays(start, tpl.days - 1))
    const { itinerary: it, maxOffset } = parseItinerary(tpl.text, start)
    setItinerary(it)
    setParsedMsg(t('form.parsed', { n: Object.values(it).reduce((s, a) => s + a.length, 0) }))
    setPasteText(tpl.text)
  }

  function handleParse() {
    if (!pasteText.trim()) return
    const { itinerary: it, maxOffset } = parseItinerary(pasteText, startDate)
    const count = Object.values(it).reduce((s, a) => s + a.length, 0)
    if (count === 0) return
    setItinerary((prev) => {
      const merged = { ...prev }
      Object.entries(it).forEach(([k, v]) => {
        merged[k] = [...(merged[k] || []), ...v]
      })
      return merged
    })
    // Extend end date if parsed activities go beyond current range.
    if (maxOffset + 1 > days) {
      setEndDate(addDays(startDate, maxOffset))
    }
    setParsedMsg(t('form.parsed', { n: count }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      name: name.trim() || (isEdit ? initial.name : 'Untitled Trip'),
      destination: destination.trim(),
      startDate,
      endDate,
      days,
      itinerary,
    }
    if (isEdit) {
      onSubmit({ ...initial, ...payload })
    } else {
      onSubmit({
        id: createId(),
        createdAt: Date.now(),
        ...payload,
      })
    }
  }

  return (
    <form className="trip-form" onSubmit={handleSubmit}>
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
          onChange={(e) => onDestination(e.target.value)}
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
          <span>{t('form.endDate')}</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
      </div>

      <div className="field auto-days">
        <span>{t('form.daysAuto')}</span>
        <strong>{days}</strong>
      </div>

      <div className="template-row">
        <span className="template-label">{t('form.template')}</span>
        <button type="button" className="btn ghost tiny" onClick={() => applyTemplate('tokyo')}>
          {t('form.tplTokyo')}
        </button>
        <button type="button" className="btn ghost tiny" onClick={() => applyTemplate('weekend')}>
          {t('form.tplWeekend')}
        </button>
      </div>

      <label className="field">
        <span>{t('form.paste')}</span>
        <textarea
          className="paste-box"
          rows={3}
          value={pasteText}
          placeholder={t('form.pastePlaceholder')}
          onChange={(e) => setPasteText(e.target.value)}
        />
      </label>
      <button type="button" className="btn primary small parse-btn" onClick={handleParse}>
        {t('form.parse')}
      </button>
      {parsedMsg && <p className="parsed-msg">{parsedMsg}</p>}

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
