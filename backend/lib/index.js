"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// functions/index.ts
var import_express6 = __toESM(require("express"));
var import_cors = __toESM(require("cors"));

// functions/utils/logger.ts
function log(level, message, context) {
  const entry = {
    level,
    message,
    context,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  const safe = JSON.stringify(entry);
  if (level === "error") {
    console.error(safe);
  } else if (level === "warn") {
    console.warn(safe);
  } else {
    console.log(safe);
  }
}
var logger = {
  info: (msg, ctx) => log("info", msg, ctx),
  warn: (msg, ctx) => log("warn", msg, ctx),
  error: (msg, ctx) => log("error", msg, ctx),
  debug: (msg, ctx) => log("debug", msg, ctx)
};

// functions/utils/postgresClient.ts
var import_pg = require("pg");
var _pool = null;
function getPool() {
  if (_pool)
    return _pool;
  const config = {
    host: process.env.PG_HOST ?? "localhost",
    port: parseInt(process.env.PG_PORT ?? "5432", 10),
    database: process.env.PG_DATABASE ?? "ocr_agent",
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    ssl: process.env.PG_SSL === "true" ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 3e4,
    connectionTimeoutMillis: 1e4
    // 10s timeout
  };
  logger.info("Creating PG pool", { host: config.host, user: config.user, ssl: !!config.ssl });
  _pool = new import_pg.Pool(config);
  _pool.on("error", (err) => {
    logger.error("PG pool background error", { message: err.message });
  });
  return _pool;
}
var MIGRATION_SQL = `
  CREATE TABLE IF NOT EXISTS jobs (
    job_id      TEXT PRIMARY KEY,
    status      TEXT NOT NULL DEFAULT 'uploaded',
    ocr_engine  TEXT,
    ai_model    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_jobs_status     ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
`;
async function migrate() {
  logger.info("Starting DB migration...");
  const pool = getPool();
  await pool.query(MIGRATION_SQL);
  logger.info("DB migration complete");
}
async function createJob(job_id) {
  const pool = getPool();
  await pool.query(
    "INSERT INTO jobs (job_id, status, created_at, updated_at) VALUES ($1, 'uploaded', NOW(), NOW())",
    [job_id]
  );
  logger.info("Job created in DB", { job_id });
}
async function updateJobStatus(job_id, status, ocr_engine, ai_model) {
  const pool = getPool();
  await pool.query(
    `UPDATE jobs
        SET status     = $1,
            ocr_engine = COALESCE($2, ocr_engine),
            ai_model   = COALESCE($3, ai_model),
            updated_at = NOW()
      WHERE job_id = $4`,
    [status, ocr_engine ?? null, ai_model ?? null, job_id]
  );
  logger.info("Job status updated", { job_id, status });
}
async function getJob(job_id) {
  const pool = getPool();
  const r = await pool.query(
    "SELECT job_id, status, ocr_engine, ai_model, created_at, updated_at FROM jobs WHERE job_id = $1",
    [job_id]
  );
  return r.rows[0] ?? null;
}
async function getJobStatusFromDB(job_id) {
  const pool = getPool();
  const r = await pool.query(
    "SELECT status FROM jobs WHERE job_id = $1",
    [job_id]
  );
  return r.rows[0]?.status ?? null;
}
async function checkDBHealth() {
  try {
    const pool = getPool();
    await pool.query("SELECT 1");
    return true;
  } catch (err) {
    const msg = err.message || String(err);
    logger.error("DB health check failed", { error: msg });
    return msg;
  }
}

// functions/utils/redisClient.ts
var import_ioredis = __toESM(require("ioredis"));
var RESULT_TTL = parseInt(process.env.REDIS_RESULT_TTL_SECONDS ?? "86400", 10);
var _client = null;
function getClient() {
  if (_client)
    return _client;
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    logger.info("Connecting to Redis via REDIS_URL");
    _client = new import_ioredis.default(redisUrl, {
      tls: redisUrl.startsWith("rediss://") ? { rejectUnauthorized: false } : void 0,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 200, 5e3);
      },
      lazyConnect: false
    });
  } else {
    logger.info("Connecting to Redis via HOST/PORT");
    _client = new import_ioredis.default({
      host: process.env.REDIS_HOST ?? "localhost",
      port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
      username: "default",
      password: process.env.REDIS_PASSWORD || void 0,
      tls: process.env.REDIS_TLS === "true" ? { rejectUnauthorized: false } : void 0,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 200, 5e3);
      },
      reconnectOnError(err) {
        const target = err.message;
        return target.includes("READONLY") || target.includes("ECONNRESET");
      },
      lazyConnect: false
    });
  }
  _client.on("error", (err) => {
    logger.error("Redis client error", { message: err.message });
  });
  _client.on("connect", () => {
    logger.info("Redis connected");
  });
  return _client;
}
async function pushJob(job_id, payload) {
  const redis2 = getClient();
  await redis2.rpush("ocr:queue", JSON.stringify({ job_id, ...payload }));
  logger.info("Job pushed to Redis queue", { job_id });
}
async function storeResult(job_id, result) {
  const redis2 = getClient();
  const key = `ocr:result:${job_id}`;
  await redis2.set(key, JSON.stringify(result), "EX", RESULT_TTL);
  logger.info("Result stored in Redis", { job_id, ttl: RESULT_TTL });
}
async function getResult(job_id) {
  const redis2 = getClient();
  const raw = await redis2.get(`ocr:result:${job_id}`);
  if (!raw)
    return null;
  return JSON.parse(raw);
}
async function deleteJobKeys(job_id) {
  const redis2 = getClient();
  const pattern = `ocr:*:${job_id}`;
  let cursor = "0";
  let totalDeleted = 0;
  do {
    const [nextCursor, keys] = await redis2.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis2.del(...keys);
      totalDeleted += keys.length;
    }
  } while (cursor !== "0");
  if (totalDeleted > 0) {
    logger.info("Redis keys deleted", { job_id, count: totalDeleted });
  }
}
async function setJobStatus(job_id, status) {
  const redis2 = getClient();
  await redis2.set(`ocr:status:${job_id}`, status, "EX", RESULT_TTL);
}
async function getJobStatus(job_id) {
  const redis2 = getClient();
  return redis2.get(`ocr:status:${job_id}`);
}
async function closeRedis() {
  if (_client) {
    await _client.quit();
    _client = null;
    logger.info("Redis connection closed");
  }
}
async function checkRedisHealth() {
  try {
    const redis2 = getClient();
    await redis2.ping();
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Redis health check failed", { error: msg });
    return msg;
  }
}

// functions/utils/minioClient.ts
var import_client_s3 = require("@aws-sdk/client-s3");
var import_s3_request_presigner = require("@aws-sdk/s3-request-presigner");
var BUCKET = process.env.MINIO_BUCKET ?? "ocr-agent";
var EXPIRY = parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS ?? "3600", 10);
var _client2 = null;
function getClient2() {
  if (_client2)
    return _client2;
  let endpointFromEnv = process.env.MINIO_ENDPOINT ?? "";
  const protocol = process.env.MINIO_USE_SSL === "false" ? "http://" : "https://";
  let finalEndpoint = endpointFromEnv;
  if (!finalEndpoint.startsWith("http")) {
    finalEndpoint = `${protocol}${finalEndpoint}`;
  }
  logger.info("Initializing S3 client", { endpoint: finalEndpoint, bucket: BUCKET });
  _client2 = new import_client_s3.S3Client({
    endpoint: finalEndpoint,
    region: "ap-northeast-1",
    // Match your project region (was 'us-east-1' in some defaults)
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY ?? "",
      secretAccessKey: process.env.MINIO_SECRET_KEY ?? ""
    },
    forcePathStyle: true
    // Crucial for Supabase and Minio
  });
  return _client2;
}
async function ensureBucket() {
  const client = getClient2();
  try {
    await client.send(new import_client_s3.HeadBucketCommand({ Bucket: BUCKET }));
    logger.info("S3 bucket verified", { bucket: BUCKET });
  } catch (err) {
    logger.warn("S3 bucket auto-check failed, attempting creation...", { error: err.message });
    try {
      await client.send(new import_client_s3.CreateBucketCommand({ Bucket: BUCKET }));
      logger.info("S3 bucket created", { bucket: BUCKET });
    } catch (createErr) {
      logger.error("S3 bucket creation failed", { error: createErr.message });
      throw createErr;
    }
  }
}
async function uploadFile(objectName, data, mimeType, _size) {
  const client = getClient2();
  const command = new import_client_s3.PutObjectCommand({
    Bucket: BUCKET,
    Key: objectName,
    Body: data,
    ContentType: mimeType
  });
  await client.send(command);
  logger.info("File uploaded to S3", { objectName });
}
async function getSignedUrl(objectName) {
  const client = getClient2();
  const command = new import_client_s3.GetObjectCommand({
    Bucket: BUCKET,
    Key: objectName
  });
  const url = await (0, import_s3_request_presigner.getSignedUrl)(client, command, { expiresIn: EXPIRY });
  logger.info("Signed S3 URL generated", { objectName });
  return url;
}
async function deleteFile(objectName) {
  const client = getClient2();
  await client.send(new import_client_s3.DeleteObjectCommand({ Bucket: BUCKET, Key: objectName }));
  logger.info("File deleted from S3", { objectName });
}
async function checkStorageHealth() {
  try {
    const client = getClient2();
    await client.send(new import_client_s3.HeadBucketCommand({ Bucket: BUCKET }));
    return true;
  } catch (err) {
    const msg = err.message || (err.name ? `${err.name}: ${err.$metadata?.httpStatusCode || ""}` : String(err));
    return msg;
  }
}

// functions/upload/index.ts
var import_express = __toESM(require("express"));
var import_busboy = __toESM(require("busboy"));
var import_uuid = require("uuid");
var router = import_express.default.Router();
var ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
var MAX_FILE_SIZE = 20 * 1024 * 1024;
router.post("/", async (req, res) => {
  let busboy;
  try {
    busboy = (0, import_busboy.default)({
      headers: req.headers,
      limits: { fileSize: MAX_FILE_SIZE }
    });
  } catch (err) {
    logger.error("Upload rejected: Invalid content type", { message: err.message });
    res.status(400).json({ error: "Invalid content type or missing boundary." });
    return;
  }
  const uploadPromises = [];
  let userId = "";
  let fileUploaded = false;
  let fileError = "";
  let fileName = "";
  let isAborted = false;
  const job_id = (0, import_uuid.v4)();
  busboy.on("file", (_fieldname, stream, info) => {
    if (isAborted) {
      stream.resume();
      return;
    }
    const { filename, mimeType } = info;
    fileName = filename;
    stream.on("limit", () => {
      fileError = "File exceeds 20MB limit";
      isAborted = true;
      stream.resume();
    });
    if (!ALLOWED_MIME.includes(mimeType)) {
      fileError = `Invalid file type: ${mimeType}`;
      isAborted = true;
      stream.resume();
      if ("unpipe" in req)
        req.unpipe(busboy);
      busboy.removeAllListeners();
      req.resume();
      if (!res.headersSent) {
        res.status(400).json({ error: fileError });
      }
      return;
    }
    fileUploaded = true;
    const ext = filename.split(".").pop() ?? "bin";
    const objectName = `uploads/${job_id}/file.${ext}`;
    const chunks = [];
    stream.on("data", (chunk) => {
      chunks.push(chunk);
    });
    const uploadTask = new Promise((resolve, reject) => {
      stream.on("end", async () => {
        if (isAborted) {
          resolve();
          return;
        }
        try {
          const fileBuffer = Buffer.concat(chunks);
          await uploadFile(objectName, fileBuffer, mimeType);
          resolve();
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          logger.error("MinIO upload stream error", { err: errMsg, job_id });
          reject(new Error(`File upload failed: ${errMsg}`));
        }
      });
      stream.on("error", (err) => {
        reject(err);
      });
    });
    uploadPromises.push(uploadTask);
  });
  busboy.on("field", (fieldname, val) => {
    if (isAborted)
      return;
    if (fieldname === "user_id") {
      userId = val;
    }
  });
  busboy.on("finish", async () => {
    if (res.headersSent || isAborted)
      return;
    let objectName = "";
    try {
      const ext = fileName.split(".").pop() ?? "bin";
      objectName = `uploads/${job_id}/file.${ext}`;
      await Promise.all(uploadPromises);
      if (fileError) {
        throw new Error(fileError);
      }
      if (!fileUploaded || !fileName) {
        throw new Error("No file uploaded");
      }
      if (!userId || userId.trim() === "") {
        throw new Error("user_id is required");
      }
      await createJob(job_id);
      logger.info("Upload complete", { job_id });
      res.status(200).json({ job_id, status: "uploaded" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "File upload failed";
      logger.error("Upload handler error", { message });
      if (objectName && fileUploaded) {
        try {
          await deleteFile(objectName);
        } catch (delErr) {
          logger.error("Failed to cleanup orphaned MinIO object", { objectName });
        }
      }
      if (!res.headersSent) {
        const status = message.includes("user_id") || message.includes("uploaded") || message.includes("limit") || message.includes("type") ? 400 : 500;
        res.status(status).json({ error: message });
      }
    }
  });
  busboy.on("error", (err) => {
    if (isAborted)
      return;
    logger.error("Busboy error", { message: err.message });
    if (!res.headersSent) {
      res.status(500).json({ error: "File upload failed" });
    }
  });
  if (req.rawBody) {
    busboy.end(req.rawBody);
  } else {
    req.pipe(busboy);
  }
});
var upload_default = router;

// functions/status/index.ts
var import_express2 = __toESM(require("express"));
var router2 = import_express2.default.Router();
router2.get("/:job_id", async (req, res) => {
  const { job_id } = req.params;
  if (!job_id) {
    res.status(400).json({ error: "job_id is required" });
    return;
  }
  try {
    let status = await getJobStatus(job_id);
    if (!status) {
      status = await getJobStatusFromDB(job_id);
    }
    if (!status) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    logger.info("Status fetched", { job_id, status });
    res.status(200).json({ job_id, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status fetch failed";
    logger.error("Status handler error", { job_id, message });
    res.status(500).json({ error: "Status fetch failed" });
  }
});
var status_default = router2;

// functions/process/index.ts
var import_express3 = __toESM(require("express"));

// functions/utils/n8nClient.ts
var import_axios = __toESM(require("axios"));
var MAX_RETRIES = 2;
var RETRY_DELAY_MS = 1e3;
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function triggerN8nWebhook(payload) {
  const url = process.env.N8N_WEBHOOK_URL ?? "";
  const secret = process.env.N8N_SECRET ?? "";
  if (!url) {
    logger.warn("N8N_WEBHOOK_URL is not configured. Skipping webhook trigger.");
    return;
  }
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      await import_axios.default.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
          "X-N8N-Secret": secret
        },
        timeout: 1e4
      });
      logger.info("n8n webhook triggered", { job_id: payload.job_id, attempt });
      return;
    } catch (err) {
      const axErr2 = err;
      lastError = axErr2;
      const status = axErr2.response?.status;
      logger.warn("n8n webhook attempt failed", {
        job_id: payload.job_id,
        attempt,
        status,
        message: axErr2.message
      });
      if (status && status >= 400 && status < 500) {
        break;
      }
      if (attempt <= MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }
  const axErr = lastError;
  logger.error("n8n webhook failed after retries", {
    job_id: payload.job_id,
    status: axErr?.response?.status,
    message: axErr?.message
  });
  throw new Error(`n8n trigger failed: ${axErr?.message ?? "Unknown error"}`);
}

// functions/process/index.ts
var router3 = import_express3.default.Router();
var VALID_OCR = ["tesseract", "paddle"];
var VALID_AI = ["ollama", "gemini", "custom"];
router3.post("/", async (req, res) => {
  const { job_id, ocr, ai, config } = req.body;
  if (!job_id || typeof job_id !== "string") {
    res.status(400).json({ error: "job_id is required" });
    return;
  }
  if (!ocr || !VALID_OCR.includes(ocr)) {
    res.status(400).json({ error: `Invalid ocr engine. Must be one of: ${VALID_OCR.join(", ")}` });
    return;
  }
  if (!ai || !VALID_AI.includes(ai)) {
    res.status(400).json({ error: `Invalid ai model. Must be one of: ${VALID_AI.join(", ")}` });
    return;
  }
  try {
    const job = await getJob(job_id);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    if (job.status === "processing") {
      res.status(409).json({ error: "Job is already being processed" });
      return;
    }
    if (job.status === "deleted") {
      res.status(410).json({ error: "Job has been deleted" });
      return;
    }
    const extensions = ["pdf", "jpg", "jpeg", "png", "webp"];
    let file_url = "";
    for (const ext of extensions) {
      const objectName = `uploads/${job_id}/file.${ext}`;
      try {
        file_url = await getSignedUrl(objectName);
        break;
      } catch {
      }
    }
    if (!file_url) {
      res.status(404).json({ error: "Uploaded file not found in storage" });
      return;
    }
    await updateJobStatus(job_id, "processing", ocr, ai);
    await setJobStatus(job_id, "processing");
    await pushJob(job_id, { ocr, ai, file_url, config });
    await triggerN8nWebhook({ job_id, file_url, ocr, ai, config });
    logger.info("Processing triggered", { job_id, ocr, ai });
    res.status(200).json({ job_id, status: "processing" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Process trigger failed";
    logger.error("Process handler error", { job_id, message });
    await updateJobStatus(job_id, "failed").catch(() => null);
    await setJobStatus(job_id, "failed").catch(() => null);
    res.status(500).json({ error: "Processing failed. Please try again." });
  }
});
var process_default = router3;

// functions/result/index.ts
var import_express4 = __toESM(require("express"));
var router4 = import_express4.default.Router();
router4.get("/:job_id", async (req, res) => {
  const { job_id } = req.params;
  if (!job_id) {
    res.status(400).json({ error: "Result not available" });
    return;
  }
  try {
    const job = await getJob(job_id);
    if (!job) {
      res.status(404).json({ error: "Result not available" });
      return;
    }
    if (job.status === "processing" || job.status === "uploaded") {
      res.status(202).json({ error: "Result not available", status: job.status });
      return;
    }
    if (job.status === "failed") {
      res.status(422).json({ error: "Result not available" });
      return;
    }
    if (job.status === "deleted") {
      res.status(410).json({ error: "Result not available" });
      return;
    }
    const stored = await getResult(job_id);
    if (!stored) {
      res.status(404).json({ error: "Result not available" });
      return;
    }
    logger.info("Result fetched", { job_id });
    res.status(200).json({
      job_id,
      status: "completed",
      data: stored
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Result fetch failed";
    logger.error("Result handler error", { job_id, message });
    res.status(500).json({ error: "Result not available" });
  }
});
var result_default = router4;

// functions/cleanup/index.ts
var import_express5 = __toESM(require("express"));
var router5 = import_express5.default.Router();
router5.delete("/:job_id", async (req, res) => {
  const { job_id } = req.params;
  if (!job_id) {
    res.status(400).json({ error: "job_id is required" });
    return;
  }
  try {
    const job = await getJob(job_id);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    const warnings = [];
    const extensions = ["pdf", "jpg", "jpeg", "png", "webp"];
    let deleted = false;
    for (const ext of extensions) {
      try {
        await deleteFile(`uploads/${job_id}/file.${ext}`);
        deleted = true;
        break;
      } catch {
      }
    }
    if (!deleted) {
      warnings.push("MinIO file not found (may already be deleted)");
      logger.warn("MinIO file not found during cleanup", { job_id });
    }
    await deleteJobKeys(job_id).catch((err) => {
      warnings.push(`Redis cleanup partial: ${err.message}`);
      logger.warn("Redis cleanup error", { job_id, message: err.message });
    });
    await updateJobStatus(job_id, "deleted");
    logger.info("Cleanup complete", { job_id });
    res.status(200).json({
      job_id,
      status: "deleted",
      warnings: warnings.length > 0 ? warnings : void 0
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cleanup failed";
    logger.error("Cleanup handler error", { job_id, message });
    res.status(500).json({ error: "Cleanup failed" });
  }
});
var cleanup_default = router5;

// functions/worker.ts
var import_genai = require("@google/genai");
var import_pdf_parse = __toESM(require("pdf-parse"));
var import_tesseract = require("tesseract.js");
var POLL_INTERVAL = 3e3;
var redis = getClient();
var DEFAULT_GEMINI_KEY = process.env.GEMINI_API_KEY || "";
var DEFAULT_OLLAMA_URL = process.env.OLLAMA_HOST ? `http://${process.env.OLLAMA_HOST}:11434` : "http://localhost:11434";
async function downloadFileBuffer(url) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`HTTP ${response.status} failed to fetch S3 file`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
async function extractTextWithTesseract(buffer) {
  const worker = await (0, import_tesseract.createWorker)("eng");
  const { data: { text } } = await worker.recognize(buffer);
  await worker.terminate();
  return text;
}
async function extractTextWithPdfParse(buffer, ocrType) {
  try {
    const data = await (0, import_pdf_parse.default)(buffer);
    let text = data.text?.trim();
    if ((!text || text.length < 50) && ocrType === "tesseract") {
      logger.info("Empty PDF text layer, falling back to Tesseract OCR");
      return await extractTextWithTesseract(buffer);
    }
    return text || "No usable text found in document.";
  } catch (err) {
    logger.warn("Document parsing failure", { err: err.message });
    if (ocrType === "tesseract")
      return await extractTextWithTesseract(buffer);
    return "Error: Document could not be read.";
  }
}
async function processOllama(text, config) {
  const baseUrl = config?.baseUrl || DEFAULT_OLLAMA_URL;
  const model = config?.modelName || "llama3.2";
  const prompt = `Extract structured SLA data from this lease contract. 
Return ONLY valid JSON with keys: {apr, monthly_payment, term, residual_value, mileage_limit, penalties}. 
No markdown. No explanation. Data:

${text}`;
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      prompt
    })
  });
  if (!response.ok)
    throw new Error(`Ollama API error: ${response.status}`);
  const data = await response.json();
  const rawResponse = data.response || "";
  return parseJsonResponse(rawResponse);
}
async function processGemini(buffer, mimeType, config) {
  const apiKey = config?.apiKey || DEFAULT_GEMINI_KEY;
  if (!apiKey)
    throw new Error("Gemini API key is required but missing");
  const ai = new import_genai.GoogleGenAI({ apiKey });
  const model = config?.modelName || "gemini-1.5-flash";
  const prompt = `Extract structured SLA data from this lease contract. 
Return ONLY valid JSON with keys: {apr, monthly_payment, term, residual_value, mileage_limit, penalties}. 
Do not include \`\`\`json markdown blocks, just the raw JSON fields. Ensure numerics are numbers where possible, penalties can be strings.`;
  const inlineData = {
    data: buffer.toString("base64"),
    mimeType: mimeType === "application/pdf" ? "application/pdf" : mimeType.startsWith("image/") ? mimeType : "image/jpeg"
  };
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt
          },
          {
            inlineData
          }
        ]
      }
    ],
    config: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  });
  if (!response.text)
    throw new Error("Empty response from Gemini");
  return parseJsonResponse(response.text);
}
async function processCustomOpenAi(text, config) {
  if (!config?.baseUrl || !config?.apiKey) {
    throw new Error("Custom Custom Node requires Base URL and API Key");
  }
  const model = config.modelName || "gpt-3.5-turbo";
  const prompt = `Extract structured SLA data from this lease contract. Return ONLY raw JSON: {"apr": null, "monthly_payment": null, "term": null, "residual_value": null, "mileage_limit": null, "penalties": null}. No markdown.

${text}`;
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
    })
  });
  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} - ${txt}`);
  }
  const data = await response.json();
  return parseJsonResponse(data.choices?.[0]?.message?.content || "");
}
function parseJsonResponse(text) {
  let cleaned = text.replace(/\`\`\`json/gi, "").replace(/\`\`\`/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    logger.warn("Failed to parse AI output, returning fallback JSON", { cleaned });
    return {
      apr: null,
      monthly_payment: null,
      term: null,
      residual_value: null,
      mileage_limit: null,
      penalties: null
    };
  }
}
var isWorking = false;
async function processJob(job) {
  logger.info(`Worker picked up job: ${job.job_id}`);
  try {
    const fileBuffer = await downloadFileBuffer(job.file_url);
    const isPdf = job.file_url.toLowerCase().includes(".pdf?");
    const mimeType = isPdf ? "application/pdf" : "image/jpeg";
    let sla = null;
    if (job.ai === "gemini") {
      sla = await processGemini(fileBuffer, mimeType, job.config);
    } else {
      let text = await extractTextWithPdfParse(fileBuffer, job.ocr);
      if (job.ai === "ollama") {
        sla = await processOllama(text, job.config);
      } else if (job.ai === "custom") {
        sla = await processCustomOpenAi(text, job.config);
      } else {
        throw new Error(`Unsupported AI Model: ${job.ai}`);
      }
    }
    const residuals = sla.residual_value || 0;
    const monthly = sla.monthly_payment || 0;
    const term = sla.term || 36;
    const market_value = Math.round(residuals + monthly * term * 0.6) || 25e3;
    let aprScore = 50;
    if (sla.apr !== null) {
      if (sla.apr <= 3)
        aprScore = 100;
      else if (sla.apr <= 6)
        aprScore = 80;
      else if (sla.apr <= 10)
        aprScore = 40;
      else
        aprScore = 10;
    }
    const dp = (sla.apr !== null ? 1 : 0) + (sla.monthly_payment !== null ? 1 : 0) + (sla.residual_value !== null ? 1 : 0) + (sla.term !== null ? 1 : 0);
    const confidence = Math.round(dp / 4 * 100);
    const price_estimate = { market_value, confidence };
    const fairness_score = Math.max(10, Math.min(100, Math.round((aprScore + confidence) / 2)));
    const negotiation_tips = [];
    if (sla.apr && sla.apr > 6)
      negotiation_tips.push("Your APR is quite high. Consider bringing your own bank pre-approval.");
    if (sla.mileage_limit && sla.mileage_limit < 12e3)
      negotiation_tips.push("Mileage limit is restrictive. Watch out for overage fees.");
    if (negotiation_tips.length === 0)
      negotiation_tips.push("Contract looks standard. Make sure you verified the residual carefully.");
    const resultPayload = {
      sla,
      vin: null,
      // Hard to reliably extract without deep regex mapping
      price_estimate,
      fairness_score,
      negotiation_tips
    };
    await storeResult(job.job_id, resultPayload);
    await setJobStatus(job.job_id, "completed").catch(() => null);
    await updateJobStatus(job.job_id, "completed").catch(() => null);
    logger.info(`Worker completed job: ${job.job_id}`);
  } catch (err) {
    logger.error(`Worker failed job: ${job.job_id}`, { message: err.message });
    await setJobStatus(job.job_id, "failed").catch(() => null);
    await updateJobStatus(job.job_id, "failed").catch(() => null);
  }
}
function startWorker() {
  logger.info("Starting Background AI Worker engine...");
  setInterval(async () => {
    if (isWorking)
      return;
    try {
      isWorking = true;
      const jobString = await redis.rpop("ocr:queue");
      if (jobString) {
        const job = JSON.parse(jobString);
        await processJob(job);
      }
    } catch (err) {
      logger.error("Queue Worker Poll Error", { error: err.message });
    } finally {
      isWorking = false;
    }
  }, POLL_INTERVAL);
}

// functions/index.ts
var app = (0, import_express6.default)();
var port = process.env.PORT || 1e4;
app.use((0, import_cors.default)());
app.use(import_express6.default.json());
app.get("/health", async (_req, res) => {
  try {
    const [dbResult, redisResult, storageResult] = await Promise.all([
      checkDBHealth(),
      checkRedisHealth(),
      checkStorageHealth()
    ]);
    const isOk = dbResult === true && redisResult === true && storageResult === true;
    const maskEnd = (val) => val ? `${val.substring(0, 15)}...` : "missing";
    res.status(200).json({
      status: isOk ? "ok" : "degraded",
      server: {
        uptime: process.uptime(),
        time: (/* @__PURE__ */ new Date()).toISOString(),
        platform: process.platform,
        node: process.version
      },
      services: {
        database: {
          status: dbResult === true ? "connected" : "failed",
          error: dbResult === true ? null : dbResult,
          config: { host: maskEnd(process.env.PG_HOST), user: process.env.PG_USER }
        },
        redis: {
          status: redisResult === true ? "connected" : "failed",
          error: redisResult === true ? null : redisResult,
          config: {
            source: process.env.REDIS_URL ? "REDIS_URL" : "HOST/PORT",
            host: process.env.REDIS_URL ? maskEnd(process.env.REDIS_URL) : maskEnd(process.env.REDIS_HOST)
          }
        },
        storage: {
          status: storageResult === true ? "connected" : "failed",
          error: storageResult === true ? null : storageResult,
          config: {
            endpoint: maskEnd(process.env.MINIO_ENDPOINT),
            bucket: process.env.MINIO_BUCKET,
            ssl: process.env.MINIO_USE_SSL
          }
        }
      }
    });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});
app.use("/upload", upload_default);
app.use("/status", status_default);
app.use("/process", process_default);
app.use("/result", result_default);
app.use("/cleanup", cleanup_default);
async function startServer() {
  try {
    logger.info("Initializing OCR Cloud Stack...");
    await migrate();
    await ensureBucket();
    startWorker();
    app.listen(port, () => {
      logger.info(`Server listening on port ${port}`);
    });
  } catch (err) {
    logger.error("Startup partial failure", { error: err.message });
    app.listen(port, () => {
      logger.warn("Server started in diagnostic mode", { port });
    });
  }
}
process.on("SIGTERM", async () => {
  logger.info("Shutting down gracefully...");
  await closeRedis();
  const pool = getPool();
  if (pool)
    await pool.end();
  process.exit(0);
});
startServer();
