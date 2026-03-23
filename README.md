# OCR Agent — AI-Powered Lease Contract Analyser

Privacy-first full-stack system: upload an auto lease PDF, get OCR + AI analysis back instantly.

## Quick Start

### 1. Infrastructure
```
cd infra\docker
copy .env.example .env   # fill in values
.\setup.ps1
```

### 2. Backend
```
cd backend
copy .env.example .env   # PG_USER + PG_PASSWORD required
npm install
npm run build
firebase emulators:start --only functions
```

### 3. Frontend
```
cd frontend
copy .env.example .env   # set VITE_API_BASE_URL
npm install
npm run dev
```

### 4. Import n8n workflow
n8n UI → Workflows → Import from file → `n8n\workflows\ocr_pipeline.json`

## What was fixed in this patch
- `ResultCard` — price_estimate.value → price_estimate.market_value
- `useResult` hook — now maps result into StoredDocument and saves via full storage abstraction
- `HistoryList` — uses getDocumentSummaries() / deleteDocument(), shows vehicle + date
- `History` page — loads document from IndexedDB by job_id with loading/error state
- `postgresClient.ts` — runtime guard requires PG_USER + PG_PASSWORD env vars
- `storage/types.ts` — new file with StoredDocument, DocumentSummary, StorageService
- `storage/indexedDB.ts` — full IndexedDB impl with versioned schema and indexes
- `storage/storageService.ts` — abstraction layer, getDocumentSummaries(), documentExists()
- `storage/index.ts` — barrel export replacing the old simple storage shim