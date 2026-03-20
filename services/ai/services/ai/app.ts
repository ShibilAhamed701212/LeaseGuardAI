// app.ts — AI microservice entry point

import "dotenv/config";
import express from "express";
import cors    from "cors";
import { processHandler } from "./controller/process";

const app  = express();
const PORT = parseInt(process.env.PORT ?? "8386", 10);

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));  // OCR text can be large

// ── Routes ─────────────────────────────────────────────────────
app.post("/ai/process", processHandler);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "ai-service", timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Global error handler ───────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[AI] Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[AI] Service running on port ${PORT}`);
  console.log(`[AI] Ollama host: ${process.env.OLLAMA_HOST ?? "http://ollama:11434"}`);
  console.log(`[AI] Fallback enabled: ${process.env.AI_FALLBACK_ENABLED ?? "true"}`);
});

export default app;