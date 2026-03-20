# 🎨 FRONTEND ARCHITECTURE — OCR AGENT

## 🎯 GOAL

Build a **React-based frontend (Firebase Hosting ready)** that:

* Allows file upload
* Lets user choose:

  * OCR engine
  * AI model
* Displays processed results
* Stores data locally (IndexedDB)
* Communicates with backend APIs

---

## 🧠 CONTEXT

This is part of a **continuation system**.

You MUST:

* Follow `99_master_prompt.md`
* Follow `98_global_rules.md`
* Follow `97_repo_structure.md`
* Follow API contracts (`06_api_contracts.md`)
* Integrate with client storage (`11_client_storage.md`)

---

# 📁 LOCATION

```id="p8m3x2"
frontend/
```

---

# 🧱 APP STRUCTURE

```id="k2v7m1"
frontend/src/
│
├── pages/
│   ├── Home.tsx
│   ├── Upload.tsx
│   ├── Result.tsx
│   └── History.tsx
│
├── components/
│   ├── FileUploader.tsx
│   ├── ModelSelector.tsx
│   ├── ResultCard.tsx
│   └── Loader.tsx
│
├── services/
│   ├── api.ts
│   └── storage/
│
├── hooks/
│   ├── useUpload.ts
│   ├── useProcess.ts
│   └── useResult.ts
│
├── utils/
│   └── helpers.ts
│
├── App.tsx
└── main.tsx
```

---

# 🧭 ROUTING

Use React Router:

```id="p7t2m4"
/ → Home
/upload → Upload page
/result/:job_id → Result page
/history → History page
```

---

# 🔌 API SERVICE

## 📂

```id="t5v9x3"
frontend/src/services/api.ts
```

---

## FUNCTIONS

* uploadFile(file)
* processDocument(job_id, ocr, ai)
* getStatus(job_id)
* getResult(job_id)
* cleanup(job_id)

---

# 🔄 DATA FLOW

## 🟢 Upload Flow

```text id="q1p8k2"
User uploads file
→ call /upload
→ receive job_id
```

---

## 🟡 Process Flow

```text id="m6v2x9"
User selects OCR + AI
→ call /process
→ polling /status
```

---

## 🔵 Result Flow

```text id="n3t7k4"
Fetch /result
→ store in IndexedDB
→ display
```

---

# 🧠 STATE MANAGEMENT

* Use React hooks (no heavy state library)
* Store:

  * job_id
  * status
  * result

---

# 🔥 KEY COMPONENTS

---

## 🟢 FileUploader

* Accept PDF/image
* Validate file type
* Trigger upload

---

## 🔵 ModelSelector

* Dropdown for:

  * OCR: Tesseract / Paddle
  * AI: Ollama / OpenAI / Claude

---

## 🟡 ResultCard

* Display:

  * SLA data
  * VIN info
  * Fairness score
  * Negotiation tips

---

## 🔴 Loader

* Show processing state

---

# 🧠 HOOKS

---

## useUpload

* Handles file upload
* Returns job_id

---

## useProcess

* Triggers processing
* Polls status

---

## useResult

* Fetches result
* Stores locally

---

# 🔐 VALIDATION

* Only allow PDF/images
* Handle API errors
* Show user-friendly messages

---

# 🎨 UI RULES

* Clean and minimal
* Mobile responsive
* Clear feedback

---

# ⚠️ EDGE CASES

* Upload fails → retry
* Processing stuck → timeout
* Result missing → error state

---

# 🔗 FIREBASE

* Hosting only
* No logic in frontend for backend

---

# 📁 EXPECTED FILES

```id="v4p2k7"
frontend/
│
├── src/pages/*.tsx
├── src/components/*.tsx
├── src/hooks/*.ts
├── src/services/api.ts
├── src/App.tsx
└── src/main.tsx
```

---

# 🧠 CLAUDE TASK

### 🚨 VERY IMPORTANT

Generate:

* Full React app structure
* Pages + components
* Hooks + API service
* Routing setup

---

## 📦 OUTPUT FORMAT (MANDATORY)

```bash id="z8k3m2"
mkdir -p ...

cat << 'EOF' > file
code
EOF
```

---

## ❗ FINAL RULES

* Must be production-ready
* Must follow structure
* Must integrate with backend APIs
* Must be modular

---

## 🚀 END GOAL

A frontend that:

* Uploads documents
* Controls processing
* Displays insights
* Stores data locally

