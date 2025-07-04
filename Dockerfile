# Multi-stage build for optimized image size
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Copy lock files if they exist
COPY package-loc[k].json* ./
COPY frontend/package-loc[k].json* ./frontend/

# Install dependencies (use npm install if no lock file exists)
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
RUN if [ -f frontend/package-lock.json ]; then npm ci --prefix frontend --omit=dev; else npm install --prefix frontend --omit=dev; fi

# Copy source code
COPY . .

# Build TypeScript (skip for now, will be built on CI)
# RUN npm run build

# Build frontend (skip for now, will be built on CI)
# RUN cd frontend && npm run build

# Production stage
FROM node:20-alpine

RUN apk add --no-cache tini

WORKDIR /app

# Copy all application files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/frontend/node_modules ./frontend/node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/frontend/package*.json ./frontend/
COPY --from=builder /app/src ./src
COPY --from=builder /app/frontend ./frontend
COPY --from=builder /app/tsconfig.json ./

# Create cache directory
RUN mkdir -p /app/cache

# Set environment
ENV NODE_ENV=production
ENV API_PORT=3001
ENV FRONTEND_PORT=3000

# Expose ports
EXPOSE 3000 3001

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Install tsx for running TypeScript directly
RUN npm install -g tsx

# Default command starts the simple API server for testing
CMD ["tsx", "src/api/simple-server.ts"]