const fs = require('fs');
const path = require('path');

const pipelinePath = path.join(__dirname, 'workflows', 'ocr_pipeline.json');
let pipeline = {
  "name": "OCR Agent - Backend Orchestrated Pipeline",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "ocr-process",
        "responseMode": "lastNode",
        "options": {}
      },
      "id": "node-webhook",
      "name": "Webhook — Receive Job",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300],
      "webhookId": "ocr-process"
    },
    {
      "parameters": {
        "functionCode": "const body = $input.first().json.body ?? $input.first().json;\nconst { job_id, file_url, ocr, ai } = body;\nif (!job_id || !file_url || !ocr || !ai) throw new Error('Missing required fields');\nconst validOcr = ['google_cloud'];\nconst validAi = ['ollama','gemini','custom'];\nif (!validOcr.includes(ocr)) throw new Error('Invalid OCR engine');\nif (!validAi.includes(ai)) throw new Error('Invalid AI model');\nreturn [{ json: { job_id, file_url, ocr, ai, status: 'Processing handed off to node worker' } }];"
      },
      "id": "node-validate",
      "name": "Validate & Log Payload",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [460, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify($json) }}",
        "options": {
          "responseCode": 200
        }
      },
      "id": "node-respond",
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [680, 300]
    }
  ],
  "connections": {
    "Webhook — Receive Job": {
      "main": [
        [
          {
            "node": "Validate & Log Payload",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Validate & Log Payload": {
      "main": [
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "settings": {
    "executionOrder": "v1",
    "saveManualExecutions": true
  },
  "tags": [
    "ocr",
    "ai",
    "contract-analysis"
  ]
};

fs.writeFileSync(pipelinePath, JSON.stringify(pipeline, null, 2));
console.log('Pipeline completely rewritten and perfectly connected to avoid data race with worker.');
