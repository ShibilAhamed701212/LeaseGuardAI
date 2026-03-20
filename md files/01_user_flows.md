# 🔄 USER FLOWS — OCR AGENT

## 🎯 GOAL

Define **complete user journeys** to ensure:

* Proper frontend-backend interaction
* No broken flows
* Correct sequencing of actions

---

## 🧠 CONTEXT

This is part of a **continuation system**.

You MUST:

* Follow `99_master_prompt.md`
* Follow `98_global_rules.md`
* Follow `97_repo_structure.md`
* Align with frontend + backend + API contracts

---

# 🔥 PRIMARY FLOW (MAIN USER JOURNEY)

```text
User lands on app
→ Upload document
→ Select OCR + AI model
→ Start processing
→ Wait (status polling)
→ View result
→ Store locally
→ Cleanup server data
```

---

# 🟢 FLOW 1: DOCUMENT UPLOAD

```text
Select file
→ Validate file (PDF/image only)
→ Upload to backend (/upload)
→ Receive job_id
→ Move to processing stage
```

---

# 🟡 FLOW 2: MODEL SELECTION

```text
User selects:
→ OCR (Tesseract / Paddle)
→ AI (Ollama / OpenAI / Claude)

→ Must be selected before processing
```

---

# 🔵 FLOW 3: PROCESSING

```text
Trigger /process
→ Backend queues job
→ n8n processes file
→ Frontend polls /status
→ Status updates:
   uploaded → processing → completed
```

---

# 🔴 FLOW 4: RESULT FETCH

```text
Call /result/:job_id
→ Receive structured JSON
→ Store locally (IndexedDB / SQLite)
→ Render UI
```

---

# 🟣 FLOW 5: CLEANUP

```text
After result received:
→ Call /cleanup/:job_id
→ Delete:
   - MinIO file
   - Redis keys
   - Temp data
```

---

# ⚫ FLOW 6: HISTORY ACCESS

```text
User opens history page
→ Fetch from local storage
→ Display past documents
```

---

# ⚠️ ERROR FLOWS

---

## Upload Failure

```text
Upload fails
→ Show error
→ Allow retry
```

---

## Processing Timeout

```text
Status stuck
→ Show timeout message
→ Allow retry
```

---

## Result Not Found

```text
Result missing
→ Show error
→ Retry fetch
```

---

# 🔐 PRIVACY FLOW (IMPORTANT)

```text
Upload → Process → Return result → Delete server data
→ Store ONLY on client
```

---

# 🧠 STATE TRANSITIONS

```text
idle → uploading → processing → completed → stored → cleaned
```

---

# 🧠 CLAUDE TASK

### 🚨 IMPORTANT

When generating code:

* Follow these flows strictly
* Do NOT skip steps
* Ensure correct API order
* Handle all states properly

---

## ❗ FINAL RULE

These flows define **user experience logic**.

Breaking them = broken app.
