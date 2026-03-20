// shared/utils/negotiationEngine.ts — negotiation tip generation

import { type SlaData, type PriceEstimate } from "./normalizer";
import { type RiskFlag } from "./riskAnalyzer";
import { type FairnessResult } from "./fairnessEngine";

export interface NegotiationTip {
  priority:  "high" | "medium" | "low";
  category:  "apr" | "payment" | "mileage" | "penalty" | "term" | "general";
  tip:       string;
}

export interface NegotiationResult {
  tips:            NegotiationTip[];
  summary:         string;
  top_priority:    string;
}

/** Generate tips from SLA data */
function tipsFromSla(sla: SlaData, price_estimate: PriceEstimate | null): NegotiationTip[] {
  const tips: NegotiationTip[] = [];

  // APR tips
  if (sla.apr !== null) {
    if (sla.apr > 10) tips.push({ priority: "high", category: "apr", tip: `Your APR is ${sla.apr}%. Push for under 7% — get pre-approved from your bank as leverage.` });
    else if (sla.apr > 6) tips.push({ priority: "high", category: "apr", tip: `APR of ${sla.apr}% has room to improve. Ask for 1–2% reduction with a strong credit score.` });
    else if (sla.apr > 3) tips.push({ priority: "medium", category: "apr", tip: `APR of ${sla.apr}% is reasonable, but try to get it under 3% by offering a larger down payment.` });
  } else {
    tips.push({ priority: "high", category: "apr", tip: "APR not found in contract. Demand explicit APR disclosure before signing." });
  }

  // Monthly payment tips
  if (sla.monthly_payment !== null && sla.monthly_payment > 600) {
    tips.push({ priority: "high", category: "payment", tip: `$${sla.monthly_payment}/month is high. Negotiate a larger residual value or longer term to reduce monthly cost.` });
  }

  // Price vs market tips
  if (price_estimate && sla.monthly_payment && sla.term) {
    const total = sla.monthly_payment * sla.term;
    const ratio = total / price_estimate.market_value;
    if (ratio > 1.1) {
      tips.push({ priority: "high", category: "payment", tip: `Total lease cost ($${total.toLocaleString()}) exceeds estimated vehicle value. Ask for a reduced cap cost or higher residual.` });
    }
  }

  // Mileage tips
  if (sla.mileage_limit !== null) {
    if (sla.mileage_limit < 10000) tips.push({ priority: "high",   category: "mileage", tip: `${sla.mileage_limit.toLocaleString()} miles/year is very restrictive. Negotiate to at least 12,000 — excess mileage fees add up fast.` });
    else if (sla.mileage_limit < 12000) tips.push({ priority: "high",   category: "mileage", tip: `Negotiate mileage from ${sla.mileage_limit.toLocaleString()} to 15,000/year. Pre-paying for extra miles is cheaper than overage charges.` });
    else if (sla.mileage_limit < 15000) tips.push({ priority: "medium", category: "mileage", tip: `${sla.mileage_limit.toLocaleString()} miles/year is slightly below ideal. Ask for 15,000 if you drive frequently.` });
  }

  // Penalty tips
  if (sla.penalties) {
    const lower = sla.penalties.toLowerCase();
    if (lower.includes("early termination")) tips.push({ priority: "high",   category: "penalty", tip: "Ask the dealer to cap early termination fees or provide a buyout option. Get the formula in writing." });
    if (lower.includes("disposition fee"))   tips.push({ priority: "medium", category: "penalty", tip: "Disposition fees ($300–500) can often be waived if you re-lease or purchase at end of term." });
    if (lower.includes("excess wear"))       tips.push({ priority: "low",    category: "penalty", tip: "Ask for a written definition of 'normal wear and tear' — ambiguity often costs money at lease end." });
  }

  // Term tips
  if (sla.term !== null) {
    if (sla.term > 48) tips.push({ priority: "medium", category: "term", tip: `A ${sla.term}-month lease is long. Consider 36 months for better flexibility and lower depreciation risk.` });
    if (sla.term < 24) tips.push({ priority: "low",    category: "term", tip: "Short lease terms often have higher monthly payments. Confirm this fits your budget." });
  }

  return tips;
}

/** Generate tips from risk flags */
function tipsFromRiskFlags(flags: RiskFlag[]): NegotiationTip[] {
  return flags
    .filter((f) => f.severity === "high")
    .map((f) => ({
      priority: "high" as const,
      category: "general" as const,
      tip: `Risk: ${f.label} — ${f.detail}`,
    }));
}

/** Generate tips from fairness score */
function tipsFromFairness(fairness: FairnessResult): NegotiationTip[] {
  const tips: NegotiationTip[] = [];
  const score = fairness.fairness_score;

  if (score < 35) {
    tips.push({ priority: "high", category: "general", tip: "This contract scores very poorly. Get competing quotes from 2–3 other dealers before signing." });
    tips.push({ priority: "high", category: "general", tip: "Consider buying instead of leasing — the total cost of this lease may exceed purchase price." });
  } else if (score < 50) {
    tips.push({ priority: "high", category: "general", tip: "Multiple terms are unfavourable. Focus negotiations on APR and monthly payment first — these have the largest impact." });
  } else if (score < 65) {
    tips.push({ priority: "medium", category: "general", tip: "Contract is average. Small improvements to APR or mileage cap could significantly improve value." });
  } else if (score >= 80) {
    tips.push({ priority: "low", category: "general", tip: "This is a competitive contract. Review penalty clauses carefully before signing." });
  }

  return tips;
}

/** Merge AI tips with rule-based tips, deduplicating */
function mergeTips(ruleTips: NegotiationTip[], aiTips: string[]): NegotiationTip[] {
  const merged = [...ruleTips];

  for (const aiTip of aiTips) {
    const duplicate = merged.some((t) =>
      t.tip.toLowerCase().includes(aiTip.toLowerCase().slice(0, 30))
    );
    if (!duplicate) {
      merged.push({ priority: "medium", category: "general", tip: aiTip });
    }
  }

  // Sort: high → medium → low
  const order = { high: 0, medium: 1, low: 2 };
  return merged.sort((a, b) => order[a.priority] - order[b.priority]);
}

/** Generate full negotiation analysis */
export function generateNegotiationTips(
  sla:            SlaData,
  price_estimate: PriceEstimate | null,
  risk_flags:     RiskFlag[],
  fairness:       FairnessResult,
  ai_tips:        string[] = []
): NegotiationResult {
  const sla_tips      = tipsFromSla(sla, price_estimate);
  const risk_tips     = tipsFromRiskFlags(risk_flags);
  const fairness_tips = tipsFromFairness(fairness);

  const all_rule_tips = [...sla_tips, ...risk_tips, ...fairness_tips];
  const merged        = mergeTips(all_rule_tips, ai_tips);

  // Cap at 8 tips to avoid overwhelming the user
  const final_tips = merged.slice(0, 8);

  const top = final_tips[0]?.tip ?? "Review all contract terms carefully before signing.";

  const summary = fairness.fairness_score >= 70
    ? "Contract is competitive. Minor optimizations possible."
    : fairness.fairness_score >= 50
    ? "Several terms are negotiable. Focus on high-priority items."
    : "Significant room for improvement. Strong negotiation recommended.";

  return {
    tips:         final_tips,
    summary,
    top_priority: top,
  };
}

/** Flatten tips to string array (for API contract compatibility) */
export function flattenTips(result: NegotiationResult): string[] {
  return result.tips.map((t) => t.tip);
}