# 🧠 LLM PROCESSING — OCR AGENT

## 🎯 GOAL

Build an **AI processing layer** that:

* Takes OCR text as input
* Extracts structured SLA data
* Generates:

  * VIN info (if detected)
  * Price estimation hints
  * Fairness score inputs
  * Negotiation suggestions
* Supports:

  * Ollama (local models)
  * Cloud LLMs (OpenAI / Claude)
* Ensures **strict JSON output**

---

## 🧠 CONTEXT

This is part of a **continuation system**.

You MUST:

* Follow `99_master_prompt.md`
* Follow `98_global_rules.md`
* Follow `97_repo_structure.md`
* Integrate with `07_n8n_workflow.md`

---

## 📁 LOCATION

```id="9b6k3f"
services/ai/
```

---

# 🔄 INPUT

```json id="k2m4x8"
{
  "text": "OCR extracted text",
  "ai": "ollama" | "openai" | "claude"
}
```

---

# 📦 OUTPUT (STRICT)

```json id="n8z5y1"
{
  "sla": {
    "apr": number,
    "monthly_payment": number,
    "term": number,
    "residual_value": number,
    "mileage_limit": number,
    "penalties": "string"
  },
  "vin": "string",
  "price_hints": {},
  "negotiation_tips": ["string"]
}
```

---

# 🧠 CORE COMPONENTS

---

## 🟢 1. PROMPT ENGINE

Create reusable prompts:

---

### 🔥 SLA EXTRACTION PROMPT

```text id="3m5c2z"
You are an expert financial contract analyzer.

Extract the following from the text:
- APR
- Monthly payment
- Lease term
- Residual value
- Mileage limit
- Penalties
- VIN (if present)

Return ONLY valid JSON.

Do not explain anything.
Do not add extra text.
```

---

## 🔵 2. MODEL SWITCHING

---

### 🟢 Ollama

```http id="b6k2v7"
POST http://ollama:11434/api/generate
```

Body:

```json id="k3v7p2"
{
  "model": "llama3",
  "prompt": "...",
  "stream": false
}
```

---

### 🔵 Cloud (OpenAI / Claude)

* Use API keys from env
* Same prompt format

---

# 🧠 3. RESPONSE PARSER (VERY IMPORTANT)

LLMs may return:

* extra text
* invalid JSON

---

## You MUST:

* Extract JSON safely
* Validate structure
* Fix minor formatting errors

---

## Example:

```js id="0k9n2q"
try {
  const parsed = JSON.parse(cleanedText);
} catch {
  // fallback cleaning
}
```

---

# 🧠 4. VALIDATION LAYER

Ensure:

* All required fields exist
* Types are correct
* Missing values → null

---

# 🧠 5. FALLBACK STRATEGY

If:

* Ollama fails → use OpenAI
* JSON invalid → retry once
* Missing fields → partial output

---

# 🧠 6. NEGOTIATION LOGIC

Use AI to generate:

```json id="6m4t9z"
[
  "Ask dealer to reduce APR",
  "Negotiate mileage cap",
  "Check hidden penalties"
]
```

---

# 🔐 PRIVACY RULES

* Do NOT store text
* Do NOT log full document
* Process in memory only

---

# 🐳 DOCKER REQUIREMENTS

Create:

```id="7q3v5p"
services/ai/Dockerfile
```

* Supports both Ollama + cloud APIs
* Exposes API endpoint

---

# 🔌 API ENDPOINT

```http id="b5k1z9"
POST /ai/process
```

---

# 📁 EXPECTED FILES

```id="g4p2x8"
services/ai/
│
├── controller/
│   └── process.ts
│
├── providers/
│   ├── ollama.ts
│   ├── openai.ts
│   └── claude.ts
│
├── prompts/
│   └── slaPrompt.ts
│
├── utils/
│   ├── parser.ts
│   └── validator.ts
│
├── app.ts
├── Dockerfile
└── package.json
```

---

# 🔗 INTEGRATION

n8n will call:

```http id="z2p6q7"
POST http://ai-service:port/ai/process
```

---

# ⚠️ ERROR HANDLING

* Invalid AI response → retry
* API failure → fallback model
* Timeout → return partial

---

# 🧠 CLAUDE TASK

### 🚨 VERY IMPORTANT

Generate:

* Full AI service (Node.js recommended)
* Model switching logic
* Prompt templates
* JSON parser + validator
* Dockerfile

---

## 📦 OUTPUT FORMAT (MANDATORY)

```bash id="q2n6v1"
mkdir -p ...

cat << 'EOF' > file
code
EOF
```

---

## ❗ FINAL RULES

* Must be production-ready
* Must handle failures
* Must enforce JSON output
* Must be modular

---

## 🚀 END GOAL

An AI layer that:

* Converts OCR text → structured intelligence
* Supports multiple models
* Is reliable and robust
