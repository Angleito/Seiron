# Frontend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy source code
COPY . .

# Build Next.js application (skip for dev)
# RUN npm run build

# Production stage
FROM node:20-alpine

RUN apk add --no-cache tini

WORKDIR /app

# Copy all application files
COPY --from=builder /app ./

# Set environment
ENV NODE_ENV=development
ENV PORT=3000

EXPOSE 3000

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Run in dev mode for now
CMD ["npm", "run", "dev"]