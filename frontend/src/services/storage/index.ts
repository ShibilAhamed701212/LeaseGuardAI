import type { ResultPayload } from "../api";

const DB_NAME = "ocr_agent_db";
const STORE   = "results";
const VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = (e) =>
      (e.target as IDBOpenDBRequest).result.createObjectStore(STORE, { keyPath: "job_id" });
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror   = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

export async function saveResult(result: ResultPayload): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(result);
    tx.oncomplete = () => resolve();
    tx.onerror    = (e) => reject((e.target as IDBTransaction).error);
  });
}

export async function getAllResults(): Promise<ResultPayload[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = (e) => resolve((e.target as IDBRequest<ResultPayload[]>).result);
    req.onerror   = (e) => reject((e.target as IDBRequest).error);
  });
}

export async function deleteResult(job_id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(job_id);
    tx.oncomplete = () => resolve();
    tx.onerror    = (e) => reject((e.target as IDBTransaction).error);
  });
}
