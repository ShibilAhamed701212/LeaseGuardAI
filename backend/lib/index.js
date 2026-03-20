"use strict";
// functions/index.ts — Firebase Functions entry point
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const upload_1 = __importDefault(require("./upload"));
const process_1 = __importDefault(require("./process"));
const status_1 = __importDefault(require("./status"));
const result_1 = __importDefault(require("./result"));
const cleanup_1 = __importDefault(require("./cleanup"));
const postgresClient_1 = require("./utils/postgresClient");
const minioClient_1 = require("./utils/minioClient");
const logger_1 = require("./utils/logger");
const app = (0, express_1.default)();
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
app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});
// ── 404 handler ────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
});
// ── Global error handler ───────────────────────────────────────
app.use((err, _req, res, _next) => {
    logger_1.logger.error("Unhandled error", { message: err.message, stack: err.stack });
    res.status(500).json({ error: "Internal server error" });
});
// ── Startup: run migrations + ensure MinIO bucket ─────────────
async function init() {
    try {
        await (0, postgresClient_1.migrate)();
        await (0, minioClient_1.ensureBucket)();
        logger_1.logger.info("Backend initialized successfully");
    }
    catch (err) {
        logger_1.logger.error("Startup init failed", {
            message: err instanceof Error ? err.message : String(err),
        });
    }
}
init();
// ── Export as Firebase Function ────────────────────────────────
exports.api = functions
    .runWith({ memory: "512MB", timeoutSeconds: 120 })
    .https.onRequest(app);
//# sourceMappingURL=index.js.map