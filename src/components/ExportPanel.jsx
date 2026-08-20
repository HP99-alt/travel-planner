import { useState } from 'react'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { categoryIcon } from '../categories.js'
import { buildShareUrl, tripToText } from '../share.js'
import html2pdf from 'html2pdf.js'

export default function ExportPanel({ trip }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState('')

  function flash(key) {
    setCopied(key)
    setTimeout(() => setCopied(''), 1800)
  }

  async function copyText() {
    const text = tripToText(trip, categoryIcon)
    try {
      await navigator.clipboard.writeText(text)
      flash('text')
    } catch {
      flash('text')
    }
  }

  function copyLink() {
    const url = buildShareUrl([trip])
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(
        () => flash('link'),
        () => flash('link'),
      )
    } else {
      flash('link')
    }
  }

  function exportPdf() {
    const node = document.getElementById('pdf-root')
    if (!node) return
    const opt = {
      margin: 12,
      filename: `${trip.name || 'itinerary'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }
    html2pdf().set(opt).from(node).save()
  }

  return (
    <div className="export-panel">
      <button className="btn primary small" onClick={exportPdf}>
        {t('export.pdf')}
      </button>
      <button className="btn ghost small" onClick={copyText}>
        {t('export.text')}
      </button>
      <button className="btn ghost small" onClick={copyLink}>
        {t('export.link')}
      </button>
      {copied === 'link' && <span className="copy-ok">{t('export.linkCopied')}</span>}
      {copied === 'text' && <span className="copy-ok">{t('export.textCopied')}</span>}
    </div>
  )
}
