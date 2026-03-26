import type { StoredDocument, StorageService } from "./types";

const DB_NAME    = "ocr_agent_db";
const DB_VERSION = 2;
const STORE      = "documents";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "job_id" });
        store.createIndex("created_at",    "created_at",    { unique: false });
        store.createIndex("fairness_score","fairness_score",{ unique: false });
      }
    };

    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror   = (e) => reject(new Error(
      `IndexedDB open failed: ${(e.target as IDBOpenDBRequest).error?.message}`
    ));
    req.onblocked = () => reject(new Error("IndexedDB blocked by another tab"));
  });
}

function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      const db    = await openDB();
      const tx    = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const req   = fn(store);
      req.onsuccess = (e) => resolve((e.target as IDBRequest<T>).result);
      req.onerror   = (e) => reject(new Error(`IDB op failed: ${(e.target as IDBRequest).error?.message}`));
      tx.onerror    = (e) => reject(new Error(`IDB tx failed: ${(e.target as IDBTransaction).error?.message}`));
    } catch (err) { reject(err); }
  });
}

async function saveDocument(doc: StoredDocument): Promise<void> {
  if (!doc.job_id) throw new Error("Invalid document: job_id is required");
  const record = { ...doc, created_at: doc.created_at ?? new Date().toISOString() };
  await withStore<IDBValidKey>("readwrite", (s) => s.put(record));
}

async function getDocument(job_id: string): Promise<StoredDocument | null> {
  const r = await withStore<StoredDocument | undefined>("readonly", (s) => s.get(job_id));
  return r ?? null;
}

async function getAllDocuments(): Promise<StoredDocument[]> {
  const all = await withStore<StoredDocument[]>("readonly", (s) => s.getAll());
  return [...all].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

async function deleteDocument(job_id: string): Promise<void> {
  await withStore<undefined>("readwrite", (s) => s.delete(job_id));
}

async function clear(): Promise<void> {
  await withStore<undefined>("readwrite", (s) => s.clear());
}

export const indexedDBService: StorageService = {
  saveDocument, getDocument, getAllDocuments, deleteDocument, clear,
};
