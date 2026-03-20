# 🚀 DEPLOYMENT — OCR AGENT

## 🎯 GOAL

Set up a **complete deployment system** for:

* Frontend (Firebase Hosting)
* Backend (Firebase Functions)
* Processing Layer (Docker: n8n + OCR + AI)
* Infrastructure (MinIO + PostgreSQL + Redis)

---

## 🧠 CONTEXT

This is part of a **continuation system**.

You MUST:

* Follow `99_master_prompt.md`
* Follow `98_global_rules.md`
* Follow `97_repo_structure.md`
* Integrate all previous modules

---

# 🧱 SYSTEM COMPONENTS

---

## 🟢 FRONTEND

* React app
* Hosted on Firebase Hosting

---

## 🔵 BACKEND

* Firebase Functions (Node.js)

---

## 🟡 PROCESSING LAYER (Docker)

* n8n
* OCR services
* AI service

---

## 🟣 INFRASTRUCTURE

* MinIO (object storage)
* PostgreSQL (metadata)
* Redis (queue + cache)

---

# 🔥 DOCKER SETUP

## 📂 Location

```id="k9m3p1"
infra/docker/
```

---

## 🐳 DOCKER COMPOSE

Create:

```id="x7p2k4"
infra/docker/docker-compose.yml
```

---

## MUST INCLUDE SERVICES

* n8n
* tesseract
* paddleocr
* ai-service
* minio
* postgres
* redis

---

## ⚙️ NETWORKING

* All services connected via Docker network
* Use service names as hostnames

---

# 🔐 ENV VARIABLES

Create:

```id="v4k8p2"
.env
```

---

## REQUIRED VARIABLES

```env id="y2m7p9"
MINIO_ENDPOINT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=

POSTGRES_URL=
REDIS_URL=

N8N_WEBHOOK_URL=

OPENAI_API_KEY=
CLAUDE_API_KEY=
```

---

# 🔥 FIREBASE SETUP

---

## INIT

```bash id="n6k3p2"
firebase init
```

Select:

* Hosting
* Functions

---

## DEPLOY

```bash id="q3m9p1"
firebase deploy
```

---

# 🔄 SERVICE CONNECTION FLOW

```text id="t2p8k3"
Frontend → Firebase Functions
        ↓
MinIO (file storage)
        ↓
n8n webhook
        ↓
OCR + AI services
        ↓
Redis + PostgreSQL
        ↓
Return result
        ↓
Frontend stores locally
        ↓
Cleanup triggered
```

---

# 🧠 START DOCKER SERVICES

```bash id="m8k2p4"
docker-compose up -d
```

---

# 🔍 HEALTH CHECKS

* n8n UI → http://localhost:5678
* MinIO → http://localhost:9000
* API endpoints working

---

# ⚠️ PRODUCTION NOTES

* Use HTTPS
* Secure env variables
* Restrict MinIO access
* Enable logging (non-sensitive)

---

# 🔄 SCALING

* n8n workers can scale
* Redis handles queue
* Stateless backend allows scaling

---

# 🔐 SECURITY

* Signed URLs for file access
* No public storage buckets
* Input validation everywhere

---

# 🧹 CLEANUP VERIFICATION

Ensure:

* Files deleted from MinIO
* Redis keys expire
* No leftover temp data

---

# 📁 EXPECTED FILES

```id="p7k3m2"
infra/docker/
│
├── docker-compose.yml
├── .env
└── setup.sh
```

---

# 🧠 CLAUDE TASK

### 🚨 VERY IMPORTANT

Generate:

* Full docker-compose file
* Environment config
* Setup script
* Firebase config guidance (if needed)

---

## 📦 OUTPUT FORMAT (MANDATORY)

```bash id="k8m2p7"
mkdir -p ...

cat << 'EOF' > file
code
EOF
```

---

## ❗ FINAL RULES

* Must be runnable
* Must connect all services
* Must follow architecture
* Must be production-ready

---

## 🚀 END GOAL

A fully deployed system where:

* Frontend is live
* Backend is functional
* Processing pipeline works
* Data is handled securely
