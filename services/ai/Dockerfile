FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json ./
RUN npm install --omit=dev

# Copy source and build
COPY tsconfig.json ./
COPY controller/ ./controller/
COPY providers/  ./providers/
COPY prompts/    ./prompts/
COPY utils/      ./utils/
COPY app.ts      ./

RUN npm install --save-dev typescript ts-node @types/node @types/express @types/cors \
  && npx tsc \
  && npm prune --omit=dev

# Security: non-root user
RUN addgroup -S aigroup && adduser -S aiuser -G aigroup
USER aiuser

EXPOSE 8386

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8386/health || exit 1

CMD ["node", "dist/app.js"]