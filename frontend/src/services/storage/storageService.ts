import { indexedDBService } from "./indexedDB";
import type { StorageService, StoredDocument, DocumentSummary } from "./types";

function getService(): StorageService {
  if (typeof indexedDB !== "undefined") return indexedDBService;
  throw new Error("No supported storage engine found");
}

const service = getService();

export async function saveDocument(doc: StoredDocument): Promise<void> {
  return service.saveDocument({ ...doc, created_at: doc.created_at ?? new Date().toISOString() });
}

export async function getDocument(job_id: string): Promise<StoredDocument | null> {
  return service.getDocument(job_id);
}

export async function getAllDocuments(): Promise<StoredDocument[]> {
  return service.getAllDocuments();
}

export async function deleteDocument(job_id: string): Promise<void> {
  return service.deleteDocument(job_id);
}

export async function clearAllDocuments(): Promise<void> {
  return service.clear();
}

export async function getDocumentSummaries(): Promise<DocumentSummary[]> {
  const docs = await service.getAllDocuments();
  return docs.map((d) => ({
    job_id:         d.job_id,
    fairness_score: d.fairness_score,
    created_at:     d.created_at,
    make:           d.vin?.make,
    model:          d.vin?.model,
    year:           d.vin?.year,
  }));
}

export async function documentExists(job_id: string): Promise<boolean> {
  return (await service.getDocument(job_id)) !== null;
}

export type { StoredDocument, DocumentSummary, StorageService } from "./types";
