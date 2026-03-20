# 🧠 N8N WORKFLOW — OCR AGENT

## 🎯 GOAL

Build a **complete n8n workflow** that:

* Receives job from backend
* Downloads file from MinIO (via signed URL)
* Runs OCR (Tesseract or Paddle)
* Runs AI processing (Ollama or Cloud)
* Calls external APIs (VIN + pricing)
* Computes fairness score
* Returns structured result
* Triggers cleanup

---

## 🧠 CONTEXT

This is part of a **continuation system**.

You MUST:

* Follow `99_master_prompt.md`
* Follow `98_global_rules.md`
* Follow `97_repo_structure.md`
* Follow `05_backend_architecture.md`
* Follow `06_api_contracts.md`

---

## 🔥 ENTRY POINT

### Webhook Node

```http id="oj0d6q"
POST /webhook/process
```

---

## 📥 INPUT PAYLOAD

```json id="7wq4l6"
{
  "job_id": "string",
  "file_url": "string",
  "ocr": "tesseract" | "paddle",
  "ai": "ollama" | "openai" | "claude"
}
```

---

# 🔄 WORKFLOW STEPS

---

## 🟢 1. DOWNLOAD FILE

### Node: HTTP Request

* Method: GET
* URL: `{{$json["file_url"]}}`
* Save as binary

---

## 🟡 2. OCR SWITCH

### Node: IF

Condition:

```js id="u4ev1j"
{{$json["ocr"] === "tesseract"}}
```

---

### 🔵 Branch A: Tesseract

Node: Execute Command

```bash id="8u7j7p"
tesseract input.pdf output.txt
```

Output:

* Extracted text

---

### 🟣 Branch B: PaddleOCR

Node: Python

```python id="nqczc6"
from paddleocr import PaddleOCR
ocr = PaddleOCR()
result = ocr.ocr("input.pdf")
```

---

## 🔄 3. NORMALIZE TEXT

* Merge both OCR outputs
* Clean text
* Remove noise

---

## 🧠 4. AI SWITCH

### Node: IF

```js id="c2b3os"
{{$json["ai"] === "ollama"}}
```

---

### 🔵 Branch A: Ollama

Node: HTTP Request

```http id="7o3t5m"
POST http://ollama:11434/api/generate
```

Body:

```json id="m3yk2b"
{
  "model": "llama3",
  "prompt": "Extract structured SLA data..."
}
```

---

### 🟣 Branch B: Cloud LLM

Node: HTTP Request

* OpenAI / Claude API

---

## 🧾 5. SLA EXTRACTION

AI must return:

```json id="36u1ap"
{
  "apr": number,
  "monthly_payment": number,
  "term": number,
  "residual_value": number,
  "mileage_limit": number,
  "penalties": "string"
}
```

---

## 🚗 6. VIN API

Node: HTTP Request

```http id="x9gxpl"
GET https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{vin}
```

---

## 💰 7. PRICE ESTIMATION

* Combine:

  * VIN data
  * Market APIs
  * Heuristic logic

---

## ⚖️ 8. FAIRNESS SCORE

Formula:

```js id="36g1rz"
score = (price + apr + penalties + mileage) / 4
```

---

## 📦 9. FORMAT RESULT

Output must match:

```json id="x0dfj9"
{
  "job_id": "...",
  "status": "completed",
  "data": {
    "sla": {},
    "vin": {},
    "price_estimate": {},
    "fairness_score": number,
    "negotiation_tips": []
  }
}
```

---

## 🔁 10. STORE TEMP RESULT (Redis)

* Key: `job:{job_id}`
* TTL: short (e.g., 10 min)

---

## 📤 11. RETURN RESPONSE

Respond to webhook caller

---

## 🧹 12. CLEANUP

* Delete file from MinIO (via backend API)
* Remove temp OCR data

---

# ⚠️ ERROR HANDLING

* OCR failure → retry once
* AI failure → fallback model
* API failure → continue with partial data
* Timeout → mark job failed

---

# 🔐 PRIVACY RULES

* Do NOT store file permanently
* Do NOT log sensitive content
* Use temporary memory only

---

# 📁 OUTPUT REQUIREMENT

Claude MUST generate:

```id="o2zjnd"
n8n/workflows/ocr_pipeline.json
```

---

# 🧠 CLAUDE TASK

### 🚨 VERY IMPORTANT

Generate:

* FULL n8n workflow JSON
* Ready to import into n8n
* Proper nodes
* Proper connections
* Proper branching

---

## 📦 OUTPUT FORMAT (MANDATORY)

Return as:

```bash id="m9wgrq"
mkdir -p n8n/workflows

cat << 'EOF' > n8n/workflows/ocr_pipeline.json
{
  ...full workflow json...
}
EOF
```

---

## ❗ FINAL RULES

* No pseudo nodes
* No missing steps
* Must be executable
* Must match API contracts
* Must follow architecture

---

## 🚀 END GOAL

A complete automation pipeline that:

* Processes documents
* Extracts intelligence
* Returns structured output
* Maintains privacy
