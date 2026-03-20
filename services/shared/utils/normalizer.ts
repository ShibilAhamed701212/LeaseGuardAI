// shared/utils/normalizer.ts — input normalization + type coercion

export interface SlaData {
  apr:             number | null;
  monthly_payment: number | null;
  term:            number | null;
  residual_value:  number | null;
  mileage_limit:   number | null;
  penalties:       string | null;
}

export interface VinData {
  make:  string;
  model: string;
  year:  number;
}

export interface PriceEstimate {
  market_value: number;
  confidence:   number;
}

export interface BusinessInput {
  sla:            SlaData;
  vin:            VinData | null;
  price_estimate: PriceEstimate | null;
}

/** Clamp a number to [min, max] */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Normalize a raw score to 0–100 integer */
export function toScore(value: number, min = 0, max = 100): number {
  return Math.round(clamp(value, min, max));
}

/** Safe parse number — returns null if not a valid number */
export function safeNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = parseFloat(String(val));
  return isNaN(n) || !isFinite(n) ? null : n;
}

/** Safe parse string — returns null if empty */
export function safeStr(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s.length > 0 ? s : null;
}

/** Normalize a full SlaData object — coerce types, set defaults */
export function normalizeSla(raw: Partial<SlaData>): SlaData {
  return {
    apr:             safeNum(raw.apr),
    monthly_payment: safeNum(raw.monthly_payment),
    term:            safeNum(raw.term),
    residual_value:  safeNum(raw.residual_value),
    mileage_limit:   safeNum(raw.mileage_limit),
    penalties:       safeStr(raw.penalties),
  };
}

/** Normalize price estimate */
export function normalizePriceEstimate(raw: Partial<PriceEstimate> | null): PriceEstimate | null {
  if (!raw) return null;
  const market_value = safeNum(raw.market_value);
  const confidence   = safeNum(raw.confidence);
  if (!market_value || market_value <= 0) return null;
  return {
    market_value,
    confidence: toScore(confidence ?? 50),
  };
}

/** Normalize full business input */
export function normalizeInput(raw: Partial<BusinessInput>): BusinessInput {
  return {
    sla:            normalizeSla((raw.sla ?? {}) as Partial<SlaData>),
    vin:            raw.vin ?? null,
    price_estimate: normalizePriceEstimate(raw.price_estimate ?? null),
  };
}