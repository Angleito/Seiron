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

# Install dependencies with legacy peer deps to handle version conflicts
# Using npm install instead of npm ci due to lock file sync issues
RUN npm install --legacy-peer-deps --omit=dev
RUN npm install --prefix frontend --legacy-peer-deps --omit=dev

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