import { useState } from 'react'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { computeBudget, CURRENCIES, BUDGET_GROUPS } from '../budget.js'

const fmt = (n) => Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 })

export default function BudgetPanel({ trip, onUpdate }) {
  const { t } = useI18n()
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('MYR')
  const [group, setGroup] = useState('other')

  const b = computeBudget(trip)
  const extra = trip.extraCosts || []

  function addExtra() {
    if (!label.trim() || amount === '') return
    onUpdate({
      ...trip,
      extraCosts: [
        ...extra,
        { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), label: label.trim(), amount: Number(amount), currency, group },
      ],
    })
    setLabel('')
    setAmount('')
    setAdding(false)
  }

  function removeExtra(id) {
    onUpdate({ ...trip, extraCosts: extra.filter((e) => e.id !== id) })
  }

  const groups = Object.keys(BUDGET_GROUPS)

  return (
    <div className="panel budget-panel">
      <div className="panel-head">
        <h3>💰 {t('budget.title')}</h3>
        {!adding && (
          <button className="btn ghost small" onClick={() => setAdding(true)}>
            + {t('budget.addCost')}
          </button>
        )}
      </div>

      {!b.hasCost && extra.length === 0 ? (
        <p className="empty-hint">{t('budget.noCost')}</p>
      ) : (
        <>
          <div className="budget-totals">
            <div className="budget-big">
              <span className="budget-label">{t('budget.totalEstMYR')}</span>
              <span className="budget-value">RM {fmt(b.estMYR)}</span>
            </div>
            <div className="budget-line">
              <span>{t('budget.totalActMYR')}</span>
              <span>RM {fmt(b.actMYR)}</span>
            </div>
            <div className="budget-line">
              <span>{t('budget.remainingMYR')}</span>
              <span>RM {fmt(b.remainingMYR)}</span>
            </div>
          </div>

          <div className="budget-groups">
            <div className="budget-by-cur-head">{t('budget.byCategory')}</div>
            {groups.map((g) => {
              const est = b.byGroupEst[g] || 0
              const act = b.byGroupAct[g] || 0
              if (est === 0 && act === 0) return null
              return (
                <div className="budget-row" key={g}>
                  <span>{t(BUDGET_GROUPS[g])}</span>
                  <span>
                    {est ? `RM ${fmt(est)}` : '—'}
                    {act ? ` · ${t('budget.actual')} RM ${fmt(act)}` : ''}
                  </span>
                </div>
              )
            })}
          </div>

          {Object.keys(b.estByCurrency).length > 0 && (
            <div className="budget-by-cur">
              <div className="budget-by-cur-head">{t('budget.byCurrency')}</div>
              {Object.entries(b.estByCurrency).map(([code, val]) => (
                <div className="budget-row" key={code}>
                  <span>{code}</span>
                  <span>{fmt(val)}</span>
                </div>
              ))}
            </div>
          )}

          {extra.length > 0 && (
            <div className="budget-extra">
              <div className="budget-by-cur-head">{t('budget.standalone')}</div>
              {extra.map((e) => (
                <div className="budget-row" key={e.id}>
                  <span>
                    {e.label}
                    <button className="custom-x mini" onClick={() => removeExtra(e.id)} aria-label="delete">×</button>
                  </span>
                  <span>
                    {e.amount} {e.currency}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="budget-note">* {t('budget.rateNote')}</p>
        </>
      )}

      {adding && (
        <div className="budget-add">
          <input type="text" placeholder={t('activity.titlePlaceholder')} value={label} onChange={(e) => setLabel(e.target.value)} />
          <div className="af-row">
            <input type="number" min="0" step="0.01" placeholder={t('budget.amount')} value={amount} onChange={(e) => setAmount(e.target.value)} />
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            {groups.map((g) => (
              <option key={g} value={g}>{t(BUDGET_GROUPS[g])}</option>
            ))}
          </select>
          <div className="form-actions">
            <button className="btn ghost small" onClick={() => setAdding(false)}>{t('form.cancel')}</button>
            <button className="btn primary small" onClick={addExtra}>{t('activity.add')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
