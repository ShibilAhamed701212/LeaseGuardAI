# 🔍 OCR Agent — AI-Powered Lease Contract Analyser

> **Privacy-first full-stack system**: upload an auto lease PDF, get instant OCR + AI analysis, fairness scoring, and negotiation tips — all results stored locally on your device.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
  - [1. Infrastructure (Docker)](#1-infrastructure-docker)
  - [2. Backend](#2-backend)
  - [3. Frontend](#3-frontend)
  - [4. Import n8n Workflow](#4-import-n8n-workflow)
- [Environment Variables](#environment-variables)
  - [Backend](#backend-env)
  - [Frontend](#frontend-env)
- [API Reference](#api-reference)
- [Services](#services)
  - [Backend (Node.js / Express)](#backend-nodejs--express)
  - [Frontend (React / Vite)](#frontend-react--vite)
  - [AI Service (Microservice)](#ai-service-microservice)
  - [OCR Services](#ocr-services)
  - [n8n Workflow](#n8n-workflow)
- [Storage & Privacy](#storage--privacy)
- [Deployment](#deployment)
  - [Backend → Render](#backend--render)
  - [Frontend → Firebase Hosting](#frontend--firebase-hosting)
- [Monitoring & Debugging](#monitoring--debugging)
- [CI/CD](#cicd)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

OCR Agent is a full-stack application designed to demystify auto lease contracts. Users upload a PDF or image of their lease, and the system:

1. **Extracts text** via OCR (Google Cloud Vision / Tesseract / PaddleOCR)
2. **Analyses the contract** using AI (Gemini 2.5 Flash, Ollama, or a custom OpenAI-compatible endpoint)
3. **Returns structured data** — monthly payments, APR, term, residual value, mileage limits, penalties, risk scores, and fairness ratings
4. **Provides negotiation tips** tailored to the specific contract's weak points
5. **Stores results locally** in the browser's IndexedDB — no contract data ever persists on the server

---

## Features

| Feature | Description |
|---|---|
| 🔍 Multi-engine OCR | Google Cloud Vision (native multimodal), Tesseract, PaddleOCR |
| 🤖 Multi-model AI | Gemini 2.5 Flash (default), Ollama (local LLMs), custom OpenAI-compatible endpoints |
| ⚖️ Fairness Scoring | 0–100 score computed from APR, price vs market, mileage limits, and penalty severity |
| 💡 Negotiation Tips | Rule-based + AI-generated, prioritised by impact |
| 🔐 Privacy First | Contract results stored only in browser IndexedDB; server deletes files after processing |
| 📊 Risk Assessment | Financial and legal risk classification (Low / Medium / High) |
| 💬 AI Chat (LeaseGuard) | Floating chat widget powered by Gemini — context-aware if a contract is loaded |
| 📜 History | Full local history with vehicle info, date, and fairness score |
| 🧠 Error Recovery | Self-healing worker, orphaned job cleanup, Sentry integration |
| 🚀 CI/CD | GitHub Actions — lint, build, Docker validation, deploy to Render + Firebase |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (React)                        │
│  Upload → Poll Status → View Result → Chat with LeaseGuard   │
└────────────────────┬─────────────────────────────────────────┘
                     │ REST API
┌────────────────────▼─────────────────────────────────────────┐
│              Backend (Express / Node 18)                      │
│  /upload  /process  /status  /result  /cleanup  /chat        │
│                                                               │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │ PostgreSQL   │  │   Redis     │  │  MinIO / S3      │    │
│  │ (job meta)   │  │ (queue +    │  │ (file storage,   │    │
│  │              │  │  results)   │  │  signed URLs)    │    │
│  └──────────────┘  └──────┬──────┘  └──────────────────┘    │
│                            │                                  │
│  ┌─────────────────────────▼──────────────────────────────┐  │
│  │            Background Worker (worker.ts)               │  │
│  │  LPOP queue → download file → OCR → AI → store result  │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                     │ Webhook (optional)
┌────────────────────▼─────────────────────────────────────────┐
│                      n8n Workflow                             │
│  Validate payload → log → acknowledge (worker does the work) │
└──────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
ocr-agent/
│
├── backend/                        # Express API + background worker
│   ├── functions/
│   │   ├── index.ts                # App entry point, route registration
│   │   ├── worker.ts               # Background AI/OCR queue processor
│   │   ├── upload/index.ts         # POST /upload
│   │   ├── process/index.ts        # POST /process
│   │   ├── status/index.ts         # GET /status/:job_id
│   │   ├── result/index.ts         # GET /result/:job_id
│   │   ├── cleanup/index.ts        # DELETE /cleanup/:job_id
│   │   ├── chat/index.ts           # POST /chat (LeaseGuard AI)
│   │   ├── debug.ts                # GET /debug (diagnostics)
│   │   └── utils/
│   │       ├── postgresClient.ts   # PG connection pool + job CRUD
│   │       ├── redisClient.ts      # Redis queue + result cache
│   │       ├── minioClient.ts      # S3-compatible file storage
│   │       ├── n8nClient.ts        # n8n webhook trigger
│   │       ├── logger.ts           # Structured logger + bug detection
│   │       └── errorHandler.ts     # Global error handlers + auto-recovery
│   ├── package.json
│   ├── tsconfig.json
│   └── firebase.json               # Firebase Functions config (emulator)
│
├── frontend/                       # React SPA (Vite + TypeScript)
│   ├── src/
│   │   ├── App.tsx                 # Router + nav
│   │   ├── main.tsx                # Entry point + Sentry init
│   │   ├── pages/
│   │   │   ├── Home.tsx            # Landing page
│   │   │   ├── Upload.tsx          # Upload + processing flow
│   │   │   ├── Result.tsx          # Analysis result view
│   │   │   └── History.tsx         # Local document history
│   │   ├── components/
│   │   │   ├── chat/ChatWidget.tsx # Floating AI chat (LeaseGuard)
│   │   │   ├── result/ResultCard   # Structured result display
│   │   │   ├── upload/FileUploader # Drag-and-drop file input
│   │   │   ├── upload/ModelSelector# OCR + AI engine selector
│   │   │   └── shared/             # Loader, StatusBar
│   │   ├── hooks/
│   │   │   ├── useUpload.ts        # Upload lifecycle
│   │   │   ├── useProcess.ts       # Processing + polling
│   │   │   └── useResult.ts        # Result fetch + local save
│   │   ├── services/
│   │   │   ├── api.ts              # All API calls
│   │   │   └── storage/            # IndexedDB abstraction layer
│   │   │       ├── indexedDB.ts
│   │   │       ├── storageService.ts
│   │   │       └── types.ts
│   │   └── utils/
│   │       ├── helpers.ts          # Formatters, validators
│   │       └── debugger.ts         # Frontend error tracking
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── services/
│   ├── ai/                         # AI microservice (Express)
│   │   ├── app.ts                  # Service entry point
│   │   ├── controller/process.ts   # POST /ai/process handler
│   │   ├── providers/
│   │   │   ├── ollama.ts
│   │   │   ├── openai.ts
│   │   │   └── claude.ts
│   │   ├── prompts/slaPrompt.ts    # SLA extraction prompts
│   │   └── utils/
│   │       ├── parser.ts           # JSON extraction from LLM output
│   │       └── validator.ts        # Output normalization
│   │
│   ├── ocr/
│   │   ├── tesseract/              # Tesseract OCR HTTP service (Python)
│   │   └── paddle/                 # PaddleOCR HTTP service (Python)
│   │
│   └── shared/
│       ├── schemas/contractSchema.ts
│       └── utils/
│           ├── fairnessEngine.ts   # Weighted fairness score computation
│           ├── riskAnalyzer.ts     # Contract risk flag detection
│           ├── negotiationEngine.ts# Tip generation logic
│           ├── normalizer.ts       # Input type coercion
│           └── businessLogic.ts    # Pipeline orchestrator
│
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml      # Full stack: Postgres, Redis, MinIO, n8n, Ollama, OCR
│   │   ├── setup.sh                # Linux setup script
│   │   └── setup.ps1               # Windows PowerShell setup script
│   └── postgres/
│       └── init.sql                # Database schema + indexes
│
├── n8n/
│   └── workflows/
│       └── ocr_pipeline.json       # n8n workflow (import this)
│
├── .github/
│   └── workflows/
│       └── ci.yml                  # GitHub Actions CI/CD pipeline
│
├── firebase.json                   # Firebase Hosting config
├── .firebaserc                     # Firebase project binding
├── render.yaml                     # Render.com deploy blueprint
└── README.md


## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 18 |
| Framework | Express 4 |
| Language | TypeScript 5 |
| Database | PostgreSQL 16 (job metadata only) |
| Cache / Queue | Redis 7 (ioredis) |
| File Storage | MinIO / any S3-compatible store |
| AI | Google Generative AI (`@google/generative-ai`) — Gemini 2.5 Flash |
| PDF Parsing | `pdf-parse` |
| Error Tracking | Sentry (`@sentry/node`) |
| Build | esbuild |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 |
| Language | TypeScript 5 |
| Bundler | Vite 5 |
| Router | React Router 6 |
| Local Storage | IndexedDB (via custom abstraction) |
| Error Tracking | Sentry (`@sentry/react`) |

### Infrastructure
| Component | Technology |
|---|---|
| CI/CD | GitHub Actions |
| Backend Hosting | Render.com |
| Frontend Hosting | Firebase Hosting |
| Orchestration | n8n (optional webhook receiver) |
| Container Runtime | Docker + Docker Compose |
| OCR (optional) | Tesseract (Python/Flask) + PaddleOCR (Python/Flask) |
| LLM (local, optional) | Ollama |

## Prerequisites

- **Node.js 18+**
- **Docker + Docker Compose** (for local infrastructure)
- **A Gemini API key** ([get one free](https://aistudio.google.com/app/apikey))
- `npm` or `pnpm`
- Firebase CLI (`npm install -g firebase-tools`) — for deployment
- A running PostgreSQL, Redis, and S3/MinIO instance (provided via Docker Compose for local dev)

## Quick Start

### 1. Infrastructure (Docker)

```bash
cd infra/docker
cp .env.example .env   # Fill in your values (PG_USER, PG_PASSWORD, etc.)

# Linux / macOS
chmod +x setup.sh && ./setup.sh

# Windows (PowerShell)
.\setup.ps1
```

This starts: **PostgreSQL**, **Redis**, **MinIO**, **n8n**, **Ollama**, **Tesseract OCR**, and **PaddleOCR**.

After startup, the MinIO console is at `http://localhost:9001` and n8n is at `http://localhost:5678`.

### 2. Backend

```bash
cd backend
cp .env.example .env   # Fill in PG_USER, PG_PASSWORD, GEMINI_API_KEY, etc.
npm install
npm run build
node lib/index.js
```

The server starts on **port 10000** by default (`http://localhost:10000`).

To run with the Firebase emulator instead:

```bash
firebase emulators:start --only functions
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # Set VITE_API_BASE_URL=http://localhost:10000
npm install
npm run dev
```

The dev server starts at **http://localhost:5173**.

### 4. Import n8n Workflow

1. Open n8n UI at `http://localhost:5678`
2. Go to **Workflows → Add → Import from File**
3. Select `n8n/workflows/ocr_pipeline.json`

> **Note:** The n8n workflow is a lightweight webhook receiver. The actual OCR and AI processing is done by the backend worker (`worker.ts`), not by n8n.

## Environment Variables

### Backend (.env) {#backend-env}

```env
# PostgreSQL (REQUIRED)
PG_HOST=localhost
PG_PORT=5433           # 5433 = host-mapped Docker port
PG_DATABASE=ocr_agent
PG_USER=postgres
PG_PASSWORD=postgres
PG_SSL=false           # Set to "true" for Render/production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6380        # 6380 = host-mapped Docker port
REDIS_PASSWORD=
REDIS_TLS=false        # Set to "true" for Upstash/production

# MinIO / S3-compatible storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=ocr-agent

# n8n (optional)
N8N_WEBHOOK_URL=http://localhost:5678/webhook/ocr-process
N8N_SECRET=your-n8n-secret

# AI
GEMINI_API_KEY=your-gemini-api-key

# App
PORT=10000
SIGNED_URL_EXPIRY_SECONDS=3600
REDIS_RESULT_TTL_SECONDS=86400  # 24h — results auto-expire
```

### Frontend (.env) {#frontend-env}

```env
VITE_API_BASE_URL=http://localhost:10000   # Local dev
# VITE_API_BASE_URL=https://leaseguardai.onrender.com  # Production
```

## API Reference

All responses are JSON. Base URL: `http://localhost:10000` (or your deployed URL).

### `POST /upload`
Upload a lease document (PDF, JPG, PNG, or WEBP — max 20 MB).

**Request:** `multipart/form-data`
| Field | Type | Description |
|---|---|---|
| `file` | File | The lease document |
| `user_id` | string | Any non-empty identifier |

**Response `200`:**
```json
{ "job_id": "uuid", "status": "uploaded" }
```

### `POST /process`
Trigger AI analysis of an uploaded document.

**Request body:**
```json
{
  "job_id": "uuid",
  "ocr": "google_cloud",
  "ai": "gemini",
  "config": { "apiKey": "optional-override" }
}
```

| Field | Values |
|---|---|
| `ocr` | `google_cloud` |
| `ai` | `gemini` \| `ollama` \| `custom` |

**Response `200`:**
```json
{ "job_id": "uuid", "status": "processing" }
```

### `GET /status/:job_id`
Poll processing status.

**Response `200`:**
```json
{ "job_id": "uuid", "status": "completed" }
```

Possible statuses: `uploaded` → `reading_document` → `analyzing_contract` → `completed` | `failed`

### `GET /result/:job_id`
Fetch the analysis result (only available once status is `completed`).

**Response `200`:**
```json
{
  "job_id": "uuid",
  "status": "completed",
  "data": {
    "sla": {
      "currency": "INR",
      "monthly_payment": 45000,
      "term_months": 36,
      "total_cost": 1620000,
      "deposit": 100000,
      "mileage": "15000 km/year",
      "residual_value": "Lessor retains ownership",
      "gap_liability": "Lessee",
      "maintenance": "Lessee",
      "insurance": "Lessee",
      "taxes": "Lessee",
      "purchase_option": false,
      "penalties": ["Early termination: 3 months rent", "Excess mileage: ₹5/km"],
      "financial_risk": "Medium",
      "legal_risk": "Low",
      "fairness_score": 72,
      "fairness_explanation": "Contract is above average but maintenance responsibility is a concern."
    },
    "vin": null,
    "price_estimate": {
      "market_value": 1500000,
      "confidence": 80,
      "currency": "INR"
    },
    "fairness_score": 72,
    "negotiation_tips": [
      "Maintenance clause places full burden on lessee — negotiate shared responsibility.",
      "Request APR disclosure in writing before signing."
    ]
  }
}
```

### `DELETE /cleanup/:job_id`
Delete all server-side data for a job (file in MinIO, Redis keys, marks job as deleted in PostgreSQL).

**Response `200`:**
```json
{ "job_id": "uuid", "status": "deleted" }
```

### `POST /chat`
Send a message to LeaseGuard AI (context-aware negotiation coach).

**Request body:**
```json
{
  "message": "Is this lease fair?",
  "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }],
  "contract_context": { /* optional: result data object */ }
}
```

**Response `200`:**
```json
{ "reply": "Based on your contract...", "tokens_used": 430 }
```

### `GET /health`
Service health check — returns connectivity status for PostgreSQL, Redis, and MinIO.

### `GET /debug`
Diagnostics dashboard — queue length, worker heartbeat, job stats, bug predictions.

## Services

### Backend (Node.js / Express)

The backend serves as the central orchestrator:

- **Upload handler** (`/upload`): Accepts multipart uploads via Busboy, validates MIME type, streams to MinIO, creates a job record in PostgreSQL.
- **Process handler** (`/process`): Generates a signed MinIO URL, updates job state in PostgreSQL + Redis, pushes the job to a Redis queue, and optionally fires an n8n webhook.
- **Background worker** (`worker.ts`): Polls the Redis queue (`LPOP`), downloads the file, runs OCR + AI, stores the result back in Redis with a 24-hour TTL.
- **Result handler** (`/result`): Fetches the result from Redis only — contract data never touches PostgreSQL.
- **Chat handler** (`/chat`): Stateless multi-turn chat powered by Gemini. Accepts optional contract context for personalised advice.
- **Self-healing**: On startup and every 5 minutes, the worker queries PostgreSQL for jobs stuck in `processing` for more than 5 minutes and marks them as `failed`.

### Frontend (React / Vite)

A single-page application with four routes:

| Route | Page | Description |
|---|---|---|
| `/` | Home | Feature overview and quick-start |
| `/upload` | Upload | File picker, engine selector, processing status |
| `/result/:job_id` | Result | Full contract analysis with risk badges, fairness meter, and negotiation tips |
| `/history` | History | All locally stored past analyses (IndexedDB) |

The **LeaseGuard AI chat widget** floats on all pages and can reference the currently loaded contract for contextual advice.

### AI Service (Microservice)

Located at `services/ai/` — a standalone Express microservice for AI inference. This is optional when using the backend's built-in Gemini integration, but supports a fallback chain:

```
ollama → openai → claude
```

Key components:
- `providers/` — one file per LLM provider (Ollama, OpenAI, Claude)
- `prompts/slaPrompt.ts` — structured extraction prompts
- `utils/parser.ts` — robust JSON extraction from LLM output (handles markdown fences, partial JSON, single quotes)
- `utils/validator.ts` — type coercion and output normalization

### OCR Services

Two optional Python/Flask microservices for self-hosted OCR:

| Service | Port | Description |
|---|---|---|
| **Tesseract** (`services/ocr/tesseract/`) | 8884 | `POST /ocr` — supports PDF and images |
| **PaddleOCR** (`services/ocr/paddle/`) | 8885 | `POST /ocr` — higher accuracy for complex layouts |

Both return `{ "text": "...", "char_count": N }`.

The default pipeline uses **Gemini's native multimodal OCR** (no separate service needed). The Python OCR services are available for air-gapped or cost-sensitive deployments.

### n8n Workflow

The included workflow (`n8n/workflows/ocr_pipeline.json`) is a lightweight webhook receiver:

1. Receives the job payload from `/process`
2. Validates required fields (`job_id`, `file_url`, `ocr`, `ai`)
3. Acknowledges immediately

The actual processing is done by the Node.js background worker. n8n is present for auditability and can be extended to add notifications, post-processing steps, or integration with external systems.

## Storage & Privacy

This system is designed with privacy as a core principle:

- **Contract text and document content are never stored in the database.** PostgreSQL holds only job metadata (UUID, status, timestamps, engine selection).
- **Results are stored in Redis with a 24-hour TTL.** After expiry, no trace of the contract content remains on the server.
- **Uploaded files are deleted** when the client calls `DELETE /cleanup/:job_id` or when the job is cleaned up.
- **The frontend stores results in the browser's IndexedDB** — local to the user's device, not synced anywhere.
- **The logger sanitizes sensitive fields** (`password`, `apiKey`, `token`, `secret`) before writing to log files.

## Deployment

### Backend → Render

A `render.yaml` Blueprint is included for one-click deployment:

```bash
# Push to main branch — GitHub Actions will trigger the Render deploy hook
git push origin main
```

Required Render environment variables (set in the Render dashboard under **Environment**):

`PG_HOST`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE`, `PG_SSL=true`, `REDIS_URL`, `REDIS_TLS=true`, `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `GEMINI_API_KEY`

### Frontend → Firebase Hosting

```bash
cd frontend
npm run build

firebase login
firebase deploy --only hosting
```

Or push to `main` — GitHub Actions (`ci.yml`) will build and deploy automatically using the `FIREBASE_SERVICE_ACCOUNT` secret.

The live production URL is configured in `frontend/.env.production`:

```env
VITE_API_BASE_URL=https://leaseguardai.onrender.com
```

## Monitoring & Debugging

### Sentry
Both the backend and frontend are instrumented with Sentry for error tracking and performance profiling. The DSN is baked into the source — replace it with your own project DSN before deploying.

### Backend debug endpoints

| Endpoint | Description |
|---|---|
| `GET /health` | PostgreSQL, Redis, MinIO connectivity |
| `GET /diagnostic` | Full health check with memory usage and uptime |
| `GET /debug` | Queue length, worker heartbeat, job stats by status |
| `GET /debug/logs?hours=24&level=error` | Structured log viewer |
| `GET /debug/predictions` | AI-predicted bug patterns based on error frequency |
| `GET /debug/errors` | Error tracker with occurrence counts |

### Frontend debug console

A `__DEBUG__` object is exposed on `window` in all environments:

```javascript
window.__DEBUG__.getSystemStatus()   // Error rate, recent errors, top issues
window.__DEBUG__.getBugPredictions() // Detected bug patterns
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every push to `main` or `develop` and on pull requests to `main`:

| Job | What it does |
|---|---|
| `backend-check` | TypeScript compile (`npm run build`) |
| `frontend-check` | Vite build (`npm run build`) |
| `docker-validate` | Validates both Docker Compose files |
| `deploy-backend` | Triggers Render deploy hook (main only) |
| `deploy-frontend` | Builds and deploys to Firebase Hosting (main only) |

Required repository secrets:

| Secret | Description |
|---|---|
| `RENDER_DEPLOY_HOOK_URL` | Render deploy hook URL |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON |

## What Was Fixed in the Last Patch

- `ResultCard` — fixed `price_estimate.value` → `price_estimate.market_value`
- `useResult` hook — now maps result into `StoredDocument` and saves via the full storage abstraction
- `HistoryList` — uses `getDocumentSummaries()` / `deleteDocument()`, shows vehicle and date
- `History` page — loads document from IndexedDB by `job_id` with loading/error state
- `postgresClient.ts` — runtime guard requires `PG_USER` + `PG_PASSWORD` env vars
- `storage/types.ts` — new file with `StoredDocument`, `DocumentSummary`, `StorageService`
- `storage/indexedDB.ts` — full IndexedDB implementation with versioned schema and indexes
- `storage/storageService.ts` — abstraction layer, `getDocumentSummaries()`, `documentExists()`
- `storage/index.ts` — barrel export replacing the old simple storage shim

## Contributing

1. Fork the repository and create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes and ensure `npm run build` passes in both `backend/` and `frontend/`
3. Run Docker Compose to verify the full stack works end-to-end
4. Open a pull request against `main`

## License

This project is private. All rights reserved.