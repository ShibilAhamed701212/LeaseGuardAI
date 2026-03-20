// mobile/storage/sqlite.ts — SQLite (React Native / Capacitor)

import type { StorageService, StoredDocument } from "../../services/storage/types";

const TABLE = "documents";

interface SQLitePlugin {
  openDatabase(cfg: { name: string; location: string }): SQLiteDB;
}
interface SQLiteDB {
  transaction(fn: (tx: SQLiteTx) => void, onErr?: (e: Error) => void, onOk?: () => void): void;
}
interface SQLiteTx {
  executeSql(sql: string, params?: unknown[], onOk?: (tx: SQLiteTx, r: SQLiteResult) => void, onErr?: (tx: SQLiteTx, e: Error) => boolean): void;
}
interface SQLiteResult { rows: { length: number; item(i: number): Record<string, unknown>; }; }

function openDB(): SQLiteDB {
  const b = (window as unknown as { SQLite?: SQLitePlugin }).SQLite;
  if (!b) throw new Error("SQLite bridge not available");
  return b.openDatabase({ name: "ocr_agent.db", location: "default" });
}

function execSQL(sql: string, params: unknown[] = []): Promise<SQLiteResult> {
  return new Promise((resolve, reject) => {
    openDB().transaction(
      (tx) => tx.executeSql(sql, params, (_tx, r) => resolve(r), (_tx, e) => { reject(e); return false; }),
      (e) => reject(e)
    );
  });
}

async function migrate(): Promise<void> {
  await execSQL(`CREATE TABLE IF NOT EXISTS ${TABLE} (job_id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TEXT NOT NULL)`);
  await execSQL(`CREATE INDEX IF NOT EXISTS idx_created ON ${TABLE}(created_at)`);
}

async function saveDocument(doc: StoredDocument): Promise<void> {
  await migrate();
  await execSQL(`INSERT OR REPLACE INTO ${TABLE} (job_id,data,created_at) VALUES (?,?,?)`,
    [doc.job_id, JSON.stringify(doc), doc.created_at ?? new Date().toISOString()]);
}

async function getDocument(job_id: string): Promise<StoredDocument | null> {
  await migrate();
  const r = await execSQL(`SELECT data FROM ${TABLE} WHERE job_id=?`, [job_id]);
  if (r.rows.length === 0) return null;
  try { return JSON.parse(r.rows.item(0)["data"] as string) as StoredDocument; }
  catch { return null; }
}

async function getAllDocuments(): Promise<StoredDocument[]> {
  await migrate();
  const r = await execSQL(`SELECT data FROM ${TABLE} ORDER BY created_at DESC`);
  const docs: StoredDocument[] = [];
  for (let i = 0; i < r.rows.length; i++) {
    try { docs.push(JSON.parse(r.rows.item(i)["data"] as string) as StoredDocument); }
    catch { /* skip corrupted rows */ }
  }
  return docs;
}

async function deleteDocument(job_id: string): Promise<void> {
  await migrate();
  await execSQL(`DELETE FROM ${TABLE} WHERE job_id=?`, [job_id]);
}

async function clear(): Promise<void> {
  await migrate();
  await execSQL(`DELETE FROM ${TABLE}`);
}

export const sqliteService: StorageService = {
  saveDocument, getDocument, getAllDocuments, deleteDocument, clear,
};