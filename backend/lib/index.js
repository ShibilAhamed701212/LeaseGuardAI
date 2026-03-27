"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// functions/utils/logger.ts
var logger_exports = {};
__export(logger_exports, {
  clearBugPredictions: () => clearBugPredictions,
  closeLogger: () => closeLogger,
  getBugPredictions: () => getBugPredictions,
  getCrashReports: () => getCrashReports,
  getDebugLogs: () => getDebugLogs,
  getSystemHealth: () => getSystemHealth,
  logger: () => logger,
  recordCrash: () => recordCrash
});
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function getLogFilePath(date) {
  const dateStr = date.toISOString().split("T")[0];
  return path.join(LOG_DIR, `ocr-agent-${dateStr}.log`);
}
function rotateLogsIfNeeded() {
  try {
    const files = fs.readdirSync(LOG_DIR).filter((f) => f.startsWith("ocr-agent-") && f.endsWith(".log")).sort().reverse();
    let totalSize = 0;
    for (const file of files) {
      const stat = fs.statSync(path.join(LOG_DIR, file));
      totalSize += stat.size;
    }
    const totalSizeMB = totalSize / (1024 * 1024);
    if (totalSizeMB > LOG_MAX_SIZE_MB * LOG_MAX_FILES) {
      for (let i = files.length - 1; i >= LOG_MAX_FILES; i--) {
        fs.unlinkSync(path.join(LOG_DIR, files[i]));
      }
    }
  } catch (err) {
    console.error("Log rotation failed:", err);
  }
}
function getWriteStream() {
  if (!logStream) {
    ensureLogDir();
    rotateLogsIfNeeded();
    logStream = fs.createWriteStream(getLogFilePath(/* @__PURE__ */ new Date()), { flags: "a" });
    logStream.on("error", (err) => {
      console.error("Log stream error:", err);
      logStream = null;
    });
  }
  return logStream;
}
function logToFile(entry) {
  if (!DEBUG_FILE)
    return;
  try {
    const stream = getWriteStream();
    stream.write(JSON.stringify(entry) + "\n");
  } catch (err) {
    console.error("Failed to write to log file:", err);
  }
}
function detectBugPattern(error, context) {
  const patterns = [
    { pattern: /ECONNREFUSED/i, issue: "Redis/DB connection refused", severity: "critical", recommendation: "Check if Redis/PostgreSQL services are running" },
    { pattern: /ETIMEDOUT|timeout/i, issue: "Connection timeout", severity: "medium", recommendation: "Increase timeout values or check network latency" },
    { pattern: /out of memory|MEMORY/i, issue: "Memory exhaustion", severity: "critical", recommendation: "Scale up server or optimize memory usage" },
    { pattern: /SQLITE.*locked|EBUSY/i, issue: "Database lock conflict", severity: "high", recommendation: "Use WAL mode or implement retry logic" },
    { pattern: /invalid json|JSON/i, issue: "JSON parsing error", severity: "medium", recommendation: "Validate JSON before parsing, add try-catch" },
    { pattern: /undefined.*property|is not a function/i, issue: "TypeError: undefined", severity: "high", recommendation: "Add null checks or optional chaining" },
    { pattern: /401|unauthorized/i, issue: "Authentication failure", severity: "high", recommendation: "Verify API keys and tokens" },
    { pattern: /429|rate limit/i, issue: "Rate limit exceeded", severity: "medium", recommendation: "Implement exponential backoff" },
    { pattern: /disk full|ENOSPC/i, issue: "Disk space low", severity: "critical", recommendation: "Free up disk space or scale storage" },
    { pattern: /max.*connections|pool.*exhausted/i, issue: "Connection pool exhausted", severity: "high", recommendation: "Increase pool size or implement connection pooling" }
  ];
  for (const { pattern, issue, severity, recommendation } of patterns) {
    if (pattern.test(error)) {
      const key = issue;
      const existing = bugPredictions.get(key);
      if (existing) {
        existing.occurrenceCount++;
        return existing;
      }
      return {
        id: `bug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        issue,
        severity,
        recommendation,
        occurrenceCount: 1
      };
    }
  }
  return null;
}
function trackError(errorType) {
  const count = errorCounts.get(errorType) || 0;
  errorCounts.set(errorType, count + 1);
  if (count > 5) {
    const prediction = {
      id: `recurring-${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      issue: `Recurring error: ${errorType}`,
      severity: "high",
      recommendation: `Error "${errorType}" occurred ${count} times - investigate root cause`,
      occurrenceCount: count
    };
    bugPredictions.set(errorType, prediction);
  }
}
function log(level, message, context) {
  const stack = level === "error" || level === "critical" ? new Error().stack : void 0;
  const entry = {
    level,
    message,
    context: sanitizeContext(context),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    trace: stack
  };
  logToFile(entry);
  if (level === "error" || level === "critical") {
    trackError(message);
    const bug = detectBugPattern(message, context || {});
    if (bug) {
      bugPredictions.set(bug.issue, bug);
    }
  }
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else if (level === "critical") {
    console.error(`CRITICAL: ${JSON.stringify(entry)}`);
  } else {
    console.log(JSON.stringify(entry));
  }
}
function sanitizeContext(context) {
  if (!context)
    return void 0;
  const sensitive = ["password", "apiKey", "token", "secret", "creditCard", "ssn"];
  const sanitized = {};
  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    if (sensitive.some((s) => lowerKey.includes(s))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.length > 1e3) {
      sanitized[key] = value.substring(0, 1e3) + "...[truncated]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
function getDebugLogs(hours = 24) {
  const logs = [];
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1e3);
  try {
    ensureLogDir();
    const files = fs.readdirSync(LOG_DIR).filter((f) => f.startsWith("ocr-agent-") && f.endsWith(".log")).sort().reverse();
    for (const file of files) {
      const content = fs.readFileSync(path.join(LOG_DIR, file), "utf-8");
      for (const line of content.split("\n")) {
        if (!line.trim())
          continue;
        try {
          const entry = JSON.parse(line);
          if (new Date(entry.timestamp) >= cutoff) {
            logs.push(entry);
          }
        } catch {
        }
      }
    }
  } catch (err) {
    console.error("Failed to read debug logs:", err);
  }
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
function getBugPredictions() {
  return Array.from(bugPredictions.values()).sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
function getCrashReports() {
  return crashReports;
}
function recordCrash(error, context, recoveryAction) {
  const report = {
    id: `crash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    error: error.message,
    stack: error.stack,
    context: sanitizeContext(context) || {},
    recoveryAction
  };
  crashReports.push(report);
  if (crashReports.length > 100) {
    crashReports = crashReports.slice(-100);
  }
  try {
    const crashFile = path.join(LOG_DIR, `crash-${Date.now()}.json`);
    fs.writeFileSync(crashFile, JSON.stringify(report, null, 2));
  } catch (err) {
    console.error("Failed to write crash report:", err);
  }
}
function clearBugPredictions() {
  bugPredictions.clear();
  errorCounts.clear();
}
function getSystemHealth() {
  const recentLogs = getDebugLogs(1);
  const errors = recentLogs.filter((l) => l.level === "error" || l.level === "critical");
  const total = recentLogs.length || 1;
  return {
    errorRate: errors.length / total * 100,
    recentErrors: errors.slice(-10).map((e) => e.message),
    bugPredictions: getBugPredictions(),
    uptime: process.uptime(),
    memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  };
}
function closeLogger() {
  if (logStream) {
    logStream.end();
    logStream = null;
  }
}
var fs, path, LOG_DIR, DEBUG_FILE, LOG_MAX_SIZE_MB, LOG_MAX_FILES, logStream, crashReports, bugPredictions, errorCounts, logger;
var init_logger = __esm({
  "functions/utils/logger.ts"() {
    "use strict";
    fs = __toESM(require("fs"));
    path = __toESM(require("path"));
    LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), "logs");
    DEBUG_FILE = process.env.DEBUG_FILE === "true";
    LOG_MAX_SIZE_MB = parseInt(process.env.LOG_MAX_SIZE_MB || "10", 10);
    LOG_MAX_FILES = parseInt(process.env.LOG_MAX_FILES || "5", 10);
    logStream = null;
    crashReports = [];
    bugPredictions = /* @__PURE__ */ new Map();
    errorCounts = /* @__PURE__ */ new Map();
    logger = {
      info: (msg, ctx) => log("info", msg, ctx),
      warn: (msg, ctx) => log("warn", msg, ctx),
      error: (msg, ctx) => log("error", msg, ctx),
      debug: (msg, ctx) => log("debug", msg, ctx),
      critical: (msg, ctx) => log("critical", msg, ctx)
    };
  }
});

// functions/utils/postgresClient.ts
var postgresClient_exports = {};
__export(postgresClient_exports, {
  checkDBHealth: () => checkDBHealth,
  closePool: () => closePool,
  createJob: () => createJob,
  getJob: () => getJob,
  getJobStatusFromDB: () => getJobStatusFromDB,
  getPool: () => getPool,
  migrate: () => migrate,
  updateJobStatus: () => updateJobStatus,
  withTransaction: () => withTransaction
});
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
async function withTransaction(fn) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
async function closePool() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    logger.info("PG pool closed");
  }
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
var import_pg, _pool, MIGRATION_SQL;
var init_postgresClient = __esm({
  "functions/utils/postgresClient.ts"() {
    "use strict";
    import_pg = require("pg");
    init_logger();
    _pool = null;
    MIGRATION_SQL = `
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
  }
});

// functions/utils/redisClient.ts
var redisClient_exports = {};
__export(redisClient_exports, {
  checkRedisHealth: () => checkRedisHealth,
  closeRedis: () => closeRedis,
  deleteJobKeys: () => deleteJobKeys,
  getClient: () => getClient,
  getJobStatus: () => getJobStatus,
  getResult: () => getResult,
  pushJob: () => pushJob,
  setJobStatus: () => setJobStatus,
  storeResult: () => storeResult
});
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
var import_ioredis, RESULT_TTL, _client;
var init_redisClient = __esm({
  "functions/utils/redisClient.ts"() {
    "use strict";
    import_ioredis = __toESM(require("ioredis"));
    init_logger();
    RESULT_TTL = parseInt(process.env.REDIS_RESULT_TTL_SECONDS ?? "86400", 10);
    _client = null;
  }
});

// functions/utils/errorHandler.ts
var errorHandler_exports = {};
__export(errorHandler_exports, {
  clearErrorTracking: () => clearErrorTracking,
  getErrorTracking: () => getErrorTracking,
  getRecoveryActions: () => getRecoveryActions,
  runDiagnostic: () => runDiagnostic,
  setupGlobalErrorHandlers: () => setupGlobalErrorHandlers
});
function trackError2(errorType) {
  const now = /* @__PURE__ */ new Date();
  let tracker = errorTrackers.get(errorType);
  if (!tracker) {
    tracker = {
      error: errorType,
      count: 0,
      lastOccurrence: now,
      consecutiveFailures: 0,
      isRecovering: false
    };
    errorTrackers.set(errorType, tracker);
  }
  const timeSinceLastError = now.getTime() - tracker.lastOccurrence.getTime();
  if (timeSinceLastError > ERROR_WINDOW_MS) {
    tracker.consecutiveFailures = 0;
  }
  tracker.count++;
  tracker.lastOccurrence = now;
  tracker.consecutiveFailures++;
  const shouldRecover = tracker.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES;
  return { shouldRecover, tracker };
}
async function executeRecovery(tracker) {
  if (tracker.isRecovering) {
    return "Already recovering";
  }
  const now = Date.now();
  if (now - lastRecoveryTime < RECOVERY_COOLDOWN_MS) {
    return "Recovery cooldown active";
  }
  tracker.isRecovering = true;
  lastRecoveryTime = now;
  logger.warn("Starting automatic recovery", { error: tracker.error, count: tracker.consecutiveFailures });
  let lastError = "";
  for (const action of recoveryActions) {
    try {
      await action.execute();
      logger.info(`Recovery action completed: ${action.name}`);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      logger.error(`Recovery action failed: ${action.name}`, { error: lastError });
    }
  }
  tracker.isRecovering = false;
  tracker.consecutiveFailures = 0;
  return lastError || "Recovery completed";
}
function setupGlobalErrorHandlers() {
  process.on("uncaughtException", (error) => {
    logger.critical("Uncaught Exception", {
      error: error.message,
      stack: error.stack
    });
    recordCrash(error, { type: "uncaughtException" }, "process restart required");
    if (!isShuttingDown) {
      isShuttingDown = true;
      logger.info("Shutting down gracefully after uncaught exception...");
      setTimeout(() => process.exit(1), 5e3);
    }
  });
  process.on("unhandledRejection", (reason, promise) => {
    const errorMsg = reason instanceof Error ? reason.message : String(reason);
    logger.error("Unhandled Promise Rejection", {
      error: errorMsg,
      reason: String(reason)
    });
    if (reason instanceof Error) {
      recordCrash(reason, { type: "unhandledRejection" });
    }
    const { shouldRecover, tracker } = trackError2(errorMsg);
    if (shouldRecover) {
      logger.warn("Triggering automatic recovery due to repeated failures", {
        error: errorMsg,
        failures: tracker.consecutiveFailures
      });
      executeRecovery(tracker);
    }
  });
  process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, graceful shutdown");
    isShuttingDown = true;
    await gracefulShutdown();
  });
  process.on("SIGINT", async () => {
    logger.info("SIGINT received, graceful shutdown");
    isShuttingDown = true;
    await gracefulShutdown();
  });
  process.on("beforeExit", (code) => {
    logger.info("Process exiting", { code });
  });
  logger.info("Global error handlers initialized");
}
async function gracefulShutdown() {
  try {
    await closeRedis();
    await closePool();
    logger.info("Graceful shutdown complete");
  } catch (err) {
    logger.error("Error during shutdown", { error: String(err) });
  } finally {
    process.exit(0);
  }
}
function getErrorTracking() {
  return Array.from(errorTrackers.values()).map((t) => ({
    error: t.error,
    count: t.count,
    lastOccurrence: t.lastOccurrence.toISOString(),
    isRecovering: t.isRecovering
  }));
}
function clearErrorTracking() {
  errorTrackers.clear();
}
function getRecoveryActions() {
  return recoveryActions;
}
async function runDiagnostic() {
  const checks = [];
  try {
    const pool = getPool();
    await pool.query("SELECT 1");
    checks.push({ name: "database", status: "ok", message: "PostgreSQL connected", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    checks.push({ name: "database", status: "error", message: String(err), timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
  try {
    const redis2 = getClient();
    await redis2.ping();
    checks.push({ name: "redis", status: "ok", message: "Redis connected", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (err) {
    checks.push({ name: "redis", status: "error", message: String(err), timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  checks.push({
    name: "memory",
    status: heapUsedMB > heapTotalMB * 0.9 ? "warning" : "ok",
    message: `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  checks.push({
    name: "uptime",
    status: "ok",
    message: `${Math.round(process.uptime())}s`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  const errorCount = Array.from(errorTrackers.values()).reduce((sum, t) => sum + t.count, 0);
  if (errorCount > 10) {
    checks.push({ name: "errors", status: "warning", message: `${errorCount} errors tracked`, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } else if (errorCount > 0) {
    checks.push({ name: "errors", status: "ok", message: `${errorCount} errors tracked`, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } else {
    checks.push({ name: "errors", status: "ok", message: "No errors", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  }
  const hasError = checks.some((c) => c.status === "error");
  const hasWarning = checks.some((c) => c.status === "warning");
  return {
    status: hasError ? "unhealthy" : hasWarning ? "degraded" : "healthy",
    checks,
    predictions: getBugPredictions(),
    errorTracking: getErrorTracking()
  };
}
var errorTrackers, MAX_CONSECUTIVE_FAILURES, ERROR_WINDOW_MS, RECOVERY_COOLDOWN_MS, isShuttingDown, lastRecoveryTime, recoveryActions;
var init_errorHandler = __esm({
  "functions/utils/errorHandler.ts"() {
    "use strict";
    init_logger();
    init_postgresClient();
    init_redisClient();
    errorTrackers = /* @__PURE__ */ new Map();
    MAX_CONSECUTIVE_FAILURES = 3;
    ERROR_WINDOW_MS = 6e4;
    RECOVERY_COOLDOWN_MS = 3e4;
    isShuttingDown = false;
    lastRecoveryTime = 0;
    recoveryActions = [
      {
        name: "reconnect_database",
        description: "Close and recreate PostgreSQL connection pool",
        execute: async () => {
          await closePool();
          const { getPool: \u91CD\u65B0\u83B7\u53D6\u6C60 } = await Promise.resolve().then(() => (init_postgresClient(), postgresClient_exports));
          \u91CD\u65B0\u83B7\u53D6\u6C60();
          logger.info("Database reconnected via recovery");
        }
      },
      {
        name: "reconnect_redis",
        description: "Close and recreate Redis connection",
        execute: async () => {
          await closeRedis();
          const { getClient: \u91CD\u65B0\u83B7\u53D6Redis } = await Promise.resolve().then(() => (init_redisClient(), redisClient_exports));
          \u91CD\u65B0\u83B7\u53D6Redis();
          logger.info("Redis reconnected via recovery");
        }
      },
      {
        name: "clear_queues",
        description: "Clear stuck processing queues",
        execute: async () => {
          const redis2 = getClient();
          await redis2.del("ocr:queue:stuck");
          await redis2.del("ocr:processing");
          logger.info("Cleared stuck queues");
        }
      },
      {
        name: "reset_memory",
        description: "Force garbage collection if available",
        execute: async () => {
          if (global.gc) {
            global.gc();
            logger.info("Garbage collection triggered");
          }
        }
      }
    ];
  }
});

// functions/index.ts
var import_express8 = __toESM(require("express"));
var import_cors = __toESM(require("cors"));
var Sentry2 = __toESM(require("@sentry/node"));
var import_profiling_node = require("@sentry/profiling-node");
init_logger();
init_errorHandler();
init_postgresClient();
init_redisClient();

// functions/utils/minioClient.ts
var import_client_s3 = require("@aws-sdk/client-s3");
var import_s3_request_presigner = require("@aws-sdk/s3-request-presigner");
init_logger();
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
init_postgresClient();
init_logger();
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
init_redisClient();
init_postgresClient();
init_logger();
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
init_postgresClient();
init_redisClient();

// functions/utils/n8nClient.ts
var import_axios = __toESM(require("axios"));
init_logger();
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
init_logger();
var router3 = import_express3.default.Router();
var VALID_OCR = ["google_cloud"];
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
init_redisClient();
init_postgresClient();
init_logger();
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
init_redisClient();
init_postgresClient();
init_logger();
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

// functions/debug.ts
var import_express6 = __toESM(require("express"));
init_redisClient();
init_postgresClient();
init_logger();
init_errorHandler();
var router6 = import_express6.default.Router();
router6.get("/", async (_req, res) => {
  try {
    const redis2 = getClient();
    const pool = getPool();
    const queueLen = await redis2.llen("ocr:queue").catch(() => -1);
    const workerRunning = await redis2.get("ocr:worker:heartbeat") !== null;
    const lastError = await redis2.get("ocr:worker:last_error");
    const dbStats = await pool.query(`
      SELECT status, COUNT(*) as count 
        FROM jobs 
       GROUP BY status
    `).then((r) => r.rows).catch(() => []);
    const env = {
      isProduction: process.env.NODE_ENV === "production",
      hasGemini: !!process.env.GEMINI_API_KEY,
      hasRedis: !!(process.env.REDIS_URL || process.env.REDIS_HOST),
      hasN8n: !!process.env.N8N_WEBHOOK_URL
    };
    const systemHealth = getSystemHealth();
    const bugPredictions2 = getBugPredictions();
    const errorTracking = getErrorTracking();
    res.status(200).json({
      status: "online",
      diagnostics: {
        queue: { length: queueLen, healthy: queueLen >= 0 },
        worker: { isActive: workerRunning, lastError },
        database: { stats: dbStats },
        environment: env,
        systemHealth: {
          errorRate: systemHealth.errorRate.toFixed(2) + "%",
          memoryUsage: systemHealth.memoryUsage + "MB",
          uptime: Math.round(systemHealth.uptime) + "s",
          recentErrors: systemHealth.recentErrors
        },
        bugPredictions: bugPredictions2.map((b) => ({
          issue: b.issue,
          severity: b.severity,
          recommendation: b.recommendation,
          occurrenceCount: b.occurrenceCount
        })),
        errorTracking
      },
      server: {
        uptime: process.uptime(),
        time: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (err) {
    logger.error("Debug stats failed", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});
router6.get("/logs", async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const level = req.query.level;
    let logs = getDebugLogs(hours);
    if (level) {
      logs = logs.filter((l) => l.level === level);
    }
    res.json({
      count: logs.length,
      logs: logs.slice(-100)
    });
  } catch (err) {
    logger.error("Debug logs failed", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});
router6.get("/health", async (_req, res) => {
  try {
    const result = await runDiagnostic();
    const httpStatus = result.status === "healthy" ? 200 : result.status === "degraded" ? 200 : 503;
    res.status(httpStatus).json(result);
  } catch (err) {
    logger.error("Health check failed", { error: err.message });
    res.status(500).json({ status: "error", error: err.message });
  }
});
router6.get("/predictions", (_req, res) => {
  const predictions = getBugPredictions();
  res.json({ count: predictions.length, predictions });
});
router6.get("/errors", (_req, res) => {
  const tracking = getErrorTracking();
  res.json({ count: tracking.length, errors: tracking });
});
var debug_default = router6;

// functions/chat/index.ts
var import_express7 = __toESM(require("express"));
var import_generative_ai = require("@google/generative-ai");
init_logger();
var router7 = import_express7.default.Router();
var GEMINI_KEY = process.env.GEMINI_API_KEY || "";
var SYSTEM_PROMPT = `You are LeaseGuard AI \u2014 an expert lease contract negotiation coach.

Your purpose:
1. Answer questions about lease contracts in plain, friendly language.
2. Provide actionable negotiation tactics and counter-offer strategies.
3. Explain legal and financial terms found in lease agreements.
4. Help users identify red flags, hidden fees, and unfair clauses.
5. Role-play as a negotiation partner so the user can practice.

Rules:
- Keep answers concise (2-4 paragraphs max) unless the user asks for detail.
- Use bullet points for action items.
- If the user shares contract data, reference specific numbers and clauses.
- Always be helpful, never dismissive. If unsure, say so honestly.
- Format responses with markdown for readability.
- When role-playing negotiation, clearly label "You could say:" sections.`;
router7.post("/", async (req, res) => {
  const { message, history, contract_context } = req.body;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "message is required" });
    return;
  }
  if (!GEMINI_KEY) {
    res.status(503).json({ error: "AI service is not configured" });
    return;
  }
  try {
    const genAI = new import_generative_ai.GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    });
    let contextBlock = "";
    if (contract_context) {
      contextBlock = `

The user has analyzed a lease contract. Here is the extracted data:
\`\`\`json
${JSON.stringify(contract_context, null, 2)}
\`\`\`
Use this data to give specific, personalized advice.`;
    }
    const chatHistory = (history || []).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: SYSTEM_PROMPT + contextBlock }]
        },
        {
          role: "model",
          parts: [{ text: "Understood! I'm LeaseGuard AI, your lease negotiation coach. I'm ready to help you understand your contract, identify risks, and practice negotiation strategies. What would you like to know?" }]
        },
        ...chatHistory
      ]
    });
    const result = await chat.sendMessage(message);
    const reply = result.response.text();
    if (!reply) {
      res.status(500).json({ error: "AI returned an empty response" });
      return;
    }
    logger.info("Chat response generated", { messageLen: message.length, replyLen: reply.length });
    res.status(200).json({
      reply,
      tokens_used: reply.length
      // approximate
    });
  } catch (err) {
    logger.error("Chat endpoint error", { error: err.message });
    res.status(500).json({ error: "Failed to generate response. Please try again." });
  }
});
var chat_default = router7;

// functions/worker.ts
var import_generative_ai2 = require("@google/generative-ai");
var import_pdf_parse = __toESM(require("pdf-parse"));
init_redisClient();
init_postgresClient();
var Sentry = __toESM(require("@sentry/node"));
init_logger();
var POLL_INTERVAL = 3e3;
var redis = getClient();
var DEFAULT_GEMINI_KEY = process.env.GEMINI_API_KEY || "";
var DEFAULT_OLLAMA_URL = process.env.OLLAMA_HOST ? `http://${process.env.OLLAMA_HOST}:11434` : "http://localhost:11434";
async function sleep2(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function downloadFileBuffer(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15e3);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok)
        throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      if (i === retries - 1) {
        logger.error("File download failed permanently", { url, error: err.message });
        throw new Error(`Download failed: ${err.message}`);
      }
      logger.warn(`Download retry ${i + 1}/${retries}`, { error: err.message });
      await sleep2(1e3 * (i + 1));
    }
  }
  throw new Error("Download failed");
}
async function extractTextWithGoogleCloud(buffer, mimeType, config) {
  const apiKey = config?.apiKey || DEFAULT_GEMINI_KEY;
  if (!apiKey)
    throw new Error("Google Cloud OCR requires a Gemini API Key");
  const genAI = new import_generative_ai2.GoogleGenerativeAI(apiKey);
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
  } catch (err) {
    logger.error("Google Cloud OCR fetch failed", { error: err.message });
    throw new Error(`Google OCR failed: ${err.message}`);
  }
}
async function extractTextWithPdfParse(buffer, mimeType, config) {
  try {
    if (mimeType === "application/pdf") {
      const data = await (0, import_pdf_parse.default)(buffer);
      let text = data.text?.trim();
      if (text && text.length > 100)
        return text;
    }
    logger.info("Falling back to Google Cloud OCR for deep scan");
    return await extractTextWithGoogleCloud(buffer, mimeType, config);
  } catch (err) {
    logger.warn("Document parsing failure, using Google Cloud fallback", { err: err.message });
    return await extractTextWithGoogleCloud(buffer, mimeType, config);
  }
}
async function processOllama(text, config) {
  const baseUrl = config?.baseUrl || DEFAULT_OLLAMA_URL;
  const model = config?.modelName || "llama3.2";
  const prompt = `Extract structured SLA data from this lease contract. 
Return ONLY valid JSON with keys: {apr, monthly_payment, term, residual_value, mileage_limit, penalties}. 
No markdown. No explanation. Data:

${text}`;
  try {
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
  } catch (err) {
    logger.error("Ollama fetch failed", { baseUrl, error: err.message });
    throw new Error(`Ollama failed: ${err.message}`);
  }
}
async function processGemini(buffer, mimeType, config) {
  const apiKey = config?.apiKey || DEFAULT_GEMINI_KEY;
  if (!apiKey)
    throw new Error("Gemini API key is required but missing");
  let modelName = config?.modelName || "gemini-2.5-flash";
  if (modelName === "gemini")
    modelName = "gemini-2.5-flash";
  const genAI = new import_generative_ai2.GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json"
    }
  });
  const prompt = `You are a legal-financial contract analyzer specialized in vehicle lease agreements.

Your job is to extract, normalize, and interpret ALL financial and risk-related details from the document.

IMPORTANT RULES:
1. Do NOT assume missing values if they are indirectly stated.
2. Detect hidden or ambiguous values (e.g., "45k/month with driver" = monthly payment 45000).
3. Convert all financial strings into pure numbers. 
4. Detect currency: \u20B9=INR, $=USD. Default to INR if \u20B9 or "Lakh" is found.
5. If payment is written like "45k/month" \u2192 interpret as 45000.
6. Term months: calculate duration strictly from dates if needed.
7. NEVER output $0 for total or payment unless explicitly stated.

STRICT JSON FORMAT:
{
  "currency": "INR",
  "monthly_payment": number or null,
  "term_months": number or null,
  "total_cost": number or null,
  "deposit": number or null,
  "mileage": "string",
  "residual_value": "string/rule",
  "gap_liability": "string/who pays",
  "maintenance": "string (Lessor/Lessee)",
  "insurance": "string (Lessor/Lessee)",
  "taxes": "string (Lessor/Lessee)",
  "purchase_option": "boolean",
  "penalties": ["list of strings"],
  "financial_risk": "Low/Medium/High",
  "legal_risk": "Low/Medium/High",
  "fairness_score": number (0-100),
  "confidence": number (0-100),
  "issues_detected": ["list of strings"],
  "fairness_explanation": "short reasoning"
}`;
  const inlineData = {
    data: buffer.toString("base64"),
    mimeType: mimeType === "application/pdf" ? "application/pdf" : mimeType.startsWith("image/") ? mimeType : "image/jpeg"
  };
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6e4);
    const response = await model.generateContent([
      { text: prompt },
      { inlineData }
    ]);
    clearTimeout(timeoutId);
    const text = response.response.text();
    if (!text)
      throw new Error("Empty response from Gemini");
    return parseJsonResponse(text);
  } catch (err) {
    if (err.name === "AbortError")
      throw new Error("Gemini AI request timed out (60s limit reached)");
    logger.error("Gemini AI fetch failed", { error: err.message });
    throw new Error(`Gemini AI failed: ${err.message}`);
  }
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
  let cleaned = text.replace(/\`\`\`json/gi, "").replace(/\`\`\`/g, "").replace(/\s+/g, " ").trim();
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
    await setJobStatus(job.job_id, "reading_document").catch(() => null);
    const fileBuffer = await downloadFileBuffer(job.file_url);
    const isPdf = job.file_url.toLowerCase().includes(".pdf?");
    const mimeType = isPdf ? "application/pdf" : "image/jpeg";
    let sla = null;
    if (job.ai === "gemini") {
      await setJobStatus(job.job_id, "analyzing_contract").catch(() => null);
      sla = await processGemini(fileBuffer, mimeType, job.config);
    } else {
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
    let fairness_score = sla.fairness_score || 70;
    if (sla.financial_risk === "High")
      fairness_score -= 15;
    if (sla.legal_risk === "High")
      fairness_score -= 10;
    if (sla.maintenance === "Lessee")
      fairness_score -= 5;
    if (sla.insurance === "Lessee")
      fairness_score -= 5;
    fairness_score = Math.max(10, Math.min(100, fairness_score));
    const confidence = sla.confidence || 70;
    const resultPayload = {
      sla: {
        ...sla,
        apr: null,
        // deprecated in new prompt but preserved for API
        term: sla.term_months,
        residual_value: typeof sla.residual_value === "string" ? null : sla.residual_value,
        // compat
        mileage_limit: typeof sla.mileage === "string" ? parseInt(sla.mileage) || null : sla.mileage,
        // compat
        penalties: Array.isArray(sla.penalties) ? sla.penalties.join(", ") : sla.fairness_explanation || "No penalties listed."
      },
      vin: null,
      price_estimate: {
        market_value: sla.total_cost || (sla.monthly_payment ? sla.monthly_payment * (sla.term_months || 48) : null),
        confidence,
        currency: sla.currency || "INR"
      },
      fairness_score,
      negotiation_tips: [
        ...sla.issues_detected || [],
        sla.fairness_explanation || "Verify the residual clauses carefully."
      ].filter(Boolean)
    };
    await storeResult(job.job_id, resultPayload);
    await setJobStatus(job.job_id, "completed").catch(() => null);
    await updateJobStatus(job.job_id, "completed").catch(() => null);
    logger.info(`Worker completed job: ${job.job_id}`);
  } catch (err) {
    logger.error(`Worker failed job: ${job.job_id}`, {
      message: err.message,
      stack: err.stack?.substring(0, 200)
    });
    await redis.set("ocr:worker:last_error", `${(/* @__PURE__ */ new Date()).toISOString()} - ${err.message}`, "EX", 3600).catch(() => null);
    Sentry.captureException(err);
    await setJobStatus(job.job_id, "failed").catch(() => null);
    await updateJobStatus(job.job_id, "failed").catch(() => null);
  }
}
async function healOrphanedJobs() {
  try {
    const pool = (init_postgresClient(), __toCommonJS(postgresClient_exports)).getPool();
    const res = await pool.query(`
      UPDATE jobs 
         SET status = 'failed', updated_at = NOW()
       WHERE status = 'processing' 
         AND updated_at < NOW() - INTERVAL '5 minutes'
    `);
    if (res.rowCount > 0) {
      logger.info(`Self-healing: recovered ${res.rowCount} orphaned processing jobs.`);
    }
  } catch (err) {
    logger.warn("Self-healing check failed", { error: err.message });
  }
}
function startWorker() {
  logger.info("Starting Background AI Worker engine...");
  healOrphanedJobs().catch(() => null);
  setInterval(async () => {
    if (isWorking)
      return;
    try {
      isWorking = true;
      await redis.set("ocr:worker:heartbeat", "active", "EX", 10).catch(() => null);
      const jobString = await redis.lpop("ocr:queue");
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
  setInterval(() => {
    if (!isWorking)
      healOrphanedJobs().catch(() => null);
  }, 3e5);
}

// functions/index.ts
Sentry2.init({
  dsn: "https://8cb99fb0212ca09a93a3abbcef59e90b@o4511106055208960.ingest.de.sentry.io/4511106111504464",
  integrations: [
    (0, import_profiling_node.nodeProfilingIntegration)()
  ],
  tracesSampleRate: 1,
  profilesSampleRate: 1,
  release: "v1.0.4-shield-final"
});
var app = (0, import_express8.default)();
var port = process.env.PORT || 1e4;
app.use((0, import_cors.default)());
app.use(import_express8.default.json());
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
app.get("/diagnostic", async (_req, res) => {
  try {
    const result = await runDiagnostic();
    res.status(result.status === "healthy" ? 200 : result.status === "degraded" ? 200 : 503).json(result);
  } catch (err) {
    logger.error("Diagnostic endpoint failed", { error: err.message });
    res.status(500).json({ status: "error", error: err.message });
  }
});
app.get("/debug/predictions", (_req, res) => {
  const { getBugPredictions: getBugPredictions2 } = (init_logger(), __toCommonJS(logger_exports));
  res.json(getBugPredictions2());
});
app.get("/debug/errors", (_req, res) => {
  const { getErrorTracking: getErrorTracking2 } = (init_errorHandler(), __toCommonJS(errorHandler_exports));
  res.json(getErrorTracking2());
});
app.use("/upload", upload_default);
app.use("/status", status_default);
app.use("/process", process_default);
app.use("/result", result_default);
app.use("/cleanup", cleanup_default);
app.use("/debug", debug_default);
app.use("/chat", chat_default);
Sentry2.setupExpressErrorHandler(app);
async function startServer() {
  try {
    logger.info("Initializing OCR Cloud Stack...");
    await migrate();
    await ensureBucket();
    app.listen(Number(port), "0.0.0.0", () => {
      logger.info(`Server listening on port ${port} bound to 0.0.0.0`);
      startWorker();
    });
  } catch (err) {
    logger.error("Startup partial failure", { error: err.message });
    app.listen(port, () => {
      logger.warn("Server started in diagnostic mode", { port });
    });
  }
}
setupGlobalErrorHandlers();
startServer();
