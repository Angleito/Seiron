#!/bin/bash

# Install missing security dependencies in the root project
echo "Installing security dependencies in root project..."
npm install jose nanoid isomorphic-dompurify @privy-io/server-auth

# Install missing dependencies in frontend
echo "Installing security dependencies in frontend..."
cd frontend
npm install jose nanoid isomorphic-dompurify

# Return to root
cd ..

echo "Security dependencies installed successfully!"
echo ""
echo "Please ensure you have set up the following environment variables:"
echo "- SESSION_SECRET"
echo "- ALLOWED_ORIGINS"
echo "- PRIVY_APP_ID"
echo "- PRIVY_APP_SECRET"
echo "- UPSTASH_REDIS_REST_URL"
echo "- UPSTASH_REDIS_REST_TOKEN"
echo "- OPENAI_API_KEY"
echo "- ANTHROPIC_API_KEY"
echo "- ELEVENLABS_API_KEY"