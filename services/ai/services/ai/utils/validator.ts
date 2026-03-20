// utils/validator.ts — validate and normalize AI output

export interface SlaData {
  apr:             number | null;
  monthly_payment: number | null;
  term:            number | null;
  residual_value:  number | null;
  mileage_limit:   number | null;
  penalties:       string | null;
}

export interface PriceHints {
  msrp:            number | null;
  selling_price:   number | null;
  down_payment:    number | null;
  acquisition_fee: number | null;
}

export interface AiOutput {
  sla:               SlaData;
  vin:               string | null;
  price_hints:       PriceHints;
  negotiation_tips:  string[];
}

/** Safely coerce a value to number or null */
function toNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
}

/** Safely coerce a value to string or null */
function toStr(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s.length > 0 ? s : null;
}

/** Validate and normalize VIN — must be 17 alphanumeric chars */
function validateVin(val: unknown): string | null {
  const s = toStr(val);
  if (!s) return null;
  const cleaned = s.replace(/[^A-HJ-NPR-Z0-9]/gi, "").toUpperCase();
  return cleaned.length === 17 ? cleaned : null;
}

/** Validate and normalize the full AI output */
export function validateAiOutput(raw: Record<string, unknown>): AiOutput {
  const slaRaw       = (raw.sla       as Record<string, unknown>) ?? {};
  const hintsRaw     = (raw.price_hints as Record<string, unknown>) ?? {};
  const tipsRaw      = raw.negotiation_tips;

  const sla: SlaData = {
    apr:             toNum(slaRaw.apr),
    monthly_payment: toNum(slaRaw.monthly_payment),
    term:            toNum(slaRaw.term),
    residual_value:  toNum(slaRaw.residual_value),
    mileage_limit:   toNum(slaRaw.mileage_limit),
    penalties:       toStr(slaRaw.penalties),
  };

  const price_hints: PriceHints = {
    msrp:            toNum(hintsRaw.msrp),
    selling_price:   toNum(hintsRaw.selling_price),
    down_payment:    toNum(hintsRaw.down_payment),
    acquisition_fee: toNum(hintsRaw.acquisition_fee),
  };

  const negotiation_tips: string[] = Array.isArray(tipsRaw)
    ? tipsRaw.map(String).filter((t) => t.trim().length > 0)
    : [];

  return {
    sla,
    vin:              validateVin(raw.vin),
    price_hints,
    negotiation_tips,
  };
}

/** Check if output has at least minimum usable data */
export function hasMinimumData(output: AiOutput): boolean {
  const { sla } = output;
  const filled = [sla.apr, sla.monthly_payment, sla.term, sla.residual_value]
    .filter((v) => v !== null).length;
  return filled >= 2; // at least 2 key SLA fields
}