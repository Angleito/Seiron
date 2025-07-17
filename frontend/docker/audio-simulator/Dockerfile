# Audio Simulator Docker Container
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for audio processing
RUN apk add --no-cache \
    build-base \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --only=production; fi

# Copy application files
COPY *.js ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Create directories for audio processing
RUN mkdir -p /app/temp /app/uploads
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["npm", "start"]