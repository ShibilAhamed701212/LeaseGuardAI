// shared/schemas/contractSchema.ts — canonical type definitions

export interface SlaData {
  apr:             number | null;
  monthly_payment: number | null;
  term:            number | null;
  residual_value:  number | null;
  mileage_limit:   number | null;
  penalties:       string | null;
}

export interface VinData {
  vin:   string;
  make:  string;
  model: string;
  year:  number;
}

export interface PriceEstimate {
  market_value: number;
  confidence:   number;
}

export interface ContractResult {
  job_id:           string;
  sla:              SlaData;
  vin:              VinData | null;
  price_estimate:   PriceEstimate | null;
  fairness_score:   number | null;
  negotiation_tips: string[];
}

export type JobStatus = "uploaded" | "processing" | "completed" | "failed" | "deleted";