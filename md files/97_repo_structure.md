# 📁 REPOSITORY STRUCTURE — OCR AGENT

Root:
PS D:\var-codes\OCR agent>

---

## 📂 STRUCTURE

```
OCR-agent/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── utils/
│   └── public/
│
├── backend/
│   ├── functions/
│   │   ├── upload/
│   │   ├── process/
│   │   ├── cleanup/
│   │   └── utils/
│
├── n8n/
│   └── workflows/
│
├── services/
│   ├── ocr/
│   │   ├── tesseract/
│   │   └── paddle/
│   │
│   ├── ai/
│   │   ├── ollama/
│   │   └── cloud/
│
├── infra/
│   ├── docker/
│   ├── minio/
│   ├── postgres/
│   └── redis/
│
├── shared/
│   ├── schemas/
│   └── utils/
│
└── docs/
    ├── prd/
    └── prompts/
```

---

## 🧠 RULES

* Always place files in correct folders
* Do NOT create random folders
* Follow naming conventions

---

## 🔥 IMPORTANT

All generated code must match this structure exactly.
