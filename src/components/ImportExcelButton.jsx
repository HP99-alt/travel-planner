import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { createId } from '../storage.js'
import {
  XLSX,
  parseTableText,
  worksheetToTable,
  mapColumns,
  buildActivities,
  activitiesToItinerary,
} from '../parse.js'

// Excel / CSV Instant Auto-Import.
// Supports: file drag-drop (.xlsx/.xls/.csv), clipboard paste, smart column
// mapping (bilingual aliases), a preview table, and one-click bulk create.
export default function ImportExcelButton({ onImport, defaultCurrency = 'MYR' }) {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [activities, setActivities] = useState([])
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${mm}-${dd}`
  })
  const [tripName, setTripName] = useState('')
  const [destination, setDestination] = useState('')
  const [error, setError] = useState('')
  const [source, setSource] = useState('') // 'file' | 'paste' | ''
  const fileRef = useRef(null)

  const isZh = lang === 'zh'

  // Field labels (bilingual).
  const FIELDS = ['day', 'time', 'title', 'note', 'category', 'address', 'ticketNo', 'price', 'currency']
  const fieldLabel = (f) =>
    ({
      day: t('import.colDay'),
      time: t('import.colTime'),
      title: t('import.colTitle'),
      note: t('import.colNote'),
      category: t('import.colCategory'),
      address: t('import.colAddress'),
      ticketNo: t('import.colTicket'),
      price: t('import.colPrice'),
      currency: t('import.colCurrency'),
    }[f])

  useEffect(() => {
    if (!open) document.body.style.overflow = ''
    else document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  function ingest({ headers, rows }, srcLabel) {
    if (!headers.length || !rows.length) {
      setError(t('import.noData'))
      return
    }
    setHeaders(headers)
    setRows(rows)
    setSource(srcLabel)
    setMapping(mapColumns(headers))
    setError('')
  }

  function recompute() {
    const acts = buildActivities({ headers, rows }, mapping, { startDate, defaultCurrency })
    setActivities(acts)
  }

  // Recompute preview whenever mapping / dates change (after data loaded).
  useEffect(() => {
    if (headers.length && rows.length) recompute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapping, startDate, headers, rows])

  async function handleFile(file) {
    setError('')
    const name = file.name.toLowerCase()
    try {
      if (name.endsWith('.csv') || name.endsWith('.txt')) {
        const text = await file.text()
        ingest(parseTableText(text), 'csv')
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        const first = wb.SheetNames[0]
        const ws = wb.Sheets[first]
        ingest(worksheetToTable(ws), first || 'xlsx')
      } else {
        setError(t('import.unsupported'))
      }
    } catch (e) {
      setError(t('import.parseFail') + ' ' + (e.message || ''))
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function onPasteIngest() {
    if (!pasteText.trim()) {
      setError(t('import.noData'))
      return
    }
    ingest(parseTableText(pasteText), 'paste')
  }

  function setField(field, colIndex) {
    setMapping((prev) => {
      const next = { ...prev }
      // Remove any previous mapping pointing to the same column.
      Object.keys(next).forEach((k) => {
        if (next[k] === colIndex) delete next[k]
      })
      if (colIndex != null && colIndex >= 0) next[field] = colIndex
      else delete next[field]
      return next
    })
  }

  function handleConfirm() {
    if (!activities.length) {
      setError(t('import.noData'))
      return
    }
    const { itinerary, maxOffset } = activitiesToItinerary(activities, createId)
    const days = Math.max(1, maxOffset + 1)
    const endDate = addDays(startDate, days - 1)
    const trip = {
      id: createId(),
      name: tripName.trim() || (isZh ? `${destination.trim() || '导入'}行程` : `${destination.trim() || 'Imported'} Trip`),
      destination: destination.trim(),
      startDate,
      endDate,
      days,
      itinerary,
      createdAt: Date.now(),
    }
    onImport(trip)
    reset()
    setOpen(false)
  }

  function reset() {
    setPasteText('')
    setHeaders([])
    setRows([])
    setMapping({})
    setActivities([])
    setError('')
    setSource('')
    setTripName('')
    setDestination('')
  }

  function addDays(iso, n) {
    const d = new Date(iso + 'T00:00:00')
    d.setDate(d.getDate() + n)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${mm}-${dd}`
  }

  const hasData = headers.length > 0 && rows.length > 0

  return (
    <>
      <button type="button" className="btn primary small" onClick={() => setOpen(true)}>
        📥 {t('import.open')}
      </button>

      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet import-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grabber" />
            <h2 className="sheet-title">{t('import.title')}</h2>

            <div className="import-body">
              {/* Step 1: source */}
              <div
                className={'dropzone' + (dragOver ? ' over' : '')}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv,.txt"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                    e.target.value = ''
                  }}
                />
                <p className="dropzone-icon">📄</p>
                <p>{t('import.dropHint')}</p>
                <p className="dropzone-sub">{t('import.dropFormats')}</p>
              </div>

              <div className="paste-divider">
                <span>{t('import.orPaste')}</span>
              </div>

              <textarea
                className="paste-box import-paste"
                rows={4}
                value={pasteText}
                placeholder={t('import.pastePlaceholder')}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <button type="button" className="btn ghost small" onClick={onPasteIngest}>
                {t('import.parsePaste')}
              </button>

              {error && <p className="import-error">{error}</p>}

              {hasData && (
                <>
                  {/* Trip meta */}
                  <div className="import-meta">
                    <label className="field">
                      <span>{t('form.name')}</span>
                      <input
                        type="text"
                        value={tripName}
                        placeholder={t('import.namePlaceholder')}
                        onChange={(e) => setTripName(e.target.value)}
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
                    <label className="field">
                      <span>{t('form.startDate')}</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </label>
                  </div>

                  {/* Step 2: column mapping */}
                  <div className="import-section">
                    <h3 className="import-h3">{t('import.mapTitle')}</h3>
                    <p className="import-hint">{t('import.mapHint')}</p>
                    <div className="map-grid">
                      {FIELDS.map((f) => (
                        <label className="map-row" key={f}>
                          <span className="map-label">{fieldLabel(f)}</span>
                          <select
                            value={mapping[f] ?? ''}
                            onChange={(e) =>
                              setField(f, e.target.value === '' ? null : Number(e.target.value))
                            }
                          >
                            <option value="">—</option>
                            {headers.map((h, i) => (
                              <option key={i} value={i}>
                                {h || `#${i + 1}`}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: preview */}
                  <div className="import-section">
                    <h3 className="import-h3">
                      {t('import.previewTitle')}{' '}
                      <span className="import-count">
                        {t('import.previewCount', { n: activities.length })}
                      </span>
                    </h3>
                    <div className="preview-scroll">
                      <table className="import-preview">
                        <thead>
                          <tr>
                            <th>{t('import.colDay')}</th>
                            <th>{t('import.colTime')}</th>
                            <th>{t('import.colTitle')}</th>
                            <th>{t('activity.category')}</th>
                            <th>{t('import.colPrice')}</th>
                            <th>{t('import.colCurrency')}</th>
                            <th>{t('import.colAddress')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activities.map((a, i) => (
                            <tr key={i}>
                              <td>D{a.dayOffset + 1}</td>
                              <td>{a.time || '—'}</td>
                              <td>{a.title || '—'}</td>
                              <td>{a.category || 'other'}</td>
                              <td>{a.price === '' ? '—' : a.price}</td>
                              <td>{a.currency || '—'}</td>
                              <td className="prev-addr">{a.address || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
                      {t('form.cancel')}
                    </button>
                    <button
                      type="button"
                      className="btn primary"
                      onClick={handleConfirm}
                      disabled={!activities.length}
                    >
                      {t('import.confirm')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
