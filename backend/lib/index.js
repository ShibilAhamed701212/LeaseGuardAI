"use strict";
// functions/index.ts — Standalone Express server entry point
// Works on any Node.js host: Render, Railway, fly.io, local, etc.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const upload_1 = __importDefault(require("./upload"));
const process_1 = __importDefault(require("./process"));
const status_1 = __importDefault(require("./status"));
const result_1 = __importDefault(require("./result"));
const cleanup_1 = __importDefault(require("./cleanup"));
const postgresClient_1 = require("./utils/postgresClient");
const minioClient_1 = require("./utils/minioClient");
const redisClient_1 = require("./utils/redisClient");
const logger_1 = require("./utils/logger");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT ?? "5001", 10);
// ── Middleware ─────────────────────────────────────────────────
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json({ limit: "1mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// ── Routes ─────────────────────────────────────────────────────
app.use("/upload", upload_1.default);
app.use("/process", process_1.default);
app.use("/status", status_1.default);
app.use("/result", result_1.default);
app.use("/cleanup", cleanup_1.default);
// ── Health check ───────────────────────────────────────────────
let _initialized = false;
app.get("/health", (_req, res) => {
    res.status(200).json({
        status: _initialized ? "ok" : "initializing",
        timestamp: new Date().toISOString(),
    });
});
// ── Root ───────────────────────────────────────────────────────
app.get("/", (_req, res) => {
    res.status(200).json({
        service: "OCR Agent API",
        version: "1.0.0",
        status: _initialized ? "ready" : "initializing",
    });
});
// ── 404 handler ────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
});
// ── Global error handler ───────────────────────────────────────
app.use((err, _req, res, _next) => {
    logger_1.logger.error("Unhandled error", { message: err.message, stack: err.stack });
    if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
    }
});
// ── Startup ────────────────────────────────────────────────────
const MAX_INIT_RETRIES = 3;
const INIT_RETRY_DELAY_MS = 2000;
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function init() {
    for (let attempt = 1; attempt <= MAX_INIT_RETRIES; attempt++) {
        try {
            logger_1.logger.info("Backend initializing", { attempt, maxRetries: MAX_INIT_RETRIES });
            await (0, postgresClient_1.migrate)();
            await (0, minioClient_1.ensureBucket)();
            _initialized = true;
            logger_1.logger.info("Backend initialized successfully");
            return;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger_1.logger.error("Startup init failed", { attempt, message });
            if (attempt < MAX_INIT_RETRIES) {
                logger_1.logger.info("Retrying init", { nextAttemptIn: `${INIT_RETRY_DELAY_MS}ms` });
                await sleep(INIT_RETRY_DELAY_MS);
            }
            else {
                logger_1.logger.error("All init retries exhausted — backend starting in degraded mode");
            }
        }
    }
}
// ── Start the HTTP server ──────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
    logger_1.logger.info(`Server listening on port ${PORT}`);
    init();
});
// ── Graceful shutdown ──────────────────────────────────────────
async function shutdown() {
    logger_1.logger.info("Shutting down gracefully…");
    await (0, postgresClient_1.closePool)();
    await (0, redisClient_1.closeRedis)();
    logger_1.logger.info("Shutdown complete");
    process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
//# sourceMappingURL=index.js.map