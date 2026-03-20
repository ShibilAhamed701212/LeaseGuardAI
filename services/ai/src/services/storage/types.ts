// services/storage/types.ts — storage type definitions

export interface StoredSla {
  apr:             number | null;
  monthly_payment: number | null;
  term:            number | null;
  residual_value:  number | null;
  mileage_limit:   number | null;
  penalties:       string | null;
}

export interface StoredVin {
  vin:   string;
  make:  string;
  model: string;
  year:  number;
}

export interface StoredPriceEstimate {
  market_value: number;
  confidence:   number;
}

export interface StoredDocument {
  job_id:           string;
  sla:              StoredSla;
  vin:              StoredVin | null;
  price_estimate:   StoredPriceEstimate | null;
  fairness_score:   number | null;
  negotiation_tips: string[];
  created_at:       string;
}

export interface DocumentSummary {
  job_id:         string;
  fairness_score: number | null;
  created_at:     string;
  make?:          string;
  model?:         string;
  year?:          number;
}

export interface StorageService {
  saveDocument:   (doc: StoredDocument)  => Promise<void>;
  getDocument:    (job_id: string)       => Promise<StoredDocument | null>;
  getAllDocuments: ()                     => Promise<StoredDocument[]>;
  deleteDocument: (job_id: string)       => Promise<void>;
  clear:          ()                     => Promise<void>;
}