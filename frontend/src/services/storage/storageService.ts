import{indexedDBService}from'./indexedDB'
import type{StorageService,StoredDocument,DocumentSummary}from'./types'
const svc: StorageService = typeof indexedDB !== 'undefined'
  ? indexedDBService
  : ({
    saveDocument:    async () => { throw new Error('no storage') },
    getDocument:     async () => { throw new Error('no storage') },
    getAllDocuments: async () => { throw new Error('no storage') },
    deleteDocument:  async () => { throw new Error('no storage') },
    clear:           async () => { throw new Error('no storage') },
  } as any);
export async function saveDocument(doc:StoredDocument){return svc.saveDocument({...doc,created_at:doc.created_at??new Date().toISOString()})}
export async function getDocument(id:string){return svc.getDocument(id)}
export async function getAllDocuments(){return svc.getAllDocuments()}
export async function deleteDocument(id:string){return svc.deleteDocument(id)}
export async function clearAllDocuments(){return svc.clear()}
export async function getDocumentSummaries():Promise<DocumentSummary[]>{return(await svc.getAllDocuments()).map(d=>({job_id:d.job_id,fairness_score:d.fairness_score,created_at:d.created_at,make:d.vin?.make,model:d.vin?.model,year:d.vin?.year}))}
export async function documentExists(id:string):Promise<boolean>{return(await svc.getDocument(id))!==null}
export type{StoredDocument,DocumentSummary,StorageService}from'./types'