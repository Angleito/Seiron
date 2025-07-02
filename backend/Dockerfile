# Multi-stage Docker build for optimal production images
# Based on Node.js 20 Alpine for minimal size and security

# ============================================
# Base stage - Common dependencies
# ============================================
FROM node:20-alpine AS base

# Install security updates and required system packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create app user for security (non-root)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# ============================================
# Dependencies stage - Install all dependencies
# ============================================
FROM base AS deps

# Install all dependencies (including devDependencies for build)
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# ============================================
# Build stage - Compile TypeScript
# ============================================
FROM base AS build

# Copy source code
COPY --chown=backend:nodejs . .

# Install all dependencies including dev dependencies
RUN npm ci --no-audit --no-fund

# Build the application
RUN npm run build && \
    npm prune --production && \
    npm cache clean --force

# ============================================
# Production stage - Final optimized image
# ============================================
FROM node:20-alpine AS production

# Install security updates and minimal runtime dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy production dependencies
COPY --from=deps --chown=backend:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=backend:nodejs /app/dist ./dist
COPY --from=build --chown=backend:nodejs /app/package*.json ./

# Create logs directory
RUN mkdir -p logs && chown -R backend:nodejs logs

# Switch to non-root user
USER backend

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]

# ============================================
# Development stage - For development use
# ============================================
FROM base AS development

# Install all dependencies including dev dependencies
RUN npm ci --no-audit --no-fund

# Copy source code
COPY --chown=backend:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown -R backend:nodejs logs

# Switch to non-root user
USER backend

# Expose port
EXPOSE 3001

# Start in development mode
CMD ["npm", "run", "dev"]

# ============================================
# Test stage - For running tests
# ============================================
FROM development AS test

# Switch back to root to install test dependencies
USER root

# Install additional test dependencies if needed
RUN apk add --no-cache git

# Switch back to app user
USER backend

# Run tests
CMD ["npm", "test"]

# ============================================
# Build metadata
# ============================================
LABEL maintainer="Sei Portfolio Backend Team"
LABEL description="Sei AI Portfolio Manager Backend API"
LABEL version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/your-org/sei-portfolio-backend"
