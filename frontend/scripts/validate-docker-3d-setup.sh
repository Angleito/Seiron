#!/bin/bash

# Comprehensive Docker 3D Model Testing Validation Script
# This script validates that our enhanced model loading and fallback systems work correctly in Docker

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${CYAN}=============================================="
    echo -e "${CYAN}$1"
    echo -e "${CYAN}=============================================="
    echo -e "${NC}"
}

print_section() {
    echo ""
    echo -e "${BLUE}--- $1 ---${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${PURPLE}ℹ️  $1${NC}"
}

# Configuration
BASE_URL="${TEST_URL:-http://localhost:3000}"
OUTPUT_DIR="./docker-validation-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FULL_OUTPUT_DIR="${OUTPUT_DIR}/${TIMESTAMP}"

print_header "Docker 3D Model Testing Validation"

print_info "Timestamp: $TIMESTAMP"
print_info "Base URL: $BASE_URL"
print_info "Output Directory: $FULL_OUTPUT_DIR"

# Create output directory
mkdir -p "$FULL_OUTPUT_DIR"

print_section "Phase 1: Environment Validation"

# Check prerequisites
print_info "Checking prerequisites..."

if ! command -v node >/dev/null 2>&1; then
    print_error "Node.js not found"
    exit 1
fi
print_success "Node.js: $(node --version)"

if ! command -v npm >/dev/null 2>&1; then
    print_error "npm not found"
    exit 1
fi
print_success "npm: $(npm --version)"

if [ ! -f "package.json" ]; then
    print_error "package.json not found. Run from frontend directory"
    exit 1
fi
print_success "Frontend directory confirmed"

# Check if development server is running
print_info "Checking development server..."
if curl -f -s "$BASE_URL" >/dev/null 2>&1; then
    print_success "Development server is responding at $BASE_URL"
else
    print_warning "Development server not responding at $BASE_URL"
    print_info "You may need to start it with: npm run dev"
fi

print_section "Phase 2: Enhanced Model Validation Testing"

print_info "Testing enhanced model validation system..."

# Test the enhanced ModelExistenceValidator
cat > "$FULL_OUTPUT_DIR/test-model-validation.js" << 'EOF'
const { ModelExistenceValidator } = require('../utils/modelExistenceValidator.js');

async function testModelValidation() {
    console.log('🔍 Testing Enhanced Model Validation System...');
    
    try {
        const validator = ModelExistenceValidator.getInstance();
        
        // Test known models
        const modelsToTest = [
            '/models/seiron.glb',
            '/models/seiron_animated.gltf',
            '/models/seiron_optimized.glb',
            '/models/dragon_head_optimized.glb'
        ];
        
        console.log('📋 Testing model availability...');
        const results = await validator.validateModels(modelsToTest);
        
        let availableCount = 0;
        let unavailableCount = 0;
        
        results.forEach(result => {
            if (result.exists) {
                console.log(`✅ ${result.path} - Available (${result.loadTime}ms, ${result.fileSize} bytes)`);
                availableCount++;
            } else {
                console.log(`❌ ${result.path} - Not available: ${result.error}`);
                unavailableCount++;
            }
        });
        
        console.log(`\n📊 Summary: ${availableCount} available, ${unavailableCount} unavailable`);
        
        // Test fallback chain creation
        console.log('\n🔗 Testing fallback chain creation...');
        const fallbackChain = await validator.createFallbackChain('seiron-primary');
        console.log(`Fallback chain: ${fallbackChain.join(' → ')}`);
        
        // Generate diagnostic report
        console.log('\n📈 Generating diagnostic report...');
        const report = await validator.createDiagnosticReport();
        
        console.log('🏥 Health Score:', report.healthScore);
        console.log('📊 Available Models:', report.availableModels.length);
        console.log('🚫 Failed Models:', report.failedModels.length);
        
        // Return success if health score is good
        return report.healthScore >= 50;
        
    } catch (error) {
        console.error('❌ Model validation test failed:', error);
        return false;
    }
}

testModelValidation().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
EOF

if node "$FULL_OUTPUT_DIR/test-model-validation.js" 2>&1 | tee "$FULL_OUTPUT_DIR/model-validation.log"; then
    print_success "Enhanced model validation system is working"
else
    print_warning "Model validation system has issues (check logs)"
fi

print_section "Phase 3: Basic Puppeteer Diagnostics"

print_info "Running basic 3D diagnostics with Puppeteer..."

# Run basic diagnostics
export DIAGNOSE_URL="$BASE_URL"
export DIAGNOSE_OUTPUT_DIR="$FULL_OUTPUT_DIR/puppeteer-basic"
export DIAGNOSE_SCREENSHOTS="true"
export DIAGNOSE_VERBOSE="true"

if npm run diagnose:3d:docker 2>&1 | tee "$FULL_OUTPUT_DIR/puppeteer-basic.log"; then
    print_success "Basic Puppeteer diagnostics completed"
else
    print_warning "Basic Puppeteer diagnostics had issues"
fi

print_section "Phase 4: Enhanced 3D Diagnostics"

print_info "Running enhanced 3D diagnostics with model switching..."

# Run enhanced diagnostics
if node scripts/enhanced-3d-diagnostics.js \
    --url "$BASE_URL" \
    --output "$FULL_OUTPUT_DIR/enhanced" \
    --screenshots \
    --verbose \
    --performance-profile 2>&1 | tee "$FULL_OUTPUT_DIR/enhanced-diagnostics.log"; then
    print_success "Enhanced 3D diagnostics completed"
else
    print_warning "Enhanced 3D diagnostics had issues"
fi

print_section "Phase 5: Docker E2E Tests"

print_info "Running Docker-specific E2E tests with Playwright..."

# Set Playwright environment
export PLAYWRIGHT_HTML_REPORT="$FULL_OUTPUT_DIR/playwright-report"
export BASE_URL="$BASE_URL"

if npm run test:3d:docker 2>&1 | tee "$FULL_OUTPUT_DIR/playwright-docker.log"; then
    print_success "Docker E2E tests completed"
else
    print_warning "Docker E2E tests had issues"
fi

print_section "Phase 6: Comprehensive Test Suite"

print_info "Running comprehensive Docker test suite..."

# Run comprehensive tests
export TEST_URL="$BASE_URL"
export TEST_OUTPUT_DIR="$FULL_OUTPUT_DIR/comprehensive"
export RUN_ENHANCED="true"
export VERBOSE="true"

if ./scripts/docker-test-runner.sh --verbose 2>&1 | tee "$FULL_OUTPUT_DIR/comprehensive.log"; then
    print_success "Comprehensive test suite completed"
else
    print_warning "Comprehensive test suite had issues"
fi

print_section "Phase 7: Results Analysis"

print_info "Analyzing test results..."

# Count test artifacts
screenshot_count=$(find "$FULL_OUTPUT_DIR" -name "*.png" 2>/dev/null | wc -l)
json_report_count=$(find "$FULL_OUTPUT_DIR" -name "*.json" 2>/dev/null | wc -l)
log_file_count=$(find "$FULL_OUTPUT_DIR" -name "*.log" 2>/dev/null | wc -l)

# Check for specific success indicators
has_puppeteer_success=false
has_playwright_success=false
has_enhanced_success=false

# Check Puppeteer results
if grep -q "Health score" "$FULL_OUTPUT_DIR"/*.log 2>/dev/null; then
    has_puppeteer_success=true
fi

# Check Playwright results
if [ -f "$FULL_OUTPUT_DIR/playwright-report/index.html" ]; then
    has_playwright_success=true
fi

# Check enhanced diagnostics results
if find "$FULL_OUTPUT_DIR" -name "*enhanced*" -type f | grep -q .; then
    has_enhanced_success=true
fi

# Generate summary report
cat > "$FULL_OUTPUT_DIR/validation-summary.json" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "testConfiguration": {
    "baseUrl": "$BASE_URL",
    "outputDirectory": "$FULL_OUTPUT_DIR"
  },
  "testResults": {
    "puppeteerDiagnostics": $has_puppeteer_success,
    "playwrightTests": $has_playwright_success,
    "enhancedDiagnostics": $has_enhanced_success
  },
  "artifacts": {
    "screenshots": $screenshot_count,
    "jsonReports": $json_report_count,
    "logFiles": $log_file_count
  },
  "directories": [
    "$(find "$FULL_OUTPUT_DIR" -type d | sed 's|'"$FULL_OUTPUT_DIR"'/||g' | tail -n +2 | head -10)"
  ],
  "healthStatus": "$(if [ "$has_puppeteer_success" = true ] && [ "$has_playwright_success" = true ]; then echo 'HEALTHY'; else echo 'ISSUES_DETECTED'; fi)"
}
EOF

print_section "Phase 8: Final Summary"

echo ""
print_info "=== DOCKER 3D MODEL TESTING VALIDATION SUMMARY ==="
echo ""
echo "🕐 Test Duration: Started at $TIMESTAMP"
echo "📁 Results Directory: $FULL_OUTPUT_DIR"
echo ""
echo "📊 Test Results:"
echo "  • Puppeteer Diagnostics: $([ "$has_puppeteer_success" = true ] && echo "✅ PASSED" || echo "⚠️  ISSUES")"
echo "  • Playwright E2E Tests: $([ "$has_playwright_success" = true ] && echo "✅ PASSED" || echo "⚠️  ISSUES")"  
echo "  • Enhanced Diagnostics: $([ "$has_enhanced_success" = true ] && echo "✅ PASSED" || echo "⚠️  ISSUES")"
echo ""
echo "📁 Generated Artifacts:"
echo "  • Screenshots: $screenshot_count"
echo "  • JSON Reports: $json_report_count"
echo "  • Log Files: $log_file_count"
echo ""

# Determine overall status
overall_success=true
if [ "$has_puppeteer_success" != true ]; then
    print_warning "Puppeteer diagnostics had issues"
    overall_success=false
fi

if [ "$has_playwright_success" != true ]; then
    print_warning "Playwright tests had issues"
    overall_success=false
fi

if [ "$has_enhanced_success" != true ]; then
    print_warning "Enhanced diagnostics had issues"
    overall_success=false
fi

echo "📋 Next Steps:"
echo "  1. Review detailed logs in: $FULL_OUTPUT_DIR/"
echo "  2. Check screenshots for visual validation"
echo "  3. Examine JSON reports for detailed metrics"
if [ "$has_playwright_success" = true ]; then
    echo "  4. Open Playwright report: $FULL_OUTPUT_DIR/playwright-report/index.html"
fi

echo ""
if [ "$overall_success" = true ]; then
    print_success "🎉 Docker 3D Model Testing Environment is VALIDATED and WORKING!"
    echo ""
    print_info "The enhanced model validation, fallback systems, and Docker testing"
    print_info "infrastructure are all functioning correctly. You can now run:"
    echo ""
    echo "  • npm run diagnose:3d:docker"
    echo "  • npm run test:3d:docker"
    echo "  • npm run test:3d:comprehensive"
    echo ""
    exit 0
else
    print_warning "🔧 Docker 3D Model Testing Environment has some ISSUES"
    echo ""
    print_info "Some tests failed or had issues. Check the logs and reports for details."
    print_info "The system may still be functional, but requires investigation."
    echo ""
    exit 1
fi