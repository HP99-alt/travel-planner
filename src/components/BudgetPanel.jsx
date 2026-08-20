import { useI18n } from '../i18n/LanguageContext.jsx'
import { computeBudget } from '../budget.js'

export default function BudgetPanel({ trip }) {
  const { t } = useI18n()
  const b = computeBudget(trip)

  return (
    <div className="panel budget-panel">
      <div className="panel-head">
        <h3>💰 {t('budget.title')}</h3>
      </div>

      {!b.hasCost ? (
        <p className="empty-hint">{t('budget.noCost')}</p>
      ) : (
        <>
          <div className="budget-totals">
            <div className="budget-big">
              <span className="budget-label">{t('budget.total')}</span>
              <span className="budget-value">
                {b.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="budget-sub">
              {t('budget.perDay')}:{' '}
              {b.perDay.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="budget-by-cur">
            <div className="budget-by-cur-head">{t('budget.byCurrency')}</div>
            {Object.entries(b.totalByCurrency).map(([code, val]) => (
              <div className="budget-row" key={code}>
                <span>{code}</span>
                <span>{val.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
          <p className="budget-note">* {t('budget.byCurrency')} — {t('budget.total')} = Σ</p>
        </>
      )}
    </div>
  )
}
