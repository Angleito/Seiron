#!/bin/bash

# Voice Chat E2E Test Runner Script
# Runs comprehensive voice chat testing suite

set -e

echo "🎤 Starting Voice Chat E2E Test Suite"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Playwright is installed
if ! command -v npx playwright --version &> /dev/null; then
    echo -e "${RED}❌ Playwright not found. Please install it first:${NC}"
    echo "npm install -D @playwright/test"
    exit 1
fi

# Create screenshots directory
mkdir -p e2e/screenshots

# Function to run test suite
run_test_suite() {
    local test_name=$1
    local test_pattern=$2
    local project=${3:-"voice-chat-chrome"}
    
    echo -e "${BLUE}🧪 Running $test_name tests...${NC}"
    
    if npx playwright test "$test_pattern" --project="$project" --reporter=line; then
        echo -e "${GREEN}✅ $test_name tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name tests failed${NC}"
        return 1
    fi
}

# Function to run cross-browser tests
run_cross_browser() {
    local test_pattern=$1
    local test_name=$2
    
    echo -e "${BLUE}🌐 Running $test_name across browsers...${NC}"
    
    local browsers=("voice-chat-chrome" "voice-chat-firefox" "voice-chat-webkit")
    local failed_browsers=()
    
    for browser in "${browsers[@]}"; do
        echo -e "${YELLOW}Testing on $browser...${NC}"
        if ! npx playwright test "$test_pattern" --project="$browser" --reporter=line; then
            failed_browsers+=("$browser")
        fi
    done
    
    if [ ${#failed_browsers[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ All browsers passed for $test_name${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed browsers for $test_name: ${failed_browsers[*]}${NC}"
        return 1
    fi
}

# Test execution flags
RUN_BASIC=${RUN_BASIC:-true}
RUN_PERMISSIONS=${RUN_PERMISSIONS:-true}
RUN_VAD=${RUN_VAD:-true}
RUN_ERROR_RECOVERY=${RUN_ERROR_RECOVERY:-true}
RUN_MEMORY=${RUN_MEMORY:-true}
RUN_MOBILE=${RUN_MOBILE:-true}
RUN_CROSS_BROWSER=${RUN_CROSS_BROWSER:-false}
RUN_PERFORMANCE=${RUN_PERFORMANCE:-false}

# Track test results
declare -a test_results
declare -a failed_tests

echo -e "${YELLOW}📋 Test Configuration:${NC}"
echo "  Basic Flow: $RUN_BASIC"
echo "  Permissions: $RUN_PERMISSIONS"
echo "  Voice Activity Detection: $RUN_VAD"
echo "  Error Recovery: $RUN_ERROR_RECOVERY"
echo "  Memory Persistence: $RUN_MEMORY"
echo "  Mobile Testing: $RUN_MOBILE"
echo "  Cross-Browser: $RUN_CROSS_BROWSER"
echo "  Performance: $RUN_PERFORMANCE"
echo ""

# Start test execution
start_time=$(date +%s)

# 1. Basic Voice Chat Flow
if [ "$RUN_BASIC" = true ]; then
    if run_test_suite "Voice Chat Flow" "e2e/voice-chat/voice-chat-flow.spec.ts"; then
        test_results+=("✅ Voice Chat Flow")
    else
        test_results+=("❌ Voice Chat Flow")
        failed_tests+=("Voice Chat Flow")
    fi
fi

# 2. Permissions Testing
if [ "$RUN_PERMISSIONS" = true ]; then
    if run_test_suite "Voice Permissions" "e2e/voice-chat/voice-permissions.spec.ts"; then
        test_results+=("✅ Voice Permissions")
    else
        test_results+=("❌ Voice Permissions")
        failed_tests+=("Voice Permissions")
    fi
fi

# 3. Voice Activity Detection
if [ "$RUN_VAD" = true ]; then
    if run_test_suite "Voice Activity Detection" "e2e/voice-chat/voice-activity-detection.spec.ts"; then
        test_results+=("✅ Voice Activity Detection")
    else
        test_results+=("❌ Voice Activity Detection")
        failed_tests+=("Voice Activity Detection")
    fi
fi

# 4. Error Recovery
if [ "$RUN_ERROR_RECOVERY" = true ]; then
    if run_test_suite "Error Recovery" "e2e/voice-chat/voice-error-recovery.spec.ts"; then
        test_results+=("✅ Error Recovery")
    else
        test_results+=("❌ Error Recovery")
        failed_tests+=("Error Recovery")
    fi
fi

# 5. Memory Persistence
if [ "$RUN_MEMORY" = true ]; then
    if run_test_suite "Memory Persistence" "e2e/voice-chat/voice-memory-persistence.spec.ts"; then
        test_results+=("✅ Memory Persistence")
    else
        test_results+=("❌ Memory Persistence")
        failed_tests+=("Memory Persistence")
    fi
fi

# 6. Mobile Testing
if [ "$RUN_MOBILE" = true ]; then
    echo -e "${BLUE}📱 Running Mobile Voice Chat Tests...${NC}"
    
    mobile_projects=("voice-mobile-iPhone" "voice-mobile-Android")
    mobile_failed=()
    
    for project in "${mobile_projects[@]}"; do
        echo -e "${YELLOW}Testing on $project...${NC}"
        if ! npx playwright test "e2e/voice-chat/voice-mobile.spec.ts" --project="$project" --reporter=line; then
            mobile_failed+=("$project")
        fi
    done
    
    if [ ${#mobile_failed[@]} -eq 0 ]; then
        test_results+=("✅ Mobile Testing")
    else
        test_results+=("❌ Mobile Testing (${mobile_failed[*]})")
        failed_tests+=("Mobile Testing")
    fi
fi

# 7. Cross-Browser Testing (optional)
if [ "$RUN_CROSS_BROWSER" = true ]; then
    echo -e "${BLUE}🌐 Running Cross-Browser Voice Tests...${NC}"
    
    if run_cross_browser "e2e/voice-chat/voice-chat-flow.spec.ts" "Voice Flow Cross-Browser"; then
        test_results+=("✅ Cross-Browser Compatibility")
    else
        test_results+=("❌ Cross-Browser Compatibility")
        failed_tests+=("Cross-Browser Compatibility")
    fi
fi

# 8. Performance Testing (optional)
if [ "$RUN_PERFORMANCE" = true ]; then
    echo -e "${BLUE}⚡ Running Voice Performance Tests...${NC}"
    
    if npx playwright test "e2e/voice-chat/voice-chat-flow.spec.ts" --grep="Performance" --project="voice-chat-chrome" --reporter=line; then
        test_results+=("✅ Performance Testing")
    else
        test_results+=("❌ Performance Testing")
        failed_tests+=("Performance Testing")
    fi
fi

# Calculate execution time
end_time=$(date +%s)
execution_time=$((end_time - start_time))

# Generate test report
echo ""
echo "🎤 Voice Chat E2E Test Results"
echo "=============================="
echo -e "${BLUE}Execution Time: ${execution_time}s${NC}"
echo ""

for result in "${test_results[@]}"; do
    echo "$result"
done

echo ""

# Generate HTML report if tests were run
if [ ${#test_results[@]} -gt 0 ]; then
    echo -e "${BLUE}📊 Generating HTML Report...${NC}"
    npx playwright show-report --port=9323 &
    report_pid=$!
    echo "HTML Report available at: http://localhost:9323"
    echo "Report PID: $report_pid (use 'kill $report_pid' to stop)"
fi

# Generate summary
total_tests=${#test_results[@]}
failed_count=${#failed_tests[@]}
passed_count=$((total_tests - failed_count))

echo ""
echo "📈 Summary:"
echo "  Total Test Suites: $total_tests"
echo "  Passed: $passed_count"
echo "  Failed: $failed_count"

if [ $failed_count -eq 0 ]; then
    echo -e "${GREEN}🎉 All voice chat tests passed!${NC}"
    exit 0
else
    echo -e "${RED}💥 $failed_count test suite(s) failed:${NC}"
    for failed in "${failed_tests[@]}"; do
        echo -e "${RED}  - $failed${NC}"
    done
    echo ""
    echo -e "${YELLOW}💡 Tips for debugging:${NC}"
    echo "  - Check browser console for audio device errors"
    echo "  - Verify microphone permissions are granted"
    echo "  - Ensure ElevenLabs API is accessible"
    echo "  - Review test screenshots in e2e/screenshots/"
    echo "  - Check network conditions for API calls"
    exit 1
fi