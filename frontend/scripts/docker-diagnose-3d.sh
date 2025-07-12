#!/bin/bash

# Docker-specific wrapper for 3D diagnostics
# This script sets up the optimal environment for running diagnostics in Docker containers

set -e

echo "🐳 Running Dragon 3D Diagnostics in Docker Environment"
echo "=================================================="

# Check if we're in a Docker container
if [ -f /.dockerenv ]; then
    echo "✅ Running inside Docker container"
    IN_DOCKER=true
else
    echo "ℹ️  Running outside Docker container"
    IN_DOCKER=false
fi

# Set default values
URL="${DIAGNOSE_URL:-http://localhost:3000}"
TIMEOUT="${DIAGNOSE_TIMEOUT:-45000}"
OUTPUT_DIR="${DIAGNOSE_OUTPUT_DIR:-./docker-diagnosis-reports}"
ENABLE_SCREENSHOTS="${DIAGNOSE_SCREENSHOTS:-true}"
VERBOSE="${DIAGNOSE_VERBOSE:-true}"

echo "Configuration:"
echo "- URL: $URL"
echo "- Timeout: $TIMEOUT ms"
echo "- Output Directory: $OUTPUT_DIR"
echo "- Screenshots: $ENABLE_SCREENSHOTS"
echo "- Verbose: $VERBOSE"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Build the command arguments
ARGS=()
ARGS+=("--url" "$URL")
ARGS+=("--timeout" "$TIMEOUT")
ARGS+=("--output" "$OUTPUT_DIR")
ARGS+=("--headless" "true")  # Always headless in Docker

if [ "$ENABLE_SCREENSHOTS" = "true" ]; then
    ARGS+=("--screenshots")
fi

if [ "$VERBOSE" = "true" ]; then
    ARGS+=("--verbose")
fi

# Check if development server is running
echo "🔍 Checking if development server is available..."
if curl -f -s "$URL" > /dev/null 2>&1; then
    echo "✅ Development server is responding"
else
    echo "⚠️  Development server is not responding at $URL"
    echo "   Consider starting it with: npm run dev"
    echo "   Or check if the URL is correct"
    echo ""
fi

# Check available memory (important for 3D rendering)
if command -v free > /dev/null 2>&1; then
    echo "💾 Memory status:"
    free -h | head -2
    echo ""
fi

# Check if required dependencies are available
echo "🔧 Checking required dependencies..."

if command -v node > /dev/null 2>&1; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js not found"
    exit 1
fi

if [ -f "node_modules/puppeteer/package.json" ]; then
    PUPPETEER_VERSION=$(cat node_modules/puppeteer/package.json | grep '"version"' | head -1 | awk -F'"' '{print $4}')
    echo "✅ Puppeteer: $PUPPETEER_VERSION"
else
    echo "❌ Puppeteer not found in node_modules"
    echo "   Run: npm install"
    exit 1
fi

# Check if the diagnostic script exists
if [ -f "scripts/diagnose-3d-loading.js" ]; then
    echo "✅ Diagnostic script found"
else
    echo "❌ Diagnostic script not found at scripts/diagnose-3d-loading.js"
    exit 1
fi

echo ""
echo "🚀 Starting diagnostics..."
echo "Arguments: ${ARGS[*]}"
echo ""

# Run the diagnostic script
node scripts/diagnose-3d-loading.js "${ARGS[@]}"
DIAGNOSTIC_EXIT_CODE=$?

echo ""
echo "📊 Diagnostic Results:"
echo "- Exit Code: $DIAGNOSTIC_EXIT_CODE"
echo "- Reports Location: $OUTPUT_DIR"

# List generated reports
if [ -d "$OUTPUT_DIR" ]; then
    echo "- Generated Files:"
    ls -la "$OUTPUT_DIR" | grep -E '\.(json|txt|png)$' | while read -r line; do
        echo "  $line"
    done
fi

# In Docker, optionally copy reports to a mounted volume
if [ "$IN_DOCKER" = true ] && [ -n "$DOCKER_REPORTS_VOLUME" ]; then
    echo ""
    echo "📁 Copying reports to mounted volume: $DOCKER_REPORTS_VOLUME"
    cp -r "$OUTPUT_DIR"/* "$DOCKER_REPORTS_VOLUME/" 2>/dev/null || echo "⚠️  Could not copy to volume (check if mounted)"
fi

# Summary based on exit code
echo ""
if [ $DIAGNOSTIC_EXIT_CODE -eq 0 ]; then
    echo "🎉 Diagnostics completed successfully!"
    echo "   Health score is acceptable (>50)"
else
    echo "⚠️  Diagnostics found issues!"
    echo "   Health score is low (≤50) or critical errors occurred"
    echo "   Check the detailed reports for specific issues and solutions"
fi

echo ""
echo "📚 Next Steps:"
echo "- Review the text summary: cat $OUTPUT_DIR/dragon-3d-diagnosis-*.txt"
echo "- Check detailed JSON report: cat $OUTPUT_DIR/dragon-3d-diagnosis-*.json"
if [ "$ENABLE_SCREENSHOTS" = "true" ]; then
    echo "- View screenshots in: $OUTPUT_DIR/*.png"
fi

exit $DIAGNOSTIC_EXIT_CODE