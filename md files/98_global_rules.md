# 🌍 GLOBAL RULES — OCR AGENT

## 🧠 CODING STANDARDS

* Use clean architecture
* Follow separation of concerns
* No monolithic files

---

## 📁 FILE RULES

* One responsibility per file
* Use clear naming
* Use folders properly

---

## 🔐 SECURITY RULES

* Use environment variables
* No secrets in code
* Validate all inputs

---

## ⚡ PERFORMANCE RULES

* Async wherever possible
* Avoid blocking operations
* Use queues (Redis)

---

## 🧹 CLEANUP RULES

* Delete files after processing
* Clear temp storage
* Remove Redis jobs

---

## 🔄 RETRY RULES

* Failed jobs must retry
* Add retry logic in queue

---

## 📦 STORAGE RULES

### MinIO

* Temporary files only

### PostgreSQL

* Metadata only

### Redis

* Queue + cache only

---

## 🤖 AI RULES

* Always return structured JSON
* Validate AI output
* Handle hallucinations

---

## 🧪 TESTING RULES

* Add basic validation
* Handle edge cases

---

## 🚀 DEPLOYMENT RULES

* Docker for processing layer
* Firebase for frontend/backend

---

## ❗ FINAL RULE

Code must be:

* Clean
* Scalable
* Production-ready
