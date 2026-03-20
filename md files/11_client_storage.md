# 💾 CLIENT STORAGE — OCR AGENT

## 🎯 GOAL

Design a **client-side storage system** that:

* Stores ALL final processed data locally
* Supports:

  * Web (IndexedDB)
  * Mobile (SQLite)
* Enables offline access
* Ensures user data never leaves device after processing

---

## 🧠 CONTEXT

This is part of a **continuation system**.

You MUST:

* Follow `99_master_prompt.md`
* Follow `98_global_rules.md`
* Follow `97_repo_structure.md`
* Align with backend + API contracts

---

# 🔥 CORE PRINCIPLE

> ❗ ALL FINAL DATA LIVES ON CLIENT

Server only processes → client owns data

---

# 📦 DATA TO STORE

```json id="l2p9x3"
{
  "job_id": "string",
  "sla": {},
  "vin": {},
  "price_estimate": {},
  "fairness_score": number,
  "negotiation_tips": [],
  "created_at": "timestamp"
}
```

---

# 🟢 WEB IMPLEMENTATION (IndexedDB)

## 📂 Location

```id="f7x3n8"
frontend/src/services/storage/
```

---

## ⚙️ REQUIREMENTS

* Use IndexedDB
* Create database: `ocr_agent_db`
* Store results in table: `documents`

---

## 📊 SCHEMA

```js id="n9t4v1"
{
  job_id: string (primary key),
  data: object,
  created_at: timestamp
}
```

---

## 🔌 FUNCTIONS TO IMPLEMENT

* saveDocument(data)
* getDocument(job_id)
* getAllDocuments()
* deleteDocument(job_id)

---

# 🔵 MOBILE IMPLEMENTATION (SQLite)

## 📂 Location

```id="v5c2k7"
frontend/src/mobile/storage/
```

---

## ⚙️ REQUIREMENTS

* SQLite database
* Table: documents

---

## 📊 SCHEMA

```sql id="b8m3p2"
CREATE TABLE documents (
  job_id TEXT PRIMARY KEY,
  data TEXT,
  created_at TIMESTAMP
);
```

---

## 🔌 FUNCTIONS

* insertDocument()
* fetchDocument()
* fetchAllDocuments()
* deleteDocument()

---

# 🔄 DATA FLOW

## 🟢 AFTER PROCESSING

```text id="h4p6v9"
Backend → returns result
Frontend → stores in IndexedDB / SQLite
```

---

## 🔵 OFFLINE ACCESS

User can:

* View past documents
* Access analysis
* Reuse negotiation tips

---

# 🧠 SYNC RULE (IMPORTANT)

* NO automatic cloud sync
* Data remains local unless user exports

---

# 🔐 SECURITY RULES

* Do NOT store sensitive data in plain text (optional encryption)
* Validate stored data
* Prevent duplication

---

# ⚠️ EDGE CASES

* Duplicate job_id → overwrite or reject
* Storage full → notify user
* Corrupted data → fallback handling

---

# 🧠 OPTIONAL ENHANCEMENT

## 🔒 Encryption

* Encrypt stored JSON before saving
* Use simple AES encryption

---

# 📁 EXPECTED FILES

```id="t3k8n6"
frontend/src/services/storage/
│
├── indexedDB.ts
├── storageService.ts
└── types.ts

frontend/src/mobile/storage/
│
├── sqlite.ts
└── storageService.ts
```

---

# 🔗 INTEGRATION

Frontend must:

1. Call `/result/:job_id`
2. Store response locally
3. Display from local storage

---

# 🧠 CLAUDE TASK

### 🚨 VERY IMPORTANT

Generate:

* IndexedDB service (web)
* SQLite service (mobile)
* Storage abstraction layer
* Type definitions

---

## 📦 OUTPUT FORMAT (MANDATORY)

```bash id="k7p2v4"
mkdir -p ...

cat << 'EOF' > file
code
EOF
```

---

## ❗ FINAL RULES

* Must be production-ready
* Must handle errors
* Must support CRUD operations
* Must be modular

---

## 🚀 END GOAL

A client system that:

* Owns all user data
* Works offline
* Maintains privacy

