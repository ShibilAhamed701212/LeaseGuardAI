// utils/parser.ts — safe JSON extraction from LLM responses

export interface ParseResult {
  success: boolean;
  data:    Record<string, unknown> | null;
  raw:     string;
  error?:  string;
}

/** Extract and parse JSON from raw LLM output */
export function parseAiResponse(raw: string): ParseResult {
  if (!raw || raw.trim().length === 0) {
    return { success: false, data: null, raw, error: "Empty response" };
  }

  let cleaned = raw.trim();

  // 1. Strip markdown code fences
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/,      "")
    .replace(/\s*```$/,      "")
    .trim();

  // 2. Extract first JSON object if surrounded by text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  // 3. Fix common LLM JSON mistakes
  cleaned = cleaned
    .replace(/,\s*}/g,  "}")   // trailing commas in objects
    .replace(/,\s*]/g,  "]")   // trailing commas in arrays
    .replace(/'/g,       '"')  // single quotes → double quotes
    .replace(/(\w+):/g,  (match, key) => {
      // Only quote unquoted keys
      if (cleaned.indexOf(`"${key}":`) !== -1) return match;
      return `"${key}":`;
    });

  try {
    const data = JSON.parse(cleaned) as Record<string, unknown>;
    return { success: true, data, raw };
  } catch (err) {
    // 4. Last resort: try to extract partial valid JSON
    try {
      const partial = extractPartialJson(cleaned);
      if (partial) {
        return { success: true, data: partial, raw, error: "Partial extraction used" };
      }
    } catch {
      // ignore
    }

    return {
      success: false,
      data:    null,
      raw,
      error:   `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/** Attempt to salvage a partial JSON object */
function extractPartialJson(text: string): Record<string, unknown> | null {
  // Try to find balanced braces
  let depth = 0, start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") { if (depth === 0) start = i; depth++; }
    if (text[i] === "}") { depth--; if (depth === 0 && start !== -1) {
      try { return JSON.parse(text.slice(start, i + 1)) as Record<string, unknown>; }
      catch { start = -1; }
    }}
  }
  return null;
}