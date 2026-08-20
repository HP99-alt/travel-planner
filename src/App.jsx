import { memo, useCallback, useEffect, useState } from 'react'
import { useI18n } from './i18n/LanguageContext.jsx'
import { useTheme } from './i18n/ThemeContext.jsx'
import { loadTrips, saveTrips } from './storage.js'
import { readTripsFromHash, clearHash } from './share.js'
import { createId } from './storage.js'
import TripList from './components/TripList.jsx'
import TripForm from './components/TripForm.jsx'
import Itinerary from './components/Itinerary.jsx'
import ExportPanel from './components/ExportPanel.jsx'
import PdfView from './components/PdfView.jsx'
import PackingList from './components/PackingList.jsx'
import BudgetPanel from './components/BudgetPanel.jsx'
import EmergencyPanel from './components/EmergencyPanel.jsx'
import Sheet from './components/Sheet.jsx'

// Memoize panels so keystroke updates in one panel don't re-render the others
// (this is what caused the input lag / scroll stutter).
const MemoItinerary = memo(Itinerary)
const MemoBudget = memo(BudgetPanel)
const MemoEmergency = memo(EmergencyPanel)
const MemoPacking = memo(PackingList)

export default function App() {
  const { t, lang, changeLang } = useI18n()
  const { theme, toggle, effectiveTheme } = useTheme()
  const [trips, setTrips] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [sharedTrips, setSharedTrips] = useState(null)

  useEffect(() => {
    const fromHash = readTripsFromHash()
    if (fromHash && fromHash.length > 0) {
      setSharedTrips(fromHash)
      setActiveId(fromHash[0].id)
      clearHash()
      return
    }
    const loaded = loadTrips()
    setTrips(loaded)
    if (loaded.length > 0) setActiveId(loaded[0].id)
  }, [])

  useEffect(() => {
    if (!sharedTrips) saveTrips(trips)
  }, [trips, sharedTrips])

  const activeTrip = trips.find((x) => x.id === activeId) || null
  const sharedTrip = sharedTrips?.find((x) => x.id === activeId) || null
  const viewTrip = activeTrip || sharedTrip

  // Stable callbacks so memoized children don't re-render on every keystroke.
  const handleCreate = useCallback((trip) => {
    setTrips((prev) => [...prev, trip])
    setActiveId(trip.id)
    setShowForm(false)
  }, [])

  const handleUpdate = useCallback((updated) => {
    if (sharedTrips) {
      setTrips((prev) => {
        const exists = prev.some((x) => x.id === updated.id)
        return exists ? prev.map((x) => (x.id === updated.id ? updated : x)) : [...prev, updated]
      })
      setSharedTrips(null)
      return
    }
    setTrips((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
  }, [sharedTrips])

  const handleDelete = useCallback((id) => {
    setTrips((prev) => prev.filter((x) => x.id !== id))
    if (activeId === id) setActiveId(null)
  }, [activeId])

  const handleEdit = useCallback((trip) => {
    setEditing(trip)
    setShowForm(true)
  }, [])

  const handleSubmitForm = useCallback((trip) => {
    setTrips((prev) =>
      editing
        ? prev.map((x) => (x.id === trip.id ? trip : x))
        : [...prev, trip],
    )
    if (!editing) setActiveId(trip.id)
    setShowForm(false)
    setEditing(null)
  }, [editing])

  const handleImport = useCallback((trip) => {
    setTrips((prev) => [...prev, trip])
    setActiveId(trip.id)
    setSharedTrips(null)
  }, [])

  const saveSharedTrip = useCallback(() => {
    if (!sharedTrip) return
    setTrips((prev) => {
      const exists = prev.some((x) => x.id === sharedTrip.id)
      return exists
        ? prev.map((x) => (x.id === sharedTrip.id ? sharedTrip : x))
        : [...prev, { ...sharedTrip, id: createId() }]
    })
    setSharedTrips(null)
  }, [sharedTrip])

  return (
    <div className="app">
      <header className="topbar glass">
        <div className="brand">
          <span className="brand-mark">✈</span>
          <div>
            <h1>{t('app.title')}</h1>
            <p className="brand-sub">{t('app.subtitle')}</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button
            className="icon-btn"
            onClick={toggle}
            aria-label={t('theme.toggle')}
            title={theme === 'auto' ? t('theme.auto') : effectiveTheme === 'dark' ? t('theme.dark') : t('theme.light')}
          >
            {theme === 'auto' ? '🌀' : effectiveTheme === 'dark' ? '🌙' : '☀️'}
          </button>
          <div className="lang-toggle" role="group" aria-label={t('lang.label')}>
            <button className={lang === 'en' ? 'active' : ''} onClick={() => changeLang('en')}>
              {t('lang.en')}
            </button>
            <button className={lang === 'zh' ? 'active' : ''} onClick={() => changeLang('zh')}>
              {t('lang.zh')}
            </button>
          </div>
        </div>
      </header>

      {sharedTrips && (
        <div className="shared-banner">
          <span>📎 {t('export.fromLink')} — {t('export.fromLinkHint')}</span>
          <button className="btn primary small" onClick={saveSharedTrip}>
            {t('form.save')}
          </button>
        </div>
      )}

      <div className="layout">
        {!showForm && (
          <div className="sidebar-col">
            <TripList
              trips={trips}
              activeId={activeId}
              onSelect={setActiveId}
              onNew={() => {
                setEditing(null)
                setShowForm(true)
              }}
              onImport={handleImport}
              onDelete={handleDelete}
            />
            {viewTrip && <MemoPacking trip={viewTrip} onUpdate={handleUpdate} />}
          </div>
        )}

        <main className="main">
          {viewTrip ? (
            <>
              <div className="itinerary-toolbar">
                <ExportPanel trip={viewTrip} />
              </div>
              <div className="detail-grid">
                <MemoItinerary trip={viewTrip} onUpdate={handleUpdate} />
                <aside className="detail-side">
                  <MemoBudget trip={viewTrip} onUpdate={handleUpdate} />
                  <MemoEmergency trip={viewTrip} onUpdate={handleUpdate} />
                </aside>
              </div>
            </>
          ) : (
            <div className="placeholder">
              <p>{t('trips.empty')}</p>
            </div>
          )}
        </main>
      </div>

      <Sheet
        open={showForm}
        onClose={() => {
          setShowForm(false)
          setEditing(null)
        }}
        title={editing ? t('form.editTrip') : t('form.create')}
      >
        <TripForm
          initial={editing}
          onSubmit={handleSubmitForm}
          onCancel={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      </Sheet>

      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {viewTrip && <PdfView trip={viewTrip} />}
      </div>
    </div>
  )
}
