import type{StoredDocument,StorageService}from'./types'
const DB='ocr_agent_db',V=2,ST='documents'
function openDB():Promise<IDBDatabase>{return new Promise((res,rej)=>{const r=indexedDB.open(DB,V);r.onupgradeneeded=e=>{const db=(e.target as IDBOpenDBRequest).result;if(!db.objectStoreNames.contains(ST)){const s=db.createObjectStore(ST,{keyPath:'job_id'});s.createIndex('created_at','created_at',{unique:false})}};r.onsuccess=e=>res((e.target as IDBOpenDBRequest).result);r.onerror=e=>rej((e.target as IDBOpenDBRequest).error);r.onblocked=()=>rej(new Error('blocked'))})}
function ws<T>(mode:IDBTransactionMode,fn:(s:IDBObjectStore)=>IDBRequest<T>):Promise<T>{return new Promise(async(res,rej)=>{try{const db=await openDB();const tx=db.transaction(ST,mode);const s=tx.objectStore(ST);const r=fn(s);r.onsuccess=e=>res((e.target as IDBRequest<T>).result);r.onerror=e=>rej((e.target as IDBRequest).error)}catch(e){rej(e)}})}
async function saveDocument(doc:StoredDocument):Promise<void>{await ws<IDBValidKey>('readwrite',s=>s.put({...doc,created_at:doc.created_at??new Date().toISOString()}))}
async function getDocument(id:string):Promise<StoredDocument|null>{return(await ws<StoredDocument|undefined>('readonly',s=>s.get(id)))??null}
async function getAllDocuments():Promise<StoredDocument[]>{return[...(await ws<StoredDocument[]>('readonly',s=>s.getAll()))].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime())}
async function deleteDocument(id:string):Promise<void>{await ws<undefined>('readwrite',s=>s.delete(id))}
async function clear():Promise<void>{await ws<undefined>('readwrite',s=>s.clear())}
export const indexedDBService:StorageService={saveDocument,getDocument,getAllDocuments,deleteDocument,clear}