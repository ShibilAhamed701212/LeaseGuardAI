// worker.ts — Standalone AI/OCR Queue Processor
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdfParse from "pdf-parse";
import { getClient, storeResult, setJobStatus } from "./utils/redisClient";
import { updateJobStatus as updatePgStatus } from "./utils/postgresClient";
import { logger } from "./utils/logger";

const POLL_INTERVAL = 3000;
const redis = getClient();

interface AiConfig {
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
}

interface WorkerJob {
  job_id:   string;
  file_url: string;
  ocr:      string;
  ai:       string;
  config?:  AiConfig;
}

const DEFAULT_GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const DEFAULT_OLLAMA_URL = process.env.OLLAMA_HOST ? `http://${process.env.OLLAMA_HOST}:11434` : "http://localhost:11434";

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function downloadFileBuffer(url: string, retries = 3): Promise<Buffer> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err: any) {
      if (i === retries - 1) {
        logger.error("File download failed permanently", { url, error: err.message });
        throw new Error(`Download failed: ${err.message}`);
      }
      logger.warn(`Download retry ${i + 1}/${retries}`, { error: err.message });
      await sleep(1000 * (i + 1));
    }
  }
  throw new Error("Download failed");
}

/** 
 * OCR Extract: Uses Gemini 1.5 Flash to extract raw text if the native PDF layer is missing 
 * or if the file is an image.
 */
async function extractTextWithGoogleCloud(buffer: Buffer, mimeType: string, config?: AiConfig): Promise<string> {
  const apiKey = config?.apiKey || DEFAULT_GEMINI_KEY;
  if (!apiKey) throw new Error("Google Cloud OCR requires a Gemini API Key");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const inlineData = {
    data: buffer.toString("base64"),
    mimeType: mimeType === "application/pdf" ? "application/pdf" : mimeType.startsWith("image/") ? mimeType : "image/jpeg"
  };

  try {
    const result = await model.generateContent([
      { text: "Extract all text from this document accurately. Do not add comments." },
      { inlineData }
    ]);
    return result.response.text() || "No text found via Google Cloud OCR.";
  } catch (err: any) {
    logger.error("Google Cloud OCR fetch failed", { error: err.message });
    throw new Error(`Google OCR failed: ${err.message}`);
  }
}

async function extractTextWithPdfParse(buffer: Buffer, mimeType: string, config?: AiConfig): Promise<string> {
  try {
    if (mimeType === "application/pdf") {
      // @ts-ignore
      const data = await pdfParse(buffer);
      let text = data.text?.trim();
      if (text && text.length > 100) return text;
    }
    
    // Fallback to Gemini OCR for images or scanned PDFs
    logger.info("Falling back to Google Cloud OCR for deep scan");
    return await extractTextWithGoogleCloud(buffer, mimeType, config);
  } catch (err: any) {
    logger.warn("Document parsing failure, using Google Cloud fallback", { err: err.message });
    return await extractTextWithGoogleCloud(buffer, mimeType, config);
  }
}

async function processOllama(text: string, config?: AiConfig): Promise<any> {
  const baseUrl = config?.baseUrl || DEFAULT_OLLAMA_URL;
  const model = config?.modelName || "llama3.2"; // smallest model default
  
  const prompt = `Extract structured SLA data from this lease contract. 
Return ONLY valid JSON with keys: {apr, monthly_payment, term, residual_value, mileage_limit, penalties}. 
No markdown. No explanation. Data:\n\n${text}`;

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        prompt,
      }),
    });

    if (!response.ok) throw new Error(`Ollama API error: ${response.status}`);
    const data: any = await response.json();
    const rawResponse = data.response || "";
    return parseJsonResponse(rawResponse);
  } catch (err: any) {
    logger.error("Ollama fetch failed", { baseUrl, error: err.message });
    throw new Error(`Ollama failed: ${err.message}`);
  }
}

async function processGemini(buffer: Buffer, mimeType: string, config?: AiConfig): Promise<any> {
  const apiKey = config?.apiKey || DEFAULT_GEMINI_KEY;
  if (!apiKey) throw new Error("Gemini API key is required but missing");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: config?.modelName || "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const prompt = `You are a vehicle lease agreement expert. Extract structured data from this contract.
RULES:
1. Detect currency: ₹=INR, $=USD. Default to INR if ₹ or "Lakh" is found.
2. Term math: Calculate duration strictly from start/end dates (e.g. 2024 to 2028 is 48 months).
3. Extract financial values exactly. If missing, return null.
4. Identifies Risks: GAP liability, 3x monthly residual risk, early termination penalties.

STRICT JSON FORMAT:
{
  "currency": "INR",
  "monthly_payment": number,
  "security_deposit": number,
  "term_months": number,
  "apr": number or null,
  "residual_value": number or null,
  "mileage_limit": number or null,
  "penalties": "raw string of penalty keywords",
  "risks": {
    "gap_liability": boolean,
    "early_termination_penalty": boolean,
    "residual_risk_3x": boolean
  },
  "fairness_explanation": "short reasoning"
}`;

  const inlineData = {
    data: buffer.toString("base64"),
    mimeType: mimeType === "application/pdf" ? "application/pdf" : mimeType.startsWith("image/") ? mimeType : "image/jpeg"
  };

  try {
    const response = await model.generateContent([
      { text: prompt },
      { inlineData }
    ]);

    const text = response.response.text();
    if (!text) throw new Error("Empty response from Gemini");
    return parseJsonResponse(text);
  } catch (err: any) {
    logger.error("Gemini AI fetch failed", { error: err.message });
    throw new Error(`Gemini AI failed: ${err.message}`);
  }
}

async function processCustomOpenAi(text: string, config?: AiConfig): Promise<any> {
  if (!config?.baseUrl || !config?.apiKey) {
    throw new Error("Custom Custom Node requires Base URL and API Key");
  }
  const model = config.modelName || "gpt-3.5-turbo";

  const prompt = `Extract structured SLA data from this lease contract. Return ONLY raw JSON: {"apr": null, "monthly_payment": null, "term": null, "residual_value": null, "mileage_limit": null, "penalties": null}. No markdown.\n\n${text}`;

  const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [{ role: "user", content: prompt }]
    }),
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} - ${txt}`);
  }
  const data: any = await response.json();
  return parseJsonResponse(data.choices?.[0]?.message?.content || "");
}

function parseJsonResponse(text: string): any {
  let cleaned = text.replace(/\`\`\`json/gi, "").replace(/\`\`\`/g, "").replace(/\s+/g, " ").trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    logger.warn("Failed to parse AI output, returning fallback JSON", { cleaned });
    return {
      apr: null, monthly_payment: null, term: null, 
      residual_value: null, mileage_limit: null, penalties: null
    };
  }
}

// ── Background Worker Loop ───────────────────────────────────────

let isWorking = false;

async function processJob(job: WorkerJob) {
  logger.info(`Worker picked up job: ${job.job_id}`);

  try {
    await setJobStatus(job.job_id, "reading_document").catch(() => null);
    const fileBuffer = await downloadFileBuffer(job.file_url);
    const isPdf = job.file_url.toLowerCase().includes(".pdf?");
    const mimeType = isPdf ? "application/pdf" : "image/jpeg";

    let sla = null;

    if (job.ai === "gemini") {
      await setJobStatus(job.job_id, "analyzing_contract").catch(() => null);
      // Gemini 1.5 natively supports multimodal OCR + extraction!
      sla = await processGemini(fileBuffer, mimeType, job.config);
    } else {
      // Require Text extraction for Ollama or Custom OpenAI
      let text = await extractTextWithPdfParse(fileBuffer, mimeType, job.config);

      await setJobStatus(job.job_id, "analyzing_contract").catch(() => null);
      if (job.ai === "ollama") {
        sla = await processOllama(text, job.config);
      } else if (job.ai === "custom") {
        sla = await processCustomOpenAi(text, job.config);
      } else {
        throw new Error(`Unsupported AI Model: ${job.ai}`);
      }
    }

    // Rule-Based Fairness Scoring (Targeting 90%+ Accuracy)
    let score = 100;
    if (sla.risks?.gap_liability) score -= 15;
    if (sla.risks?.residual_risk_3x) score -= 20;
    if (sla.risks?.early_termination_penalty) score -= 10;
    if (sla.mileage_limit && sla.mileage_limit < 10000) score -= 10;
    
    // Bonuses
    if (sla.mileage_limit && sla.mileage_limit > 50000) score += 5; // essentially unlimited
    if (sla.security_deposit > 0) score += 5;

    const fairness_score = Math.max(10, Math.min(100, score));

    // Data Presence Confidence
    const dpFields = [sla.monthly_payment, sla.term_months, sla.security_deposit].filter(f => f !== null).length;
    const confidence = Math.round((dpFields / 3) * 100);

    const resultPayload = {
      sla: {
        ...sla,
        term: sla.term_months, // map for frontend
        penalties: sla.penalties || sla.fairness_explanation
      },
      vin: null,
      price_estimate: { 
        market_value: sla.monthly_payment ? sla.monthly_payment * (sla.term_months || 48) : null, 
        confidence,
        currency: sla.currency || "INR"
      },
      fairness_score,
      negotiation_tips: [sla.fairness_explanation || "Verify the residual clauses carefully."]
    };

    await storeResult(job.job_id, resultPayload);
    await setJobStatus(job.job_id, "completed").catch(() => null);
    await updatePgStatus(job.job_id, "completed").catch(() => null);
    
    logger.info(`Worker completed job: ${job.job_id}`);
  } catch (err: any) {
    logger.error(`Worker failed job: ${job.job_id}`, { 
      message: err.message,
      stack: err.stack?.substring(0, 200)
    });
    await setJobStatus(job.job_id, "failed").catch(() => null);
    await updatePgStatus(job.job_id, "failed").catch(() => null);
  }
}

export function startWorker() {
  logger.info("Starting Background AI Worker engine...");
  setInterval(async () => {
    if (isWorking) return;
    try {
      isWorking = true;
      const jobString = await redis.rpop("ocr:queue");
      if (jobString) {
        const job = JSON.parse(jobString) as WorkerJob;
        await processJob(job);
      }
    } catch (err: any) {
      logger.error("Queue Worker Poll Error", { error: err.message });
    } finally {
      isWorking = false;
    }
  }, POLL_INTERVAL);
}

