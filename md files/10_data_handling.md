# 🔐 DATA HANDLING — OCR AGENT

## 🎯 GOAL

Design a **privacy-first data lifecycle system** that:

* Stores uploaded files **temporarily only**
* Deletes all server-side data after processing
* Stores final results **ONLY on client device**
* Ensures zero sensitive persistence on backend

---

## 🧠 CONTEXT

This is part of a **continuation system**.

You MUST:

* Follow `99_master_prompt.md`
* Follow `98_global_rules.md`
* Follow `97_repo_structure.md`
* Align with backend, n8n, OCR, and AI layers

---

# 🔥 CORE PRINCIPLE

> ❗ SERVER IS STATELESS FOR USER DATA

* No permanent storage of:

  * files
  * OCR text
  * extracted data

---

# 🔄 DATA LIFECYCLE

## 🟢 STEP 1: UPLOAD

* File uploaded → stored in MinIO

```id="c7m1k9"
/uploads/{job_id}/file.pdf
```

---

## 🟡 STEP 2: PROCESSING

* OCR + AI processing runs
* Temporary intermediate data:

```id="u5x8t2"
/temp/{job_id}/ocr.txt
```

---

## 🔵 STEP 3: RESULT GENERATED

* Result stored temporarily in Redis:

```id="j3v9p1"
key: job:{job_id}
TTL: 10 minutes
```

---

## 🔴 STEP 4: RESPONSE

* Result returned to frontend
* Frontend stores locally (IndexedDB / SQLite)

---

## ⚫ STEP 5: CLEANUP (MANDATORY)

Immediately delete:

* MinIO file
* OCR temp files
* Redis keys

---

# ⚠️ STRICT RULES

## ❌ NEVER STORE

* Raw documents in DB
* OCR text in DB
* SLA extracted data in DB

---

## ✅ ONLY STORE (SERVER SIDE)

### PostgreSQL:

```json id="g9t2k4"
{
  "job_id": "...",
  "status": "...",
  "created_at": "...",
  "completed_at": "..."
}
```

---

# 🧠 TEMP STORAGE RULES

## MinIO

* Used ONLY during processing
* Must delete after completion

---

## Redis

* Used for:

  * job queue
  * temporary result
* Must use TTL

---

# 🧹 CLEANUP SYSTEM

## 🔥 AUTOMATIC CLEANUP FUNCTION

Must:

1. Delete MinIO objects
2. Delete Redis keys
3. Update PostgreSQL:

   ```
   status = "deleted"
   ```

---

## ⏱ CLEANUP TRIGGERS

* After result is fetched
* OR after timeout (e.g., 15 min)

---

# 🧠 BACKEND LOGIC REQUIREMENTS

Implement:

* Cleanup API
* Auto cleanup scheduler
* Fail-safe cleanup (cron job)

---

# 🔁 FAILURE HANDLING

If:

* Processing fails → cleanup still runs
* Partial data exists → delete anyway

---

# 🔐 SECURITY RULES

* Use signed URLs for file access
* Do NOT expose MinIO publicly
* Validate file types

---

# 🧠 CLIENT-SIDE STORAGE (IMPORTANT)

Server MUST NOT store results permanently.

Frontend will store:

* SLA data
* VIN data
* Price estimates
* Negotiation tips

---

# 📁 EXPECTED FILES

```id="m2p7x6"
backend/functions/cleanup/
│
└── index.ts

backend/functions/utils/
│
├── cleanupService.ts
├── storagePolicy.ts
```

---

# 🧠 CLEANUP SERVICE LOGIC

Must include:

* deleteFromMinIO(job_id)
* deleteFromRedis(job_id)
* updateJobStatus(job_id)

---

# ⚠️ EDGE CASES

* User never fetches result → auto delete
* n8n fails → cleanup still runs
* Redis expired → still cleanup MinIO

---

# 🧠 CLAUDE TASK

### 🚨 VERY IMPORTANT

Generate:

* Cleanup service
* Auto cleanup logic
* Storage policy enforcement
* Secure deletion system

---

## 📦 OUTPUT FORMAT (MANDATORY)

```bash id="a8v2k1"
mkdir -p ...

cat << 'EOF' > file
code
EOF
```

---

## ❗ FINAL RULES

* Must enforce privacy strictly
* Must include cleanup logic
* Must handle failures
* Must not leave residual data

---

## 🚀 END GOAL

A backend that:

* Processes data
* Returns results
* Leaves ZERO trace after completion
