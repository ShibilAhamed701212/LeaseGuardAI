import type{ResultPayload}from'../../services/api'
import{formatCurrency,clamp}from'../../utils/helpers'
import styles from'./ResultCard.module.css'
export function ResultCard({result}:{result:ResultPayload}){
  const{sla,vin,price_estimate,fairness_score,negotiation_tips}=result
  const score=fairness_score!==null?clamp(fairness_score,0,100):null
  const c=score===null?'':score>=70?'var(--success)':score>=40?'var(--warning)':'var(--danger)'
  return(
    <div className={styles.wrapper}>
      <section className={styles.card}>
        <h3 className={styles.sec}>Contract SLA</h3>
        <dl className={styles.grid}>
          {([['APR',sla.apr!==null?sla.apr+'%':null],['Monthly Payment',sla.monthly_payment!==null?formatCurrency(sla.monthly_payment):null],['Term',sla.term!==null?sla.term+' months':null],['Residual Value',sla.residual_value!==null?formatCurrency(sla.residual_value):null],['Mileage Limit',sla.mileage_limit!==null?sla.mileage_limit.toLocaleString()+' mi':null],['Penalties',sla.penalties]]as[string,string|null][]).map(([k,v])=>(
            <div key={k} className={styles.field}><dt>{k}</dt><dd>{v??<span className={styles.na}>-</span>}</dd></div>
          ))}
        </dl>
      </section>
      {vin&&<section className={styles.card}><h3 className={styles.sec}>Vehicle Info</h3><dl className={styles.grid}><div className={styles.field}><dt>VIN</dt><dd className={styles.mono}>{vin.vin}</dd></div><div className={styles.field}><dt>Make</dt><dd>{vin.make}</dd></div><div className={styles.field}><dt>Model</dt><dd>{vin.model}</dd></div><div className={styles.field}><dt>Year</dt><dd>{vin.year}</dd></div></dl></section>}
      {price_estimate&&<section className={styles.card}><h3 className={styles.sec}>Price Estimate</h3><p className={styles.bigNum}>{formatCurrency(price_estimate.market_value)}</p><div className={styles.conf}><span className={styles.confLbl}>Confidence</span><div className={styles.confBar}><div className={styles.confFill} style={{width:price_estimate.confidence+'%'}}/></div><span className={styles.confPct}>{price_estimate.confidence}%</span></div></section>}
      {score!==null&&<section className={styles.card}><h3 className={styles.sec}>Fairness Score</h3><div className={styles.scoreLine}><div className={styles.track}><div className={styles.fill} style={{width:score+'%',background:c}}/></div><span className={styles.scoreNum}>{score}<span className={styles.scoreOf}>/100</span></span></div><p className={styles.scoreHint} style={{color:c}}>{score>=70?'This contract appears fair.':score>=40?'Some clauses may need negotiation.':'This contract has unfavourable terms.'}</p></section>}
      {negotiation_tips.length>0&&<section className={styles.card}><h3 className={styles.sec}>Negotiation Tips</h3><ul className={styles.tips}>{negotiation_tips.map((t,i)=><li key={i} className={styles.tip}>{t}</li>)}</ul></section>}
    </div>
  )
}