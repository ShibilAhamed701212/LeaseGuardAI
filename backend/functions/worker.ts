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

async function downloadFileBuffer(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} failed to fetch file`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err: any) {
    logger.error("File download failed", { url, error: err.message });
    throw new Error(`Download failed: ${err.message}`);
  }
}

/** 
 * OCR Extract: Uses Gemini 1.5 Flash to extract raw text if the native PDF layer is missing 
 * or if the file is an image.
 */
async function extractTextWithGoogleCloud(buffer: Buffer, mimeType: string, config?: AiConfig): Promise<string> {
  const apiKey = config?.apiKey || DEFAULT_GEMINI_KEY;
  if (!apiKey) throw new Error("Google Cloud OCR requires a Gemini API Key");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    model: config?.modelName || "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const prompt = `Extract structured SLA data from this lease contract. 
Return ONLY valid JSON with keys: {apr, monthly_payment, term, residual_value, mileage_limit, penalties}. 
Ensure numerics are numbers where possible, penalties can be strings.`;

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
    const fileBuffer = await downloadFileBuffer(job.file_url);
    const isPdf = job.file_url.toLowerCase().includes(".pdf?");
    const mimeType = isPdf ? "application/pdf" : "image/jpeg";

    let sla = null;

    if (job.ai === "gemini") {
      // Gemini 1.5 natively supports multimodal OCR + extraction!
      sla = await processGemini(fileBuffer, mimeType, job.config);
    } else {
      // Require Text extraction for Ollama or Custom OpenAI
      let text = await extractTextWithPdfParse(fileBuffer, mimeType, job.config);

      if (job.ai === "ollama") {
        sla = await processOllama(text, job.config);
      } else if (job.ai === "custom") {
        sla = await processCustomOpenAi(text, job.config);
      } else {
        throw new Error(`Unsupported AI Model: ${job.ai}`);
      }
    }

    // Fairness & Price logic
    const residuals = sla.residual_value || 0;
    const monthly = sla.monthly_payment || 0;
    const term = sla.term || 36;
    const market_value = Math.round(residuals + (monthly * term * 0.6)) || 25000;
    
    let aprScore = 50;
    if (sla.apr !== null) {
      if (sla.apr <= 3) aprScore = 100;
      else if (sla.apr <= 6) aprScore = 80;
      else if (sla.apr <= 10) aprScore = 40;
      else aprScore = 10;
    }

    const dp = (sla.apr !== null ? 1 : 0) + (sla.monthly_payment !== null ? 1 : 0) + (sla.residual_value !== null ? 1 : 0) + (sla.term !== null ? 1 : 0);
    const confidence = Math.round((dp / 4) * 100);
    const price_estimate = { market_value, confidence };
    const fairness_score = Math.max(10, Math.min(100, Math.round((aprScore + confidence) / 2)));

    const negotiation_tips = [];
    if (sla.apr && sla.apr > 6) negotiation_tips.push("Your APR is quite high. Consider bringing your own bank pre-approval.");
    if (sla.mileage_limit && sla.mileage_limit < 12000) negotiation_tips.push("Mileage limit is restrictive. Watch out for overage fees.");
    if (negotiation_tips.length === 0) negotiation_tips.push("Contract looks standard. Make sure you verified the residual carefully.");

    const resultPayload = {
      sla,
      vin: null,
      price_estimate,
      fairness_score,
      negotiation_tips
    };

    await storeResult(job.job_id, resultPayload);
    await setJobStatus(job.job_id, "completed").catch(() => null);
    await updatePgStatus(job.job_id, "completed").catch(() => null);
    
    logger.info(`Worker completed job: ${job.job_id}`);
  } catch (err: any) {
    logger.error(`Worker failed job: ${job.job_id}`, { message: err.message });
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

