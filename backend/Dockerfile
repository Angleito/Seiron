# Multi-stage Docker build for Railway deployment
# Optimized for production with enhanced security and performance

# ============================================
# Base stage - Common dependencies
# ============================================
FROM node:20-alpine AS base

# Set build arguments for Railway
ARG RAILWAY_PROJECT_NAME
ARG RAILWAY_ENVIRONMENT
ARG RAILWAY_SERVICE_NAME

# Install security updates and required system packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    tzdata \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/*

# Create app user for security (non-root)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Set optimal Node.js production flags
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=1024 --enable-source-maps" \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

# Copy package files for dependency installation
COPY package*.json ./

# ============================================
# Dependencies stage - Production dependencies
# ============================================
FROM base AS deps

# Install only production dependencies with optimization
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force && \
    rm -rf ~/.npm

# ============================================
# Build stage - Compile TypeScript
# ============================================
FROM base AS build

# Copy source code
COPY --chown=backend:nodejs . .

# Install all dependencies including dev dependencies
RUN npm ci --no-audit --no-fund

# Build the application with Railway-specific optimizations
RUN npm run build && \
    npm prune --production && \
    npm cache clean --force && \
    rm -rf ~/.npm

# Remove development files to reduce image size
RUN rm -rf src __tests__ tests docs coverage *.md \
    jest.config.js tsconfig.json

# ============================================
# Production stage - Railway optimized image
# ============================================
FROM node:20-alpine AS production

# Railway service labels
LABEL org.opencontainers.image.title="Seiron Backend API"
LABEL org.opencontainers.image.description="AI-powered DeFi portfolio management backend"
LABEL org.opencontainers.image.vendor="Seiron Team"
LABEL railway.service="backend"

# Install security updates and minimal runtime dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    tzdata \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/*

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=512 --enable-source-maps" \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    PORT=3000

# Copy production dependencies
COPY --from=deps --chown=backend:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=backend:nodejs /app/dist ./dist
COPY --from=build --chown=backend:nodejs /app/package*.json ./

# Create necessary directories
RUN mkdir -p logs tmp && \
    chown -R backend:nodejs logs tmp && \
    chmod 755 logs tmp

# Switch to non-root user
USER backend

# Enhanced health check for Railway
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Expose the port that Railway expects
EXPOSE $PORT

# Use dumb-init to handle signals properly for Railway
ENTRYPOINT ["dumb-init", "--"]

# Start the application with Railway-optimized settings
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

# Build the TypeScript code
RUN npm run build || true

# Switch to non-root user
USER backend

# Expose port
EXPOSE 3001

# Start in development mode with nodemon for better dev experience
CMD ["npx", "nodemon", "--watch", "src", "--ext", "ts", "--exec", "npx", "tsx", "src/server.ts"]

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
LABEL maintainer="Seiron Team"
LABEL description="Seiron AI Dragon Trading Assistant Backend API"
LABEL version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/seiron/seiron-backend"
