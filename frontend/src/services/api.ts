const BASE = import.meta.env.VITE_API_BASE_URL as string;

export type JobStatus = 'uploaded'|'reading_document'|'analyzing_contract'|'processing'|'completed'|'failed'|'deleted';

export interface UploadResponse {
  job_id: string;
  status: 'uploaded';
}

export interface ProcessResponse {
  job_id: string;
  status: 'processing';
}

export interface StatusResponse {
  job_id: string;
  status: JobStatus;
}

export interface SlaData {
  currency?: string | null;
  monthly_payment: number | null;
  term: number | null;
  term_months?: number | null;
  total_cost?: number | null;
  deposit?: number | null;
  mileage?: string | null;
  residual_value: string | number | null;
  gap_liability?: string | null;
  maintenance?: string | null;
  insurance?: string | null;
  taxes?: string | null;
  purchase_option?: boolean | null;
  penalties: string | string[] | null;
  financial_risk?: string | null;
  legal_risk?: string | null;
  fairness_explanation?: string | null;
  apr?: number | null;
  mileage_limit?: number | null;
}

export interface VinData {
  vin: string;
  make: string;
  model: string;
  year: number;
}

export interface PriceEstimate {
  market_value: number;
  confidence: number;
  currency?: string;
}

export interface ResultData {
  sla: SlaData;
  vin: VinData | null;
  price_estimate: PriceEstimate | null;
  fairness_score: number | null;
  negotiation_tips: string[];
}

interface RawResult {
  job_id: string;
  status: 'completed';
  data: ResultData;
}

export interface ResultPayload extends ResultData {
  job_id: string;
}

export interface CleanupResponse {
  job_id: string;
  status: 'deleted';
}

interface AiConfig {
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init
  });
  if (!r.ok) {
    throw new Error(await r.text().catch(() => `HTTP ${r.status}`));
  }
  return r.json();
}

export async function uploadFile(file: File, user_id = 'anonymous'): Promise<UploadResponse> {
  const f = new FormData();
  f.append('file', file);
  f.append('user_id', user_id);
  const r = await fetch(BASE + '/upload', { method: 'POST', body: f });
  if (!r.ok) {
    const msg = await r.text().catch(() => 'Unknown error');
    throw new Error(`Upload failed: ${msg}`);
  }
  return r.json();
}

export const processDocument = (
  job_id: string,
  ocr: string,
  ai: string,
  config?: AiConfig
) => req<ProcessResponse>('/process', {
  method: 'POST',
  body: JSON.stringify({ job_id, ocr, ai, config })
});

export const getStatus = (job_id: string) => req<StatusResponse>('/status/' + job_id);

export async function getResult(job_id: string): Promise<ResultPayload> {
  const r = await req<RawResult>('/result/' + job_id);
  return { job_id: r.job_id, ...r.data };
}

export const cleanup = (job_id: string) => req<CleanupResponse>('/cleanup/' + job_id, {
  method: 'DELETE'
});

// ── Chat API ───────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  tokens_used?: number;
}

export async function sendChatMessage(
  message: string,
  history?: ChatMessage[],
  contract_context?: Record<string, unknown> | null
): Promise<ChatResponse> {
  return req<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history, contract_context })
  });
}
