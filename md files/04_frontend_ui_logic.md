# 🎯 FRONTEND UI LOGIC — OCR AGENT

## 🎯 GOAL

Define the **exact behavior, state transitions, and UI interactions** for the frontend.

This ensures:

* Smooth user experience
* Correct API usage
* Proper handling of async flows

---

## 🧠 CONTEXT

This is part of a **continuation system**.

You MUST:

* Follow `99_master_prompt.md`
* Follow `98_global_rules.md`
* Follow `97_repo_structure.md`
* Follow `03_frontend_architecture.md`
* Follow `06_api_contracts.md`
* Integrate with `11_client_storage.md`

---

# 🔄 CORE USER FLOW

```text id="z7p3k1"
Upload → Select Models → Process → Wait → View Result → Store Locally
```

---

# 🟢 1. UPLOAD PAGE LOGIC

## 📂 Page: Upload.tsx

---

## FLOW

1. User selects file
2. Validate file:

   * Must be PDF/image
3. Show file preview (optional)
4. Enable "Upload" button

---

## ON UPLOAD

```text id="y3k8m2"
call uploadFile()
→ receive job_id
→ store job_id in state
→ navigate to processing stage
```

---

## ERROR HANDLING

* Invalid file → show error
* Upload fail → retry option

---

# 🟡 2. MODEL SELECTION LOGIC

## Component: ModelSelector.tsx

---

## STATE

```js id="p8k2m4"
{
  ocr: "tesseract" | "paddle",
  ai: "ollama" | "openai" | "claude"
}
```

---

## RULES

* Default selections:

  * OCR: Paddle
  * AI: Ollama
* Must select before processing

---

# 🔵 3. PROCESSING LOGIC

---

## ON PROCESS CLICK

```text id="q6m2p9"
call processDocument(job_id, ocr, ai)
→ start polling status
```

---

## STATUS POLLING

* Call `/status/:job_id` every 2–3 seconds

---

## STATES

```text id="r9k3p2"
idle → uploading → processing → completed → error
```

---

## LOADING UI

* Show spinner
* Show message:

  * "Extracting text..."
  * "Analyzing contract..."
  * "Calculating fairness..."

---

# 🔴 4. RESULT PAGE LOGIC

## 📂 Page: Result.tsx

---

## FLOW

```text id="m3p7k2"
fetch result
→ store locally
→ display UI
```

---

## DISPLAY

* SLA data (table)
* VIN info
* Fairness score (highlighted)
* Negotiation tips (list)

---

## STORAGE

```text id="k4p8m1"
saveDocument(result)
```

---

# 🟣 5. HISTORY PAGE LOGIC

## 📂 Page: History.tsx

---

## FLOW

```text id="v2m9k3"
getAllDocuments()
→ list results
```

---

## FEATURES

* View past results
* Delete entry

---

# 🔁 6. CLEANUP LOGIC

After result fetched:

```text id="t7p3k9"
call cleanup(job_id)
```

---

# 🧠 7. ERROR STATES

---

## TYPES

* Upload error
* Processing timeout
* Result not found
* API failure

---

## UI BEHAVIOR

* Show message
* Provide retry button

---

# 🔐 8. VALIDATION RULES

* Disable buttons during processing
* Prevent duplicate submissions
* Ensure job_id exists

---

# ⚡ 9. PERFORMANCE RULES

* Avoid unnecessary re-renders
* Use hooks efficiently
* Debounce polling if needed

---

# 🎨 10. UX ENHANCEMENTS

* Progress messages
* Smooth transitions
* Clear feedback

---

# 📁 EXPECTED FILES

```id="n3k7p2"
frontend/src/
│
├── pages/
│   ├── Upload.tsx
│   ├── Result.tsx
│   └── History.tsx
│
├── components/
│   ├── FileUploader.tsx
│   ├── ModelSelector.tsx
│   └── Loader.tsx
│
├── hooks/
│   ├── useUpload.ts
│   ├── useProcess.ts
│   └── useResult.ts
```

---

# 🧠 CLAUDE TASK

### 🚨 VERY IMPORTANT

Generate:

* UI logic inside components/pages
* Hook implementations
* State management
* API integration logic

---

## 📦 OUTPUT FORMAT (MANDATORY)

```bash id="k2m8p4"
mkdir -p ...

cat << 'EOF' > file
code
EOF
```

---

## ❗ FINAL RULES

* Must match API contracts
* Must handle async flows properly
* Must be user-friendly
* Must be modular

---

## 🚀 END GOAL

A frontend that:

* Feels smooth
* Handles all states correctly
* Provides great UX
