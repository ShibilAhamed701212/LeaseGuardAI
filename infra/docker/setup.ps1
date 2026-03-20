# =============================================================
# OCR Agent - Docker setup script (Windows PowerShell 5.1 compatible)
# Run from: D:\var-codes\OCR agent\infra\docker\
# Usage: .\setup.ps1
# =============================================================

$ErrorActionPreference = "Stop"

function Log-Info  { param($msg) Write-Host "  $msg" -ForegroundColor Cyan }
function Log-OK    { param($msg) Write-Host "  OK: $msg" -ForegroundColor Green }
function Log-Warn  { param($msg) Write-Host "  WARN: $msg" -ForegroundColor Yellow }
function Log-Error { param($msg) Write-Host "  ERROR: $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "=== OCR Agent Docker Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check .env exists
if (!(Test-Path ".env")) {
  Log-Error ".env file not found. Copy .env and fill in values."
  exit 1
}

# Load env vars
Get-Content ".env" | Where-Object { $_ -match "^[^#].*=.*" } | ForEach-Object {
  $parts = $_ -split "=", 2
  $key = $parts[0].Trim()
  $val = $parts[1].Trim()
  [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
}

# Fix for PS 5.1 not supporting ??
$MINIO_ACCESS_KEY = $env:MINIO_ACCESS_KEY
if ($null -eq $MINIO_ACCESS_KEY) { $MINIO_ACCESS_KEY = "minioadmin" }

$MINIO_SECRET_KEY = $env:MINIO_SECRET_KEY
if ($null -eq $MINIO_SECRET_KEY) { $MINIO_SECRET_KEY = "minioadmin" }

$MINIO_BUCKET = $env:MINIO_BUCKET
if ($null -eq $MINIO_BUCKET) { $MINIO_BUCKET = "ocr-agent" }

$OLLAMA_MODEL = $env:OLLAMA_MODEL
if ($null -eq $OLLAMA_MODEL) { $OLLAMA_MODEL = "llama3" }

$N8N_PORT = $env:N8N_PORT
if ($null -eq $N8N_PORT) { $N8N_PORT = "5678" }

$N8N_USER = $env:N8N_USER
if ($null -eq $N8N_USER) { $N8N_USER = "admin" }

$TESSERACT_PORT = $env:TESSERACT_PORT
if ($null -eq $TESSERACT_PORT) { $TESSERACT_PORT = "8884" }

$PADDLE_PORT = $env:PADDLE_PORT
if ($null -eq $PADDLE_PORT) { $PADDLE_PORT = "8885" }

$AI_SERVICE_PORT = $env:AI_SERVICE_PORT
if ($null -eq $AI_SERVICE_PORT) { $AI_SERVICE_PORT = "8386" }

# Create Docker network
Log-Info "Creating ocr-network..."
try { docker network create ocr-network 2>$null } catch {}
Log-OK "Network ready"

# Pull base images
Log-Info "Pulling base images..."
docker-compose pull postgres redis minio n8n ollama
Log-OK "Base images pulled"

# Build custom services
Log-Info "Building OCR + AI services (this takes a few minutes)..."
docker-compose build --no-cache tesseract-service paddle-service ai-service
Log-OK "Services built"

# Start infrastructure
Log-Info "Starting infrastructure..."
docker-compose up -d postgres redis minio
Log-Info "Waiting 15s for health checks..."
Start-Sleep 15
Log-OK "Infrastructure running"

# Start processing layer
Log-Info "Starting processing layer..."
docker-compose up -d n8n tesseract-service paddle-service ai-service ollama
Start-Sleep 10
Log-OK "Processing layer running"

# Pull Ollama model
Log-Info "Pulling Ollama model ($OLLAMA_MODEL)..."
try {
  docker exec ocr-ollama ollama pull $OLLAMA_MODEL
  Log-OK "Ollama model ready"
} catch {
  Log-Warn "Ollama pull failed. Run manually: docker exec ocr-ollama ollama pull $OLLAMA_MODEL"
}

# Create MinIO bucket
Log-Info "Creating MinIO bucket..."
try {
  $mcCmd = "mc alias set local http://minio:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY; mc mb --ignore-existing local/$MINIO_BUCKET; mc anonymous set none local/$MINIO_BUCKET"
  docker run --rm --network ocr-network minio/mc:latest sh -c "$mcCmd"
  Log-OK "MinIO bucket '$MINIO_BUCKET' ready"
} catch {
  Log-Warn "MinIO bucket setup failed. Create via http://localhost:9001"
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Cyan
Write-Host "  n8n UI:        http://localhost:$N8N_PORT  (user: $N8N_USER)"
Write-Host "  MinIO Console: http://localhost:9001"
Write-Host "  Tesseract OCR: http://localhost:${TESSERACT_PORT}/health"
Write-Host "  PaddleOCR:     http://localhost:${PADDLE_PORT}/health"
Write-Host "  AI Service:    http://localhost:${AI_SERVICE_PORT}/health"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Import n8n workflow:"
Write-Host "     n8n UI -> Workflows -> Add -> Import from file"
Write-Host "     File: n8n\workflows\ocr_pipeline.json"
Write-Host "  2. Deploy Firebase backend:"
Write-Host "     cd backend && firebase deploy --only functions"
Write-Host "  3. Deploy Firebase frontend:"
Write-Host "     cd frontend && npm run build && firebase deploy --only hosting"
Write-Host ""