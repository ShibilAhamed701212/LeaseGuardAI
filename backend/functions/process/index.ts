// functions/process/index.ts — POST /process

import express, { type Request, type Response } from "express";
import { getJob, updateJobStatus } from "../utils/postgresClient";
import { pushJob, setJobStatus }   from "../utils/redisClient";
import { getSignedUrl }            from "../utils/minioClient";
import { triggerN8nWebhook }       from "../utils/n8nClient";
import { logger } from "../utils/logger";

const router = express.Router();

const VALID_OCR = ["tesseract", "paddle"] as const;
const VALID_AI  = ["ollama", "openai", "claude"] as const;

type OcrEngine = (typeof VALID_OCR)[number];
type AiModel   = (typeof VALID_AI)[number];

interface ProcessBody {
  job_id: string;
  ocr:    OcrEngine;
  ai:     AiModel;
}

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { job_id, ocr, ai } = req.body as ProcessBody;

  // Validate all required fields and enums
  if (!job_id || !ocr || !ai) {
    res.status(400).json({ error: "Invalid job_id or parameters" });
    return;
  }
  if (!(VALID_OCR as readonly string[]).includes(ocr)) {
    res.status(400).json({ error: "Invalid job_id or parameters" });
    return;
  }
  if (!(VALID_AI as readonly string[]).includes(ai)) {
    res.status(400).json({ error: "Invalid job_id or parameters" });
    return;
  }

  try {
    // 1. Validate job exists
    const job = await getJob(job_id);
    if (!job) {
      res.status(404).json({ error: "Invalid job_id or parameters" });
      return;
    }
    if (job.status === "processing") {
      res.status(409).json({ error: "Invalid job_id or parameters" });
      return;
    }

    // 2. Generate signed MinIO URL for n8n
    const ext        = "pdf";
    const objectName = `uploads/${job_id}/file.${ext}`;
    const file_url   = await getSignedUrl(objectName);

    // 3. Update PostgreSQL status
    await updateJobStatus(job_id, "processing", ocr, ai);

    // 4. Update Redis status cache
    await setJobStatus(job_id, "processing");

    // 5. Push to Redis queue
    await pushJob(job_id, { ocr, ai, file_url });

    // 6. Trigger n8n webhook
    await triggerN8nWebhook({ job_id, file_url, ocr, ai });

    logger.info("Processing triggered", { job_id, ocr, ai });

    // Contract: { job_id, status: "processing" }
    res.status(200).json({ job_id, status: "processing" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Process trigger failed";
    logger.error("Process handler error", { job_id, message });

    await updateJobStatus(job_id, "failed").catch(() => null);
    await setJobStatus(job_id, "failed").catch(() => null);

    res.status(500).json({ error: "Invalid job_id or parameters" });
  }
});

export default router;