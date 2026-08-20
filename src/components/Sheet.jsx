import { useEffect } from 'react'
import { useI18n } from '../i18n/LanguageContext.jsx'

// iOS-style bottom sheet: backdrop blur + slide-up card. Closes on backdrop tap
// or Escape. `open` is controlled by the parent; render nothing when closed.
export default function Sheet({ open, onClose, title, children }) {
  const { t } = useI18n()

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // Prevent background scroll while sheet is open.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grabber" />
        {title && <h2 className="sheet-title">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
