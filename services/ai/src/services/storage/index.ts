export {
  saveDocument, getDocument, getAllDocuments,
  deleteDocument, clearAllDocuments,
  getDocumentSummaries, documentExists,
} from "./storageService";

export type {
  StoredDocument, DocumentSummary, StorageService,
  StoredSla, StoredVin, StoredPriceEstimate,
} from "./types";