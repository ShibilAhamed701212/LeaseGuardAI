// shared/utils/fairnessEngine.ts — fairness score computation

import { clamp, toScore, type SlaData, type PriceEstimate } from "./normalizer";

export interface ScoreBreakdown {
  apr_score:     number;
  price_score:   number;
  mileage_score: number;
  penalty_score: number;
  weighted_total: number;
}

export interface FairnessResult {
  fairness_score:   number;   // 0–100
  breakdown:        ScoreBreakdown;
  rating:           "excellent" | "good" | "fair" | "poor" | "very_poor";
  rating_label:     string;
}

// Weights must sum to 1.0
const WEIGHTS = {
  apr:     0.35,
  price:   0.30,
  mileage: 0.20,
  penalty: 0.15,
} as const;

/** Score APR — lower is better */
export function scoreApr(apr: number | null): number {
  if (apr === null) return 55; // unknown → assume medium risk
  if (apr <= 0)  return 100;
  if (apr <= 2)  return 98;
  if (apr <= 3)  return 92;
  if (apr <= 4)  return 85;
  if (apr <= 5)  return 75;
  if (apr <= 7)  return 60;
  if (apr <= 9)  return 45;
  if (apr <= 12) return 28;
  if (apr <= 15) return 15;
  return 5;
}

/** Score price — market_value vs total payments */
export function scorePriceVsMarket(
  monthly_payment: number | null,
  term:            number | null,
  price_estimate:  PriceEstimate | null
): number {
  if (!price_estimate || !monthly_payment || !term) return 55; // unknown → neutral

  const totalPayments = monthly_payment * term;
  const market        = price_estimate.market_value;

  if (market <= 0) return 55;

  const ratio = totalPayments / market;

  if (ratio <= 0.50) return 100;
  if (ratio <= 0.60) return 90;
  if (ratio <= 0.70) return 80;
  if (ratio <= 0.80) return 68;
  if (ratio <= 0.90) return 55;
  if (ratio <= 1.00) return 42;
  if (ratio <= 1.15) return 28;
  if (ratio <= 1.30) return 15;
  return 5;
}

/** Score mileage limit — higher annual limit is better */
export function scoreMileage(mileage_limit: number | null): number {
  if (mileage_limit === null) return 60; // unknown → slightly positive default
  if (mileage_limit >= 20000) return 100;
  if (mileage_limit >= 15000) return 90;
  if (mileage_limit >= 13000) return 75;
  if (mileage_limit >= 12000) return 65;
  if (mileage_limit >= 10000) return 50;
  if (mileage_limit >= 8000)  return 30;
  return 15;
}

/** Score penalties — analyze text for severity */
export function scorePenalties(penalties: string | null): number {
  if (!penalties || penalties.trim().length === 0) return 90; // no penalties = great

  const lower = penalties.toLowerCase();

  // High severity indicators
  const highRisk = [
    "early termination", "termination fee", "disposition fee",
    "excess wear", "gap insurance required", "non-negotiable",
    "automatic renewal",
  ];

  // Medium severity
  const medRisk = [
    "wear and tear", "damage", "excess mileage charge",
    "acquisition fee", "documentation fee",
  ];

  // Count matches
  const highCount = highRisk.filter((k) => lower.includes(k)).length;
  const medCount  = medRisk.filter((k)  => lower.includes(k)).length;

  if (highCount >= 3) return 15;
  if (highCount >= 2) return 25;
  if (highCount >= 1) return 38;
  if (medCount  >= 2) return 55;
  if (medCount  >= 1) return 68;

  // Generic "fee" mention
  if (lower.includes("fee") || lower.includes("penalty") || lower.includes("charge")) return 72;

  return 82; // minimal penalty language
}

/** Get human-readable rating from score */
function getRating(score: number): FairnessResult["rating"] {
  if (score >= 80) return "excellent";
  if (score >= 65) return "good";
  if (score >= 50) return "fair";
  if (score >= 35) return "poor";
  return "very_poor";
}

const RATING_LABELS: Record<FairnessResult["rating"], string> = {
  excellent: "This contract is very competitive.",
  good:      "This contract is above average.",
  fair:      "This contract is average — some terms worth negotiating.",
  poor:      "This contract has unfavourable terms. Negotiate before signing.",
  very_poor: "This contract is significantly below market. Consider walking away.",
};

/** Compute full fairness score with breakdown */
export function computeFairness(
  sla:            SlaData,
  price_estimate: PriceEstimate | null
): FairnessResult {
  const apr_score     = scoreApr(sla.apr);
  const price_score   = scorePriceVsMarket(sla.monthly_payment, sla.term, price_estimate);
  const mileage_score = scoreMileage(sla.mileage_limit);
  const penalty_score = scorePenalties(sla.penalties);

  const weighted_total =
    apr_score     * WEIGHTS.apr     +
    price_score   * WEIGHTS.price   +
    mileage_score * WEIGHTS.mileage +
    penalty_score * WEIGHTS.penalty;

  const fairness_score = toScore(clamp(weighted_total, 0, 100));
  const rating         = getRating(fairness_score);

  return {
    fairness_score,
    breakdown: {
      apr_score:      toScore(apr_score),
      price_score:    toScore(price_score),
      mileage_score:  toScore(mileage_score),
      penalty_score:  toScore(penalty_score),
      weighted_total: toScore(weighted_total),
    },
    rating,
    rating_label: RATING_LABELS[rating],
  };
}