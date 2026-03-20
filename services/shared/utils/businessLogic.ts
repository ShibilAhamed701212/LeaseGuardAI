// shared/utils/businessLogic.ts — main business logic orchestrator

import { normalizeInput, type BusinessInput } from "./normalizer";
import { computeFairness, type FairnessResult } from "./fairnessEngine";
import { analyzeRisks, type RiskAnalysis } from "./riskAnalyzer";
import { generateNegotiationTips, flattenTips, type NegotiationResult } from "./negotiationEngine";

export interface BusinessLogicInput extends Partial<BusinessInput> {
  ai_tips?: string[];   // optional tips from LLM to merge in
}

export interface BusinessLogicOutput {
  fairness_score:    number;
  fairness_rating:   string;
  fairness_label:    string;
  breakdown:         FairnessResult["breakdown"];
  risk_flags:        RiskAnalysis["risk_flags"];
  risk_level:        RiskAnalysis["risk_level"];
  negotiation_tips:  string[];
  negotiation_summary: string;
}

/**
 * Run full business logic pipeline.
 * Pure function — no side effects, no external calls.
 */
export function runBusinessLogic(raw: BusinessLogicInput): BusinessLogicOutput {
  // 1. Normalize input
  const input = normalizeInput(raw);
  const { sla, price_estimate } = input;

  // 2. Compute fairness score
  const fairness = computeFairness(sla, price_estimate);

  // 3. Analyze risks
  const risks = analyzeRisks(sla, price_estimate);

  // 4. Generate negotiation tips
  const negotiation = generateNegotiationTips(
    sla,
    price_estimate,
    risks.risk_flags,
    fairness,
    raw.ai_tips ?? []
  );

  return {
    fairness_score:      fairness.fairness_score,
    fairness_rating:     fairness.rating,
    fairness_label:      fairness.rating_label,
    breakdown:           fairness.breakdown,
    risk_flags:          risks.risk_flags,
    risk_level:          risks.risk_level,
    negotiation_tips:    flattenTips(negotiation),
    negotiation_summary: negotiation.summary,
  };
}