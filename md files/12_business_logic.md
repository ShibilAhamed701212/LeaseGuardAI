# 🧠 BUSINESS LOGIC — OCR AGENT

## 🎯 GOAL

Implement the **core intelligence layer** that:

* Computes fairness score
* Evaluates contract quality
* Generates negotiation insights
* Enhances AI output with rule-based logic

---

## 🧠 CONTEXT

This is part of a **continuation system**.

You MUST:

* Follow `99_master_prompt.md`
* Follow `98_global_rules.md`
* Follow `97_repo_structure.md`
* Align with:

  * LLM output (`09_llm_processing.md`)
  * API contracts (`06_api_contracts.md`)

---

# 🔥 INPUT

```json id="r7m4p2"
{
  "sla": {
    "apr": number,
    "monthly_payment": number,
    "term": number,
    "residual_value": number,
    "mileage_limit": number,
    "penalties": "string"
  },
  "vin": {},
  "price_estimate": {
    "market_value": number,
    "confidence": number
  }
}
```

---

# 🎯 OUTPUT

```json id="k8p2x7"
{
  "fairness_score": number,
  "risk_flags": [],
  "negotiation_tips": []
}
```

---

# ⚖️ 1. FAIRNESS SCORE ENGINE

## 🔥 Formula (Base)

```js id="q3v8n1"
score = (
  price_score +
  apr_score +
  mileage_score +
  penalty_score
) / 4
```

---

## 🧠 COMPONENT SCORES

---

### 🟢 PRICE SCORE

```js id="x2k4v6"
price_score = market_value / monthly_payment
```

Normalize to 0–100

---

### 🔵 APR SCORE

```js id="m4t7p9"
if (apr < 5) score = 90
else if (apr < 10) score = 70
else score = 40
```

---

### 🟡 MILEAGE SCORE

```js id="v7p2k3"
if (mileage_limit >= 15000) score = 90
else if (>= 10000) score = 70
else score = 40
```

---

### 🔴 PENALTY SCORE

* Analyze penalty text

```js id="p9m3x5"
if (penalties.includes("high")) score = 40
else score = 80
```

---

# 🚨 2. RISK FLAGS

Generate flags like:

```json id="t6k8v2"
[
  "High APR",
  "Low mileage limit",
  "Hidden penalties"
]
```

---

## RULES

* APR > 10 → "High APR"
* Mileage < 10k → "Low mileage"
* Penalties mention "fee" → flag

---

# 💡 3. NEGOTIATION ENGINE

Combine:

* AI suggestions
* Rule-based insights

---

## EXAMPLES

```json id="d4p7x9"
[
  "Negotiate APR down",
  "Ask for higher mileage cap",
  "Remove hidden penalty clauses"
]
```

---

# 🧠 4. ENHANCEMENT LAYER

Improve AI output:

* Fill missing values
* Normalize numbers
* Validate ranges

---

# 🔄 5. NORMALIZATION

Ensure:

* Scores between 0–100
* No null crashes
* Default values if missing

---

# ⚠️ EDGE CASES

* Missing APR → assume medium risk
* Missing mileage → neutral score
* No penalties → high score

---

# 🔐 RULES

* No external API calls here
* Pure logic only
* Deterministic output

---

# 📁 LOCATION

```id="z7m3k1"
shared/utils/
```

---

# 📁 EXPECTED FILES

```id="p4v2x6"
shared/utils/
│
├── fairnessEngine.ts
├── riskAnalyzer.ts
├── negotiationEngine.ts
└── normalizer.ts
```

---

# 🔗 INTEGRATION

This module will be used by:

* n8n workflow
* AI service
* Backend (optional validation)

---

# 🧠 CLAUDE TASK

### 🚨 VERY IMPORTANT

Generate:

* Fairness score engine
* Risk analysis module
* Negotiation suggestion engine
* Data normalization utilities

---

## 📦 OUTPUT FORMAT (MANDATORY)

```bash id="r2k7m8"
mkdir -p ...

cat << 'EOF' > file
code
EOF
```

---

## ❗ FINAL RULES

* Must be pure functions
* Must be testable
* Must be modular
* Must handle edge cases

---

## 🚀 END GOAL

A smart logic layer that:

* Evaluates contracts
* Detects risks
* Helps users negotiate better
