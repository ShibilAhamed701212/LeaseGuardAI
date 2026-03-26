import type { ResultPayload } from '../../services/api'
import { formatCurrency, clamp } from '../../utils/helpers'
import styles from './ResultCard.module.css'

export function ResultCard({ result }: { result: ResultPayload }) {
  const { sla, vin, price_estimate, fairness_score, negotiation_tips } = result
  const score = fairness_score !== null ? clamp(fairness_score, 0, 100) : null
  const c = score === null ? '' : score >= 70 ? 'var(--success)' : score >= 40 ? 'var(--warning)' : 'var(--danger)'
  
  const currency = price_estimate?.currency || sla.currency || "INR"

  // ── 1. Financial Data (Normals + New) ──────────────────────────
  const financialFields = [
    ['Monthly Payment', sla.monthly_payment ? formatCurrency(sla.monthly_payment, currency) : null],
    ['Term', sla.term ? sla.term + ' months' : null],
    ['Total Cost', sla.total_cost ? formatCurrency(sla.total_cost, currency) : null],
    ['Deposit', sla.deposit ? formatCurrency(sla.deposit, currency) : null],
    ['Mileage Plan', sla.mileage || null],
    ['Residual Rules', typeof sla.residual_value === "string" ? sla.residual_value : (sla.residual_value ? formatCurrency(sla.residual_value, currency) : null)],
  ].filter(f => f[1] !== null) as [string, string][]

  // ── 2. Responsibilities (Who pays?) ───────────────────────────
  const responsibilities = [
    ['Maintenance', sla.maintenance],
    ['Insurance', sla.insurance],
    ['Taxes', sla.taxes],
    ['GAP Liability', sla.gap_liability],
  ].filter(f => f[1] !== undefined) as [string, string][]

  return (
    <div className={styles.wrapper}>
      {/* ── Core Stats Section ── */}
      <section className={styles.card}>
        <h3 className={styles.sec}>Financial Summary</h3>
        <dl className={styles.grid}>
          {financialFields.map(([k, v]) => (
            <div key={k} className={styles.field}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
          <div className={styles.field}>
            <dt>Purchase Option</dt>
            <dd>{sla.purchase_option ? 'Available' : 'No Option'}</dd>
          </div>
        </dl>
      </section>

      {/* ── Risk & Reliability ── */}
      <section className={styles.card}>
        <div className={styles.riskHeader}>
          <h3 className={styles.sec}>Risk Assessment</h3>
          <div className={styles.riskBadges}>
             {sla.financial_risk && <span className={`${styles.badge} ${styles[sla.financial_risk.toLowerCase()]}`}>Finance: {sla.financial_risk}</span>}
             {sla.legal_risk && <span className={`${styles.badge} ${styles[sla.legal_risk.toLowerCase()]}`}>Legal: {sla.legal_risk}</span>}
          </div>
        </div>
        <dl className={styles.grid}>
          {responsibilities.map(([k, v]) => (
            <div key={k} className={styles.field}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </section>

      {/* ── Score Visualization ── */}
      {score !== null && (
        <section className={styles.card}>
          <h3 className={styles.sec}>Fairness Score</h3>
          <div className={styles.scoreLine}>
            <div className={styles.track}><div className={styles.fill} style={{ width: score + '%', background: c }} /></div>
            <span className={styles.scoreNum}>{score}<span className={styles.scoreOf}>/100</span></span>
          </div>
          <p className={styles.scoreHint} style={{ color: c }}>{sla.fairness_explanation || (score >= 70 ? 'Contract appears fair.' : 'Significant negotiation needed.')}</p>
        </section>
      )}

      {/* ── Vehicle Info (if found) ── */}
      {vin && (
        <section className={styles.card}>
          <h3 className={styles.sec}>Detected Vehicle</h3>
          <dl className={styles.grid}>
            <div className={styles.field}><dt>VIN</dt><dd className={styles.mono}>{vin.vin}</dd></div>
            <div className={styles.field}><dt>Make</dt><dd>{vin.make}</dd></div>
            <div className={styles.field}><dt>Model</dt><dd>{vin.model}</dd></div>
            <div className={styles.field}><dt>Year</dt><dd>{vin.year}</dd></div>
          </dl>
        </section>
      )}

      {/* ── Actionable Tips ── */}
      <section className={styles.card}>
        <h3 className={styles.sec}>Negotiation & Penalties</h3>
        <p className={styles.penaltiesText}>{typeof sla.penalties === "string" ? sla.penalties : (Array.isArray(sla.penalties) ? sla.penalties.join(", ") : "None detected.")}</p>
        {negotiation_tips.length > 0 && (
          <ul className={styles.tips}>
            {negotiation_tips.map((t, i) => <li key={i} className={styles.tip}>{t}</li>)}
          </ul>
        )}
      </section>
    </div>
  )
}