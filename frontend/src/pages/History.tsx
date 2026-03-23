import{useState}from'react'
import{HistoryList}from'../components/history/HistoryList'
import{ResultCard}from'../components/result/ResultCard'
import{Loader}from'../components/shared/Loader'
import{getDocument}from'../services/storage'
import type{ResultPayload}from'../services/api'
import styles from'./History.module.css'
export function History(){
  const[selected,setSelected]=useState<ResultPayload|null>(null)
  const[loading,setLoading]=useState(false)
  const[error,setError]=useState<string|null>(null)
  async function handleSelect(job_id:string){
    setLoading(true);setError(null)
    try{
      const doc=await getDocument(job_id)
      if(!doc){setError('Document not found.');return}
      setSelected({job_id:doc.job_id,sla:doc.sla,vin:doc.vin??null,price_estimate:doc.price_estimate??null,fairness_score:doc.fairness_score,negotiation_tips:doc.negotiation_tips})
    }catch{setError('Failed to load.')}
    finally{setLoading(false)}
  }
  return(
    <main className="page">
      <div className={styles.header}>
        {selected?(<><button className={styles.back} onClick={()=>setSelected(null)}>Back to history</button><h1 className={styles.title}>Result Detail</h1></>):(<><h1 className={styles.title}>History</h1><p className={styles.sub}>Past analyses stored on this device.</p></>)}
      </div>
      {loading&&<Loader size="md" message="Loading..."/>}
      {!loading&&error&&<p style={{color:'var(--danger)',fontSize:'.9rem'}}>{error}</p>}
      {!loading&&!selected&&<HistoryList onSelect={handleSelect}/>}
      {!loading&&selected&&<ResultCard result={selected}/>}
    </main>
  )
}