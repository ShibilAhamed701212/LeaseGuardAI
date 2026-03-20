// shared/utils/riskAnalyzer.ts — contract risk flag detection

import { type SlaData, type PriceEstimate } from "./normalizer";

export interface RiskFlag {
  code:     string;
  severity: "high" | "medium" | "low";
  label:    string;
  detail:   string;
}

export interface RiskAnalysis {
  risk_flags:  RiskFlag[];
  risk_level:  "high" | "medium" | "low" | "none";
  flag_count:  number;
}

/** APR risk flags */
function analyzeApr(apr: number | null): RiskFlag[] {
  const flags: RiskFlag[] = [];
  if (apr === null) {
    flags.push({ code: "APR_MISSING", severity: "medium", label: "APR not found", detail: "APR was not detected in the contract. Verify before signing." });
    return flags;
  }
  if (apr > 15) flags.push({ code: "APR_VERY_HIGH", severity: "high",   label: "Very high APR",    detail: `APR of ${apr}% is well above market average (3–6%).` });
  else if (apr > 10) flags.push({ code: "APR_HIGH",      severity: "high",   label: "High APR",         detail: `APR of ${apr}% is above average. Negotiate for under 7%.` });
  else if (apr > 7)  flags.push({ code: "APR_ELEVATED",  severity: "medium", label: "Elevated APR",     detail: `APR of ${apr}% is slightly above competitive rates.` });
  return flags;
}

/** Mileage risk flags */
function analyzeMileage(mileage_limit: number | null): RiskFlag[] {
  const flags: RiskFlag[] = [];
  if (mileage_limit === null) return flags;
  if (mileage_limit < 8000)  flags.push({ code: "MILEAGE_VERY_LOW", severity: "high",   label: "Very low mileage limit", detail: `${mileage_limit.toLocaleString()} miles/year is very restrictive. Excess charges will likely apply.` });
  else if (mileage_limit < 10000) flags.push({ code: "MILEAGE_LOW",      severity: "high",   label: "Low mileage limit",      detail: `${mileage_limit.toLocaleString()} miles/year is below average. Consider negotiating to 12,000+.` });
  else if (mileage_limit < 12000) flags.push({ code: "MILEAGE_BELOW_AVG",severity: "medium", label: "Below-average mileage",  detail: `${mileage_limit.toLocaleString()} miles/year may not be enough for typical drivers.` });
  return flags;
}

/** Monthly payment risk flags */
function analyzeMonthlyPayment(
  monthly_payment: number | null,
  price_estimate:  PriceEstimate | null,
  term:            number | null
): RiskFlag[] {
  const flags: RiskFlag[] = [];
  if (!monthly_payment) return flags;

  if (monthly_payment > 1200) flags.push({ code: "PAYMENT_VERY_HIGH", severity: "high",   label: "Very high monthly payment", detail: `$${monthly_payment}/month is significantly above average.` });
  else if (monthly_payment > 800) flags.push({ code: "PAYMENT_HIGH",      severity: "medium", label: "High monthly payment",      detail: `$${monthly_payment}/month is above average for most lease agreements.` });

  // Check if total payments exceed market value
  if (price_estimate && term) {
    const total = monthly_payment * term;
    const ratio = total / price_estimate.market_value;
    if (ratio > 1.3) flags.push({ code: "TOTAL_EXCEEDS_VALUE", severity: "high", label: "Total payments exceed vehicle value", detail: `Total payments ($${total.toLocaleString()}) are ${Math.round((ratio - 1) * 100)}% above estimated market value.` });
    else if (ratio > 1.1) flags.push({ code: "TOTAL_NEAR_VALUE", severity: "medium", label: "Total payments near vehicle value", detail: "Consider buying vs leasing — total cost is close to vehicle market value." });
  }
  return flags;
}

/** Penalty risk flags */
function analyzePenalties(penalties: string | null): RiskFlag[] {
  const flags: RiskFlag[] = [];
  if (!penalties) return flags;
  const lower = penalties.toLowerCase();

  if (lower.includes("early termination"))  flags.push({ code: "EARLY_TERMINATION",  severity: "high",   label: "Early termination penalty",  detail: "Early exit fees can be substantial. Understand the cost before signing." });
  if (lower.includes("disposition fee"))    flags.push({ code: "DISPOSITION_FEE",    severity: "medium", label: "Disposition fee",            detail: "A disposition fee is charged at lease end if you don't buy or re-lease." });
  if (lower.includes("gap insurance") && lower.includes("required")) flags.push({ code: "GAP_REQUIRED", severity: "medium", label: "GAP insurance required", detail: "Required GAP insurance adds cost. Shop your own policy." });
  if (lower.includes("automatic renewal"))  flags.push({ code: "AUTO_RENEWAL",       severity: "high",   label: "Automatic renewal clause",   detail: "Auto-renewal clauses can lock you in. Verify opt-out terms." });
  if (lower.includes("excess wear"))        flags.push({ code: "EXCESS_WEAR",        severity: "low",    label: "Excess wear charges",        detail: "Normal wear standards vary. Ask dealer for written definition." });

  return flags;
}

/** Term risk flags */
function analyzeTerm(term: number | null): RiskFlag[] {
  const flags: RiskFlag[] = [];
  if (term === null) return flags;
  if (term > 60)     flags.push({ code: "TERM_VERY_LONG", severity: "medium", label: "Very long lease term", detail: `${term}-month lease is unusually long. Depreciation risk increases.` });
  else if (term > 48) flags.push({ code: "TERM_LONG",     severity: "low",    label: "Long lease term",      detail: `${term}-month lease is above average. Consider flexibility needs.` });
  return flags;
}

/** Compute overall risk level from flags */
function computeRiskLevel(flags: RiskFlag[]): RiskAnalysis["risk_level"] {
  if (flags.length === 0) return "none";
  if (flags.some((f) => f.severity === "high")) return "high";
  if (flags.some((f) => f.severity === "medium")) return "medium";
  return "low";
}

/** Run full risk analysis */
export function analyzeRisks(
  sla:            SlaData,
  price_estimate: PriceEstimate | null
): RiskAnalysis {
  const flags: RiskFlag[] = [
    ...analyzeApr(sla.apr),
    ...analyzeMileage(sla.mileage_limit),
    ...analyzeMonthlyPayment(sla.monthly_payment, price_estimate, sla.term),
    ...analyzePenalties(sla.penalties),
    ...analyzeTerm(sla.term),
  ];

  return {
    risk_flags: flags,
    risk_level: computeRiskLevel(flags),
    flag_count: flags.length,
  };
}