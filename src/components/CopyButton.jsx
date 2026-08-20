import { useState } from 'react'
import { useI18n } from '../i18n/LanguageContext.jsx'

// Tiny copy button: shows a clipboard glyph, copies `value`, flashes "Copied".
export default function CopyButton({ value, label }) {
  const { t } = useI18n()
  const [done, setDone] = useState(false)

  async function copy() {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      /* clipboard may be unavailable; ignore */
    }
    setDone(true)
    setTimeout(() => setDone(false), 1400)
  }

  return (
    <button
      type="button"
      className={`copy-btn ${done ? 'done' : ''}`}
      onClick={copy}
      aria-label={label || t('copy')}
      title={done ? t('copied') : t('copy')}
    >
      {done ? '✓' : '⧉'}
    </button>
  )
}
