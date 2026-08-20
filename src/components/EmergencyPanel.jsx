import { useState } from 'react'
import { useI18n } from '../i18n/LanguageContext.jsx'
import CopyButton from './CopyButton.jsx'

const DEFAULTS = {
  passport: '',
  visa: '',
  insurance: '',
  contactName: '',
  contactPhone: '',
  localEmergency: '999',
  embassy: '',
}

export default function EmergencyPanel({ trip, onUpdate }) {
  const { t } = useI18n()
  const data = { ...DEFAULTS, ...(trip.emergency || {}) }

  function set(field, value) {
    onUpdate({ ...trip, emergency: { ...data, [field]: value } })
  }

  const fields = [
    { key: 'passport', label: t('emergency.passport'), copy: true },
    { key: 'visa', label: t('emergency.visa'), copy: true },
    { key: 'insurance', label: t('emergency.insurance'), copy: true },
    { key: 'contactName', label: t('emergency.contactName'), copy: false },
    { key: 'contactPhone', label: t('emergency.contactPhone'), copy: true },
    { key: 'localEmergency', label: t('emergency.localEmergency'), copy: true },
    { key: 'embassy', label: t('emergency.embassy'), copy: true },
  ]

  return (
    <div className="panel emergency-panel">
      <div className="panel-head">
        <h3>🛟 {t('emergency.title')}</h3>
      </div>
      <p className="emergency-hint">{t('emergency.hint')}</p>
      <div className="emergency-list">
        {fields.map((f) => (
          <div className="emergency-row" key={f.key}>
            <div className="emergency-field">
              <span className="emergency-label">{f.label}</span>
              <input
                type="text"
                value={data[f.key]}
                placeholder={t('emergency.tapToFill')}
                onChange={(e) => set(f.key, e.target.value)}
              />
            </div>
            {f.copy && data[f.key] && <CopyButton value={data[f.key]} />}
          </div>
        ))}
      </div>
    </div>
  )
}
