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
├── firebase.json               # Firebase Hosting config
├── .firebaserc                     # Firebase project binding
├── render.yaml                     # Render.com deploy blueprint
└── README.md