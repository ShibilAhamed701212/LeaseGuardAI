#!/bin/bash
# =============================================================
# OCR Agent — Docker setup script
# Run from: infra/docker/
# Usage: chmod +x setup.sh && ./setup.sh
# =============================================================

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${CYAN}=== OCR Agent Docker Setup ===${NC}"

# Check .env exists
if [ ! -f ".env" ]; then
  echo -e "${RED}ERROR: .env file not found. Copy .env.example and fill in values.${NC}"
  exit 1
fi

source .env

# Create Docker network if not exists
if ! docker network ls | grep -q "ocr-network"; then
  echo -e "${CYAN}Creating ocr-network...${NC}"
  docker network create ocr-network
fi

# Pull latest images
echo -e "${CYAN}Pulling base images...${NC}"
docker-compose pull postgres redis minio n8n ollama

# Build custom services
echo -e "${CYAN}Building OCR + AI services...${NC}"
docker-compose build --no-cache tesseract-service paddle-service ai-service

# Start infrastructure first
echo -e "${CYAN}Starting infrastructure (postgres, redis, minio)...${NC}"
docker-compose up -d postgres redis minio
echo "Waiting for infrastructure to be healthy..."
sleep 15

# Start processing layer
echo -e "${CYAN}Starting processing layer (n8n, OCR, AI, Ollama)...${NC}"
docker-compose up -d n8n tesseract-service paddle-service ai-service ollama

# Pull Ollama model
echo -e "${CYAN}Pulling Ollama model (${OLLAMA_MODEL:-llama3})...${NC}"
sleep 10
docker exec ocr-ollama ollama pull "${OLLAMA_MODEL:-llama3}" || echo -e "${YELLOW}WARNING: Ollama model pull failed. Run manually: docker exec ocr-ollama ollama pull llama3${NC}"

# Create MinIO bucket
echo -e "${CYAN}Creating MinIO bucket...${NC}"
sleep 5
docker run --rm --network ocr-network \
  minio/mc:latest \
  sh -c "mc alias set local http://minio:9000 ${MINIO_ACCESS_KEY:-minioadmin} ${MINIO_SECRET_KEY:-minioadmin} && \
         mc mb --ignore-existing local/${MINIO_BUCKET:-ocr-agent} && \
         mc anonymous set none local/${MINIO_BUCKET:-ocr-agent}" \
  || echo -e "${YELLOW}WARNING: MinIO bucket setup failed. Create manually via http://localhost:9001${NC}"

echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo -e "${CYAN}Service URLs:${NC}"
echo "  n8n UI:        http://localhost:${N8N_PORT:-5678}  (user: ${N8N_USER:-admin})"
echo "  MinIO Console: http://localhost:9001"
echo "  Tesseract OCR: http://localhost:${TESSERACT_PORT:-8884}/health"
echo "  PaddleOCR:     http://localhost:${PADDLE_PORT:-8885}/health"
echo "  AI Service:    http://localhost:${AI_SERVICE_PORT:-8386}/health"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Import n8n workflow: n8n UI → Import → n8n/workflows/ocr_pipeline.json"
echo "  2. Deploy Firebase backend: cd backend && firebase deploy"
echo "  3. Deploy Firebase frontend: cd frontend && npm run build && firebase deploy"
echo ""