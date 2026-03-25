import{useState,useCallback}from'react'
import{getResult,cleanup,type ResultPayload}from'../services/api'
import{saveDocument}from'../services/storage'
import type{StoredDocument}from'../services/storage/types'
import{friendlyError}from'../utils/helpers'
export function useResult(){
  const[result,setResult]=useState<ResultPayload|null>(null)
  const[loading,setLoading]=useState(false)
  const[error,setError]=useState<string|null>(null)
  const fetch=useCallback(async(job_id:string):Promise<ResultPayload|null>=>{
    setLoading(true);setError(null)
    try{
      const data=await getResult(job_id)
      const doc:StoredDocument={job_id:data.job_id,sla:data.sla,vin:data.vin?{vin:data.vin.vin,make:data.vin.make,model:data.vin.model,year:data.vin.year}:null,price_estimate:data.price_estimate?{market_value:data.price_estimate.market_value,confidence:data.price_estimate.confidence}:null,fairness_score:data.fairness_score,negotiation_tips:data.negotiation_tips,created_at:new Date().toISOString()}
      await saveDocument(doc)
      setResult(data);return data
    }catch(err){setError(friendlyError(err));return null}
    finally{setLoading(false)}
  },[])
  return{fetch,result,loading,error}
}