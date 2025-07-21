#!/bin/bash

# Hackathon Quick Deploy Script
# Single command deployment for Vercel

echo "🚀 Hackathon Deployment Script"
echo "=============================="

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

# Deploy to production
echo "📦 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "⚠️  IMPORTANT: Set these environment variables in Vercel Dashboard:"
echo ""
echo "Required MCP Variables:"
echo "  - MCP_HIVE_URL"
echo "  - MCP_SEI_URL"
echo "  - MCP_PORTFOLIO_URL"
echo "  - HIVE_INTELLIGENCE_API_KEY"
echo "  - SEI_API_KEY"
echo "  - PORTFOLIO_API_KEY"
echo ""
echo "Other Required Variables:"
echo "  - OPENAI_API_KEY"
echo "  - SUPABASE_URL"
echo "  - SUPABASE_ANON_KEY"
echo "  - ELEVENLABS_API_KEY (if using voice)"
echo ""
echo "📝 See HACKATHON_MCP_SETUP.md for full setup guide"
echo ""
echo "🔗 Your deployment URL will be shown above"