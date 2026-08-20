import { useI18n } from '../i18n/LanguageContext.jsx'
import { computeBudget } from '../budget.js'

export default function BudgetPanel({ trip }) {
  const { t } = useI18n()
  const b = computeBudget(trip)

  const fmt = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })

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
              <span className="budget-label">{t('budget.totalMYR')}</span>
              <span className="budget-value">RM {fmt(b.totalMYR)}</span>
            </div>
            <div className="budget-sub">
              {t('budget.perDayMYR')}: RM {fmt(b.perDayMYR)}
            </div>
          </div>

          <div className="budget-by-cur">
            <div className="budget-by-cur-head">{t('budget.byCurrency')}</div>
            {Object.entries(b.totalByCurrency).map(([code, val]) => (
              <div className="budget-row" key={code}>
                <span>{code}</span>
                <span>{fmt(val)}</span>
              </div>
            ))}
          </div>
          <p className="budget-note">* {t('budget.rateNote')}</p>
        </>
      )}
    </div>
  )
}
