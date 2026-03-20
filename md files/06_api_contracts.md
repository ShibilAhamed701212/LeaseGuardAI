# 🔌 API CONTRACTS — OCR AGENT

## 🎯 GOAL

Define **strict request/response contracts** for all backend APIs.

This ensures:

* Frontend works correctly
* Backend is consistent
* n8n integration is stable

---

## 🧠 CONTEXT

This is part of a **continuation system**.

You MUST:

* Follow `99_master_prompt.md`
* Follow `98_global_rules.md`
* Follow `97_repo_structure.md`
* Align with `05_backend_architecture.md`

---

## ⚠️ CRITICAL RULE

These contracts are **STRICT**.

* Do NOT change field names
* Do NOT add/remove fields unless necessary
* Always return structured JSON

---

# 🔥 1. UPLOAD API

## Endpoint

```http id="0d85m9"
POST /upload
```

---

## Request

Content-Type: `multipart/form-data`

| Field   | Type   | Required |
| ------- | ------ | -------- |
| file    | File   | ✅        |
| user_id | string | ✅        |

---

## Response

```json id="hcrr7o"
{
  "job_id": "string",
  "status": "uploaded"
}
```

---

## Errors

```json id="y9x9p5"
{
  "error": "File upload failed"
}
```

---

# 🔥 2. PROCESS API

## Endpoint

```http id="e8u7o5"
POST /process
```

---

## Request

```json id="4u4hl5"
{
  "job_id": "string",
  "ocr": "tesseract" | "paddle",
  "ai": "ollama" | "openai" | "claude"
}
```

---

## Response

```json id="0sm9zq"
{
  "job_id": "string",
  "status": "processing"
}
```

---

## Errors

```json id="42cqqe"
{
  "error": "Invalid job_id or parameters"
}
```

---

# 🔥 3. STATUS API

## Endpoint

```http id="48rb0c"
GET /status/:job_id
```

---

## Response

```json id="y3yr3z"
{
  "job_id": "string",
  "status": "uploaded" | "processing" | "completed" | "failed" | "deleted"
}
```

---

# 🔥 4. RESULT API

## Endpoint

```http id="r7kqdr"
GET /result/:job_id
```

---

## Response

```json id="ldz1m7"
{
  "job_id": "string",
  "status": "completed",
  "data": {
    "sla": {
      "apr": number,
      "monthly_payment": number,
      "term": number,
      "residual_value": number,
      "mileage_limit": number,
      "penalties": string
    },
    "vin": {
      "make": "string",
      "model": "string",
      "year": number
    },
    "price_estimate": {
      "market_value": number,
      "confidence": number
    },
    "fairness_score": number,
    "negotiation_tips": ["string"]
  }
}
```

---

## Errors

```json id="9bqdzm"
{
  "error": "Result not available"
}
```

---

# 🔥 5. CLEANUP API

## Endpoint

```http id="4f6b1y"
DELETE /cleanup/:job_id
```

---

## Response

```json id="1nn8mn"
{
  "job_id": "string",
  "status": "deleted"
}
```

---

# 🔄 INTERNAL CONTRACT (n8n WEBHOOK)

## Endpoint (n8n)

```http id="qeyxv1"
POST /webhook/process
```

---

## Request

```json id="d3u7m6"
{
  "job_id": "string",
  "file_url": "string",
  "ocr": "tesseract" | "paddle",
  "ai": "ollama" | "openai" | "claude"
}
```

---

## Response

```json id="6r9cfd"
{
  "job_id": "string",
  "status": "completed",
  "result": {}
}
```

---

# 🧠 VALIDATION RULES

* `job_id` must exist
* `ocr` must be valid enum
* `ai` must be valid enum
* File must be PDF/image

---

# 🔐 SECURITY RULES

* Validate all inputs
* Use signed URLs for MinIO access
* Do NOT expose internal services

---

# ⚠️ EDGE CASES

* Missing file → reject
* Invalid OCR/AI → reject
* n8n timeout → mark failed
* Empty OCR output → retry

---

# 📁 EXPECTED USAGE

This file will be used by Claude to:

* Generate backend APIs
* Generate frontend API calls
* Generate n8n webhook structure

---

# 🧠 CLAUDE TASK

### 🚨 READ CAREFULLY

When generating code:

* Follow ALL contracts exactly
* Do NOT rename fields
* Ensure type safety
* Validate inputs

---

## 📦 OUTPUT FORMAT (MANDATORY)

Return ALL code as:

```bash id="2y6zyv"
mkdir -p ...

cat << 'EOF' > file
code
EOF
```

---

## ❗ FINAL RULE

This file defines **truth of communication**.

Breaking this = system failure.
