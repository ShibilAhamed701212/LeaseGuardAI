// controller/process.ts — POST /ai/process handler

import { type Request, type Response } from "express";
import { buildSlaPrompt, buildRetryPrompt } from "../prompts/slaPrompt";
import { callOllama }  from "../providers/ollama";
import { callOpenAI }  from "../providers/openai";
import { callClaude }  from "../providers/claude";
import { parseAiResponse } from "../utils/parser";
import { validateAiOutput, hasMinimumData, type AiOutput } from "../utils/validator";

type AiModel = "ollama" | "openai" | "claude";

const FALLBACK_ENABLED = process.env.AI_FALLBACK_ENABLED !== "false";

/** Call the correct provider */
async function callProvider(model: AiModel, prompt: string): Promise<string> {
  switch (model) {
    case "ollama":  return callOllama(prompt);
    case "openai":  return callOpenAI(prompt);
    case "claude":  return callClaude(prompt);
    default: throw new Error(`Unknown AI model: ${model as string}`);
  }
}

/** Fallback chain: ollama → openai → claude */
function getFallback(model: AiModel): AiModel | null {
  const chain: AiModel[] = ["ollama", "openai", "claude"];
  const idx = chain.indexOf(model);
  return idx < chain.length - 1 ? chain[idx + 1] : null;
}

/** Run AI with retry + fallback */
async function runWithRetry(
  model:   AiModel,
  prompt:  string,
  ocrText: string,
  attempt = 1
): Promise<{ output: AiOutput; model_used: string }> {
  let raw = "";
  try {
    raw = await callProvider(model, prompt);
    const parsed = parseAiResponse(raw);

    if (!parsed.success || !parsed.data) {
      throw new Error(parsed.error ?? "Parse failed");
    }

    const output = validateAiOutput(parsed.data);

    // Retry once with a corrective prompt if output is too thin
    if (!hasMinimumData(output) && attempt === 1) {
      const retryPrompt = buildRetryPrompt(ocrText, raw);
      return runWithRetry(model, retryPrompt, ocrText, 2);
    }

    return { output, model_used: model };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Try fallback model if enabled
    if (FALLBACK_ENABLED && attempt === 1) {
      const fallback = getFallback(model);
      if (fallback) {
        console.warn(`[AI] ${model} failed (${message}), falling back to ${fallback}`);
        return runWithRetry(fallback, buildSlaPrompt(ocrText), ocrText, 1);
      }
    }

    throw new Error(`All AI providers failed. Last error: ${message}`);
  }
}

/** POST /ai/process */
export async function processHandler(req: Request, res: Response): Promise<void> {
  const { text, ai } = req.body as { text?: string; ai?: string };

  if (!text || text.trim().length === 0) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const validModels: AiModel[] = ["ollama", "openai", "claude"];
  const model: AiModel = validModels.includes(ai as AiModel)
    ? (ai as AiModel)
    : "ollama";

  // Privacy: never log the document text
  console.log(`[AI] Processing with model: ${model}, text_length: ${text.length}`);

  try {
    const prompt = buildSlaPrompt(text);
    const { output, model_used } = await runWithRetry(model, prompt, text);

    res.status(200).json({
      success:    true,
      model_used,
      ...output,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI processing failed";
    console.error(`[AI] Processing error: ${message}`);

    // Return partial empty structure so pipeline can continue
    res.status(500).json({
      success: false,
      error:   message,
      sla: {
        apr: null, monthly_payment: null, term: null,
        residual_value: null, mileage_limit: null, penalties: null,
      },
      vin:               null,
      price_hints:       { msrp: null, selling_price: null, down_payment: null, acquisition_fee: null },
      negotiation_tips:  [],
    });
  }
}