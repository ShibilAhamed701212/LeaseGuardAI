// prompts/slaPrompt.ts — reusable prompt templates

export const SYSTEM_PROMPT = `You are an expert financial contract analyzer specializing in auto lease agreements.

Your task is to extract structured data from lease contract text.

RULES:
- Return ONLY valid JSON. No markdown. No explanation. No extra text.
- Use null for any field you cannot find or are unsure about.
- Numbers must be actual numbers, not strings.
- Do not guess or fabricate values.`;

export function buildSlaPrompt(ocrText: string): string {
  return `${SYSTEM_PROMPT}

Extract the following fields from this auto lease contract and return as JSON:

{
  "sla": {
    "apr": <number | null>,
    "monthly_payment": <number | null>,
    "term": <number in months | null>,
    "residual_value": <number | null>,
    "mileage_limit": <number per year | null>,
    "penalties": <string describing penalties | null>
  },
  "vin": <17-char VIN string | null>,
  "price_hints": {
    "msrp": <number | null>,
    "selling_price": <number | null>,
    "down_payment": <number | null>,
    "acquisition_fee": <number | null>
  },
  "negotiation_tips": [
    <list of specific actionable tips based on the contract terms>
  ]
}

CONTRACT TEXT:
${ocrText}

Return ONLY the JSON object above. Nothing else.`;
}

export function buildRetryPrompt(ocrText: string, previousAttempt: string): string {
  return `${SYSTEM_PROMPT}

Your previous response was not valid JSON:
${previousAttempt.slice(0, 200)}

Try again. Extract data from this auto lease contract.
Return ONLY a valid JSON object with these exact fields:
{ "sla": { "apr", "monthly_payment", "term", "residual_value", "mileage_limit", "penalties" }, "vin", "price_hints", "negotiation_tips" }

CONTRACT TEXT:
${ocrText.slice(0, 3000)}

Return ONLY valid JSON. No other text.`;
}