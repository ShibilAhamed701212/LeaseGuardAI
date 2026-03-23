const BASE=import.meta.env.VITE_API_BASE_URL as string
export type JobStatus='uploaded'|'processing'|'completed'|'failed'|'deleted'
export interface UploadResponse{job_id:string;status:'uploaded'}
export interface ProcessResponse{job_id:string;status:'processing'}
export interface StatusResponse{job_id:string;status:JobStatus}
export interface SlaData{apr:number|null;monthly_payment:number|null;term:number|null;residual_value:number|null;mileage_limit:number|null;penalties:string|null}
export interface VinData{vin:string;make:string;model:string;year:number}
export interface PriceEstimate{market_value:number;confidence:number}
export interface ResultData{sla:SlaData;vin:VinData|null;price_estimate:PriceEstimate|null;fairness_score:number|null;negotiation_tips:string[]}
interface RawResult{job_id:string;status:'completed';data:ResultData}
export interface ResultPayload extends ResultData{job_id:string}
export interface CleanupResponse{job_id:string;status:'deleted'}
async function req<T>(path:string,init?:RequestInit):Promise<T>{const r=await fetch(BASE+path,{headers:{'Content-Type':'application/json'},...init});if(!r.ok)throw new Error(await r.text().catch(()=>'HTTP '+r.status));return r.json()}
export async function uploadFile(file:File,user_id='anonymous'):Promise<UploadResponse>{const f=new FormData();f.append('file',file);f.append('user_id',user_id);const r=await fetch(BASE+'/upload',{method:'POST',body:f});if(!r.ok)throw new Error('Upload failed');return r.json()}
export const processDocument=(job_id:string,ocr:string,ai:string)=>req<ProcessResponse>('/process',{method:'POST',body:JSON.stringify({job_id,ocr,ai})})
export const getStatus=(job_id:string)=>req<StatusResponse>('/status/'+job_id)
export async function getResult(job_id:string):Promise<ResultPayload>{const r=await req<RawResult>('/result/'+job_id);return{job_id:r.job_id,...r.data}}
export const cleanup=(job_id:string)=>req<CleanupResponse>('/cleanup/'+job_id,{method:'DELETE'})