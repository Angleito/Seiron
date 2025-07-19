#!/bin/bash

# Quick Validation Script
# Run this for a rapid health check of the application

set -e

echo "🚀 Seiron Quick Validation"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node --version)
REQUIRED_VERSION="20.0.0"
if [[ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]]; then 
    echo -e "${GREEN}✓ Node.js $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js $NODE_VERSION (requires >= v$REQUIRED_VERSION)${NC}"
    exit 1
fi

# Check if dependencies are installed
echo ""
echo "📚 Checking dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ Dependencies not installed. Run: npm install${NC}"
fi

# Check for environment file
echo ""
echo "🔐 Checking environment configuration..."
if [ -f ".env.local" ] || [ -f ".env" ]; then
    echo -e "${GREEN}✓ Environment file found${NC}"
else
    echo -e "${YELLOW}⚠ No environment file found. Copy .env.example to .env.local${NC}"
fi

# Check 3D models
echo ""
echo "🎮 Checking 3D models..."
if [ -f "public/models/seiron.glb" ] || [ -f "public/models/dragon_head.glb" ]; then
    if [ -f "public/models/seiron.glb" ]; then
        SIZE=$(du -h "public/models/seiron.glb" | cut -f1)
    else
        SIZE=$(du -h "public/models/dragon_head.glb" | cut -f1)
    fi
    echo -e "${GREEN}✓ Dragon model found (${SIZE})${NC}"
else
    echo -e "${RED}✗ Dragon model not found${NC}"
fi

# Check API directory
echo ""
echo "🔌 Checking API routes..."
API_COUNT=$(find api -name "*.ts" -o -name "*.js" 2>/dev/null | wc -l)
if [ $API_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓ Found $API_COUNT API route files${NC}"
else
    echo -e "${RED}✗ No API routes found${NC}"
fi

# Check TypeScript
echo ""
echo "📝 Running TypeScript check..."
if npm run type-check > /dev/null 2>&1; then
    echo -e "${GREEN}✓ TypeScript check passed${NC}"
else
    echo -e "${YELLOW}⚠ TypeScript errors found (run: npm run type-check)${NC}"
fi

# Quick API test
echo ""
echo "🧪 Testing local API..."
if command -v curl &> /dev/null; then
    if curl -s -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Local API responding${NC}"
    else
        echo -e "${YELLOW}⚠ Local API not responding (is dev server running?)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ curl not found, skipping API test${NC}"
fi

# Summary
echo ""
echo "=========================="
echo "📊 Validation Complete"
echo ""
echo "Quick commands:"
echo "  • Start dev server: npm run dev"
echo "  • Run tests: npm run test:quick"
echo "  • Full test suite: npm run test:full"
echo "  • Build production: npm run build"
echo ""