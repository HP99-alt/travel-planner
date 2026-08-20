import { useEffect, useState } from 'react'
import { useI18n } from './i18n/LanguageContext.jsx'
import { loadTrips, saveTrips } from './storage.js'
import { readTripsFromHash, clearHash } from './share.js'
import { createId } from './storage.js'
import TripList from './components/TripList.jsx'
import TripForm from './components/TripForm.jsx'
import Itinerary from './components/Itinerary.jsx'
import ExportPanel from './components/ExportPanel.jsx'
import PdfView from './components/PdfView.jsx'
import PackingList from './components/PackingList.jsx'
import LodgingPanel from './components/LodgingPanel.jsx'
import BudgetPanel from './components/BudgetPanel.jsx'
import FlightsPanel from './components/FlightsPanel.jsx'

export default function App() {
  const { t, lang, changeLang } = useI18n()
  const [trips, setTrips] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [sharedTrips, setSharedTrips] = useState(null) // trips loaded from a share link

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

  function handleCreate(trip) {
    setTrips((prev) => [...prev, trip])
    setActiveId(trip.id)
    setShowForm(false)
  }

  function handleUpdate(updated) {
    if (sharedTrips) {
      // Save shared trip into local list so edits persist.
      setTrips((prev) => {
        const exists = prev.some((x) => x.id === updated.id)
        return exists ? prev.map((x) => (x.id === updated.id ? updated : x)) : [...prev, updated]
      })
      setSharedTrips(null)
      return
    }
    setTrips((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
  }

  function handleDelete(id) {
    setTrips((prev) => prev.filter((x) => x.id !== id))
    if (activeId === id) setActiveId(null)
  }

  function handleEdit(trip) {
    setEditing(trip)
    setShowForm(true)
  }

  function handleSubmitForm(trip) {
    if (editing) {
      handleUpdate(trip)
      setEditing(null)
    } else {
      handleCreate(trip)
    }
    setShowForm(false)
  }

  function saveSharedTrip() {
    if (!sharedTrip) return
    setTrips((prev) => {
      const exists = prev.some((x) => x.id === sharedTrip.id)
      return exists
        ? prev.map((x) => (x.id === sharedTrip.id ? sharedTrip : x))
        : [...prev, { ...sharedTrip, id: createId() }]
    })
    setSharedTrips(null)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">✈</span>
          <div>
            <h1>{t('app.title')}</h1>
            <p className="brand-sub">{t('app.subtitle')}</p>
          </div>
        </div>
        <div className="lang-toggle" role="group" aria-label={t('lang.label')}>
          <button
            className={lang === 'en' ? 'active' : ''}
            onClick={() => changeLang('en')}
          >
            {t('lang.en')}
          </button>
          <button
            className={lang === 'zh' ? 'active' : ''}
            onClick={() => changeLang('zh')}
          >
            {t('lang.zh')}
          </button>
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
              onDelete={handleDelete}
            />
            {viewTrip && <PackingList trip={viewTrip} onUpdate={handleUpdate} />}
          </div>
        )}

        <main className="main">
          {showForm ? (
            <TripForm
              initial={editing}
              onSubmit={handleSubmitForm}
              onCancel={() => {
                setShowForm(false)
                setEditing(null)
              }}
            />
          ) : viewTrip ? (
            <>
              <div className="itinerary-toolbar">
                <ExportPanel trip={viewTrip} />
              </div>
              <div className="detail-grid">
                <Itinerary trip={viewTrip} onUpdate={handleUpdate} />
                <aside className="detail-side">
                  <FlightsPanel trip={viewTrip} onUpdate={handleUpdate} />
                  <LodgingPanel trip={viewTrip} onUpdate={handleUpdate} />
                  <BudgetPanel trip={viewTrip} />
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

      {/* Hidden render root used by PDF export */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {viewTrip && <PdfView trip={viewTrip} />}
      </div>
    </div>
  )
}
