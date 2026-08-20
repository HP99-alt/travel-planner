import { useState } from 'react'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { createId } from '../storage.js'

const DEFAULT_ITEMS = {
  en: ['Passport', 'ID card', 'Wallet', 'Phone charger', 'Power bank', 'Headphones', 'Toiletries', 'Medications', 'Umbrella', 'Clothes'],
  zh: ['护照', '身份证', '钱包', '手机充电器', '充电宝', '耳机', '洗漱用品', '常用药', '雨伞', '衣物'],
}

export default function PackingList({ trip, onUpdate }) {
  const { t, lang } = useI18n()
  const [text, setText] = useState('')
  const items = trip.packing || []

  function add(label) {
    const v = (label ?? text).trim()
    if (!v) return
    onUpdate({ ...trip, packing: [...items, { id: createId(), label: v, done: false }] })
    setText('')
  }

  function toggle(id) {
    onUpdate({
      ...trip,
      packing: items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
    })
  }

  function remove(id) {
    onUpdate({ ...trip, packing: items.filter((it) => it.id !== id) })
  }

  function addDefaults() {
    const defs = DEFAULT_ITEMS[lang] || DEFAULT_ITEMS.en
    const existing = new Set(items.map((it) => it.label))
    const toAdd = defs.filter((d) => !existing.has(d)).map((d) => ({
      id: createId(),
      label: d,
      done: false,
    }))
    onUpdate({ ...trip, packing: [...items, ...toAdd] })
  }

  function clearChecked() {
    onUpdate({ ...trip, packing: items.filter((it) => !it.done) })
  }

  const doneCount = items.filter((it) => it.done).length

  return (
    <div className="packing">
      <div className="packing-head">
        <h3>🎒 {t('pack.title')}</h3>
        {items.length > 0 && (
          <span className="packing-count">
            {doneCount}/{items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="empty-hint">{t('pack.empty')}</p>
      ) : (
        <ul className="packing-items">
          {items.map((it) => (
            <li key={it.id} className={it.done ? 'done' : ''}>
              <label>
                <input type="checkbox" checked={it.done} onChange={() => toggle(it.id)} />
                <span>{it.label}</span>
              </label>
              <button
                className="pack-x"
                onClick={() => remove(it.id)}
                aria-label="remove"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="packing-add">
        <input
          type="text"
          value={text}
          placeholder={t('pack.placeholder')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
        />
        <button className="btn ghost tiny" onClick={() => add()}>
          + {t('pack.add')}
        </button>
      </div>
      <div className="packing-actions">
        <button className="btn ghost tiny" onClick={addDefaults}>
          {t('pack.addDefault')}
        </button>
        {doneCount > 0 && (
          <button className="btn ghost tiny" onClick={clearChecked}>
            {t('pack.clear')}
          </button>
        )}
      </div>
    </div>
  )
}
