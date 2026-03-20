# 🧩 FEATURE SPECIFICATION — OCR AGENT

## 🎯 GOAL

Define all **core features and capabilities** of the system to ensure:

* Complete implementation
* No missing functionality
* Consistent behavior across frontend, backend, and AI layers

---

## 🧠 CONTEXT

This is part of a **continuation system**.

You MUST:

* Follow `99_master_prompt.md`
* Follow `98_global_rules.md`
* Follow `97_repo_structure.md`
* Align with all PRD files

---

# 🔥 CORE FEATURES

---

## 🟢 1. DOCUMENT UPLOAD

### DESCRIPTION

User can upload:

* PDF files
* Image files (JPG, PNG)

---

### REQUIREMENTS

* Validate file type
* Generate job_id
* Store temporarily (MinIO)
* Return job_id

---

## 🟡 2. OCR EXTRACTION

### DESCRIPTION

Extract text from uploaded document using:

* Tesseract (fast)
* PaddleOCR (accurate)

---

### REQUIREMENTS

* User selects OCR engine
* Normalize extracted text
* Handle multi-page documents

---

## 🔵 3. AI-BASED SLA EXTRACTION

### DESCRIPTION

Extract structured contract data:

---

### FIELDS

```json id="s2k7p3"
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

### REQUIREMENTS

* Strict JSON output
* Validate extracted fields
* Handle missing values

---

## 🟣 4. VIN DETECTION + LOOKUP

### DESCRIPTION

* Detect VIN from document
* Fetch vehicle data

---

### REQUIREMENTS

* Extract VIN from OCR text
* Call external VIN API
* Return:

  * make
  * model
  * year

---

## 🔴 5. PRICE ESTIMATION

### DESCRIPTION

Estimate fair price using:

* VIN data
* Market references

---

### REQUIREMENTS

* Compute approximate market value
* Provide confidence score

---

## ⚖️ 6. FAIRNESS SCORE

### DESCRIPTION

Evaluate contract quality

---

### REQUIREMENTS

* Use business logic module
* Score between 0–100
* Based on:

  * APR
  * price
  * mileage
  * penalties

---

## 💡 7. NEGOTIATION ASSISTANT

### DESCRIPTION

Provide actionable suggestions

---

### REQUIREMENTS

* Combine AI + rule-based insights
* Output list of tips

---

## 🧠 8. MODEL SELECTION

### DESCRIPTION

User selects:

* OCR engine
* AI model

---

### REQUIREMENTS

* Must support:

  * Tesseract / Paddle
  * Ollama / OpenAI / Claude

---

## 💾 9. LOCAL STORAGE

### DESCRIPTION

Store processed results on client

---

### REQUIREMENTS

* IndexedDB (web)
* SQLite (mobile)
* CRUD support

---

## 🔄 10. JOB STATUS TRACKING

### DESCRIPTION

Track processing state

---

### STATES

```text id="w4p2k9"
uploaded → processing → completed → failed → deleted
```

---

### REQUIREMENTS

* Backend stores metadata
* Frontend polls status

---

## 🧹 11. CLEANUP SYSTEM

### DESCRIPTION

Remove all server-side data

---

### REQUIREMENTS

* Delete MinIO files
* Clear Redis
* No leftover data

---

## 📊 12. RESULT DISPLAY

### DESCRIPTION

Show structured output

---

### UI MUST SHOW:

* SLA data
* VIN info
* Price estimate
* Fairness score
* Negotiation tips

---

## 📜 13. HISTORY VIEW

### DESCRIPTION

User can view past results

---

### REQUIREMENTS

* Fetch from local storage
* Allow delete

---

# ⚠️ NON-FUNCTIONAL REQUIREMENTS

---

## ⚡ PERFORMANCE

* Fast processing
* Async operations

---

## 🔐 SECURITY

* Validate inputs
* No sensitive storage

---

## 🧠 RELIABILITY

* Retry failed steps
* Handle AI errors

---

# 🧠 CLAUDE TASK

### 🚨 VERY IMPORTANT

When generating code:

* Implement ALL features listed
* Do NOT skip any feature
* Ensure integration across modules
* Maintain consistency

---

## ❗ FINAL RULE

This file defines **WHAT must exist**.

Missing anything here = incomplete system.
