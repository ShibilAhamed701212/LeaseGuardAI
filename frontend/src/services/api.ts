const BASE = import.meta.env.VITE_API_BASE_URL as string;

export type JobStatus = "uploaded" | "processing" | "completed" | "failed" | "deleted";
export interface UploadResponse  { job_id: string; status: "uploaded"; }
export interface ProcessResponse { job_id: string; status: "processing"; }
export interface StatusResponse  { job_id: string; status: JobStatus; }
export interface SlaData {
  apr: number | null; monthly_payment: number | null; term: number | null;
  residual_value: number | null; mileage_limit: number | null; penalties: string | null;
}
export interface VinData { make: string; model: string; year: number; }
export interface PriceEstimate { market_value: number; confidence: number; }
export interface ResultData {
  sla: SlaData; vin: VinData | null; price_estimate: PriceEstimate | null;
  fairness_score: number | null; negotiation_tips: string[];
}
interface RawResultResponse { job_id: string; status: "completed"; data: ResultData; }
export interface ResultPayload extends ResultData { job_id: string; }
export interface CleanupResponse { job_id: string; status: "deleted"; }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  return res.json() as Promise<T>;
}
export async function uploadFile(file: File, user_id = "anonymous"): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("user_id", user_id);
  const res = await fetch(`${BASE}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error("File upload failed");
  return res.json();
}
export async function processDocument(job_id: string, ocr: string, ai: string): Promise<ProcessResponse> {
  return request<ProcessResponse>("/process", { method: "POST", body: JSON.stringify({ job_id, ocr, ai }) });
}
export async function getStatus(job_id: string): Promise<StatusResponse> {
  return request<StatusResponse>(`/status/${job_id}`);
}
export async function getResult(job_id: string): Promise<ResultPayload> {
  const raw = await request<RawResultResponse>(`/result/${job_id}`);
  return { job_id: raw.job_id, ...raw.data };
}
export async function cleanup(job_id: string): Promise<CleanupResponse> {
  return request<CleanupResponse>(`/cleanup/${job_id}`, { method: "DELETE" });
}