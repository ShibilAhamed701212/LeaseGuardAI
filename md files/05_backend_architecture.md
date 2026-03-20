# ⚙️ BACKEND ARCHITECTURE — OCR AGENT

## 🎯 GOAL

Build a **Firebase Functions backend (Node.js)** that:

* Handles file upload
* Triggers processing via n8n
* Manages job lifecycle
* Ensures privacy (temporary storage only)
* Integrates with:

  * MinIO (file storage)
  * Redis (queue)
  * PostgreSQL (metadata)
  * n8n (processing engine)

---

## 🧠 CONTEXT

This is part of a **continuation project**.

You MUST:

* Follow `97_repo_structure.md`
* Follow `98_global_rules.md`
* Follow `99_master_prompt.md`

---

## 📦 REQUIRED MODULES

Create backend under:

```id="n5k5qd"
backend/functions/
```

---

## 🔌 API ENDPOINTS

### 1. Upload File

```http id="t53rvk"
POST /upload
```

### Input:

* file (multipart)
* user_id

### Behavior:

* Upload file to MinIO:

  ```
  /uploads/{job_id}/file.pdf
  ```
* Generate `job_id`
* Store metadata in PostgreSQL:

  * job_id
  * status = "uploaded"
  * created_at
* Return:

```json id="5v67m7"
{ "job_id": "..." }
```

---

### 2. Process Document

```http id="d31hsq"
POST /process
```

### Input:

```json id="4x6u9x"
{
  "job_id": "...",
  "ocr": "tesseract" | "paddle",
  "ai": "ollama" | "openai" | "claude"
}
```

### Behavior:

* Validate job exists
* Update PostgreSQL:

  ```
  status = "processing"
  ```
* Push job to Redis queue
* Trigger n8n webhook with:

  * file_url (signed MinIO URL)
  * ocr
  * ai
* Return:

```json id="i4bt9v"
{ "status": "processing" }
```

---

### 3. Get Status

```http id="w2v0l3"
GET /status/:job_id
```

### Behavior:

* Fetch from PostgreSQL
* Return:

```json id="r2t4lq"
{ "status": "processing" }
```

---

### 4. Get Result

```http id="v6q3kn"
GET /result/:job_id
```

### Behavior:

* DO NOT store result in DB
* Fetch from Redis (temporary) OR request n8n
* Return structured JSON result

---

### 5. Cleanup

```http id="b2k9zp"
DELETE /cleanup/:job_id
```

### Behavior:

* Delete file from MinIO
* Remove Redis keys
* Update PostgreSQL:

  ```
  status = "deleted"
  ```

---

## 🧱 INTERNAL MODULES

### 🔹 MinIO Service

* Upload file
* Generate signed URL
* Delete file

---

### 🔹 Redis Service

* Push job to queue
* Track job status
* Store temporary result

---

### 🔹 PostgreSQL Service

* Create job
* Update status
* Fetch job

---

### 🔹 n8n Service

* Trigger webhook
* Send job payload

---

## 🔐 PRIVACY RULES (STRICT)

* Files stored ONLY in MinIO (temporary)
* No file content in PostgreSQL
* No OCR text in DB
* All results returned to client ONLY

---

## ⚠️ ERROR HANDLING

* Invalid job_id → return 404
* MinIO failure → retry
* Redis failure → fallback logging
* n8n failure → mark job failed

---

## 🔄 JOB STATES

```id="8k1n2v"
uploaded → processing → completed → deleted
```

---

## 📁 EXPECTED FILES TO GENERATE

```id="bq91hj"
backend/functions/
│
├── upload/index.ts
├── process/index.ts
├── status/index.ts
├── result/index.ts
├── cleanup/index.ts
│
├── utils/
│   ├── minioClient.ts
│   ├── redisClient.ts
│   ├── postgresClient.ts
│   ├── n8nClient.ts
│   └── logger.ts
```

---

## 🧠 CLAUDE TASK

### 🚨 READ THIS CAREFULLY

Generate:

* All backend Firebase Functions
* All utility service modules
* Full working code

---

## 📦 OUTPUT FORMAT (MANDATORY)

Return EVERYTHING as:

```bash id="u9l2xw"
mkdir -p ...

cat << 'EOF' > file
code
EOF
```

---

## ❗ FINAL INSTRUCTIONS

* This is a continuation system
* Do NOT explain
* Do NOT skip modules
* Do NOT simplify logic
* Write production-ready code
* Use environment variables
* Use async/await
* Ensure modularity

---

## 🚀 END GOAL

A fully working backend ready to:

* Receive uploads
* Trigger processing
* Manage jobs
* Maintain privacy

