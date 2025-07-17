# Dockerfile for Voice Chat E2E Testing in Docker Environment
FROM mcr.microsoft.com/playwright:v1.40.0-focal

# Set working directory
WORKDIR /app

# Install additional dependencies for audio testing
RUN apt-get update && apt-get install -y \
    pulseaudio \
    alsa-utils \
    sox \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Install Playwright browsers with audio support
RUN npx playwright install --with-deps

# Create directories for test outputs
RUN mkdir -p e2e/screenshots test-results

# Set environment variables for audio testing
ENV PULSE_RUNTIME_PATH=/tmp/pulse-runtime
ENV DISPLAY=:99

# Create fake audio environment for testing
RUN mkdir -p /tmp/pulse-runtime

# Script to setup fake audio environment
RUN echo '#!/bin/bash\n\
# Setup fake PulseAudio for testing\n\
pulseaudio --start --load="module-null-sink sink_name=fake_output" --load="module-null-source source_name=fake_input" --exit-idle-time=-1 --daemon\n\
\n\
# Setup fake X11 display for browser testing\n\
Xvfb :99 -screen 0 1280x720x24 &\n\
\n\
# Run voice chat tests\n\
exec "$@"' > /usr/local/bin/setup-audio-env.sh

RUN chmod +x /usr/local/bin/setup-audio-env.sh

# Default command
CMD ["./scripts/run-voice-tests.sh"]

# Health check for audio environment
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD pulseaudio --check || exit 1

# Labels
LABEL org.opencontainers.image.title="Seiron Voice Chat E2E Tests"
LABEL org.opencontainers.image.description="Docker container for running voice chat E2E tests with audio support"
LABEL org.opencontainers.image.version="1.0.0"