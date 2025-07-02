# Multi-stage build for optimized image size
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --only=production
RUN npm ci --prefix frontend --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Build frontend
RUN cd frontend && npm run build

# Production stage
FROM node:20-alpine

RUN apk add --no-cache tini

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/frontend/node_modules ./frontend/node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/frontend/package*.json ./frontend/

# Copy necessary source files for runtime
COPY src/agents ./src/agents
COPY src/contracts ./src/contracts
COPY src/config ./src/config

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

# Default command starts the API server
CMD ["node", "dist/api/server.js"]