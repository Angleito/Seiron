# Frontend Dockerfile
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ py3-pip

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Using npm install instead of npm ci due to lock file sync issues
RUN npm install --legacy-peer-deps

# Copy frontend source code
COPY . .

# Build Vite application
RUN npm run build

# Production stage
FROM node:20-alpine

RUN apk add --no-cache tini

WORKDIR /app

# Copy package files
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --only=production --legacy-peer-deps

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/vite.config.ts ./

# Install a simple static server for production
RUN npm install -g serve

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Serve the built files
CMD ["serve", "-s", "dist", "-l", "3000"]