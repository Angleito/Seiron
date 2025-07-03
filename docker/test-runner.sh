#!/bin/bash

# Enhanced Property-Based Test Runner for Sei Agent Kit
# Comprehensive test execution with functional programming validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_RESULTS_DIR="/app/test-artifacts"
COVERAGE_DIR="$TEST_RESULTS_DIR/coverage"
REPORTS_DIR="$TEST_RESULTS_DIR/reports"
PROPERTY_TESTS_DIR="$TEST_RESULTS_DIR/property-tests"

# Create directories
mkdir -p "$TEST_RESULTS_DIR" "$COVERAGE_DIR" "$REPORTS_DIR" "$PROPERTY_TESTS_DIR"

echo -e "${BLUE}🚀 Starting Comprehensive Property-Based Testing Suite${NC}"
echo -e "${BLUE}=================================================${NC}"

# Function to run tests with error handling
run_test_suite() {
    local test_name="$1"
    local test_command="$2"
    local output_file="$3"
    
    echo -e "\n${YELLOW}📋 Running $test_name...${NC}"
    
    if eval "$test_command" 2>&1 | tee "$output_file"; then
        echo -e "${GREEN}✅ $test_name completed successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        return 1
    fi
}

# Function to generate test summary
generate_summary() {
    local summary_file="$REPORTS_DIR/test-summary.md"
    
    cat > "$summary_file" << EOF
# Comprehensive Property-Based Testing Summary

## Test Execution Report
Generated: $(date)
Environment: Docker Test Container

## Test Suites Executed

### 1. Symphony Protocol Wrapper Tests
- **Focus**: Swap conservation, price impact, slippage properties
- **Properties Tested**: Value conservation, monotonicity, slippage protection
- **Mathematical Validation**: AMM formulas, price impact calculations

### 2. Takara Protocol Wrapper Tests  
- **Focus**: Health factor, interest accrual, liquidation properties
- **Properties Tested**: Health factor consistency, compound interest, liquidation thresholds
- **Mathematical Validation**: Lending mathematics, risk calculations

### 3. Silo Protocol Wrapper Tests
- **Focus**: Staking rewards, penalty calculations, timing properties  
- **Properties Tested**: Reward accumulation, penalty application, vesting schedules
- **Mathematical Validation**: Staking mathematics, time-based calculations

### 4. Functional Programming Properties
- **Focus**: fp-ts Either/TaskEither monadic operations
- **Properties Tested**: Functor laws, monad laws, error handling
- **Mathematical Validation**: Category theory properties

## Coverage Targets
- **Protocol Wrappers**: >95% line coverage
- **Core Utilities**: >90% line coverage  
- **Property Generators**: >85% line coverage

## Performance Benchmarks
- **Property Test Execution**: <100ms per test average
- **Memory Usage**: <4GB peak usage
- **Test Suite Duration**: <30 minutes total

EOF
    
    echo -e "${GREEN}📊 Test summary generated: $summary_file${NC}"
}

# Main test execution
main() {
    local exit_code=0
    
    echo -e "${BLUE}🔧 Environment Setup${NC}"
    echo "Node.js version: $(node --version)"
    echo "NPM version: $(npm --version)"
    echo "Fast-check configuration:"
    echo "  - NUM_RUNS: ${FAST_CHECK_NUM_RUNS:-1000}"
    echo "  - TIMEOUT: ${FAST_CHECK_TIMEOUT:-5000}ms"
    echo "  - MAX_SHRINKS: ${FAST_CHECK_MAX_SHRINKS:-1000}"
    
    # Run property-based tests for protocol wrappers
    echo -e "\n${BLUE}🧪 Protocol Wrapper Property Tests${NC}"
    
    # Symphony Protocol Tests
    if ! run_test_suite \
        "Symphony Protocol Property Tests" \
        "npm test -- --config=jest.property.config.js --testPathPattern='SymphonyProtocolWrapper.*property'" \
        "$PROPERTY_TESTS_DIR/symphony-tests.log"; then
        exit_code=1
    fi
    
    # Takara Protocol Tests
    if ! run_test_suite \
        "Takara Protocol Property Tests" \
        "npm test -- --config=jest.property.config.js --testPathPattern='TakaraProtocolWrapper.*property'" \
        "$PROPERTY_TESTS_DIR/takara-tests.log"; then
        exit_code=1
    fi
    
    # Silo Protocol Tests
    if ! run_test_suite \
        "Silo Protocol Property Tests" \
        "npm test -- --config=jest.property.config.js --testPathPattern='SiloProtocolWrapper.*property'" \
        "$PROPERTY_TESTS_DIR/silo-tests.log"; then
        exit_code=1
    fi
    
    # Functional Programming Tests
    echo -e "\n${BLUE}🔄 Functional Programming Property Tests${NC}"
    
    if ! run_test_suite \
        "fp-ts Monadic Properties" \
        "npm test -- --config=jest.property.config.js --testPathPattern='functional.*property'" \
        "$PROPERTY_TESTS_DIR/functional-tests.log"; then
        exit_code=1
    fi
    
    # Property Generator Tests
    if ! run_test_suite \
        "Property Generator Validation" \
        "npm test -- --config=jest.property.config.js --testPathPattern='property-generators'" \
        "$PROPERTY_TESTS_DIR/generator-tests.log"; then
        exit_code=1
    fi
    
    # Coverage Analysis
    echo -e "\n${BLUE}📊 Coverage Analysis${NC}"
    
    if ! run_test_suite \
        "Coverage Report Generation" \
        "npm run test:coverage -- --config=jest.property.config.js" \
        "$COVERAGE_DIR/coverage.log"; then
        echo -e "${YELLOW}⚠️  Coverage analysis completed with warnings${NC}"
    fi
    
    # Performance Benchmarks
    echo -e "\n${BLUE}⚡ Performance Benchmarks${NC}"
    
    if ! run_test_suite \
        "Performance Property Tests" \
        "npm test -- --config=jest.property.config.js --testPathPattern='performance.*property'" \
        "$PROPERTY_TESTS_DIR/performance-tests.log"; then
        echo -e "${YELLOW}⚠️  Performance tests completed with warnings${NC}"
    fi
    
    # Generate comprehensive summary
    generate_summary
    
    # Test Results Summary
    echo -e "\n${BLUE}📋 Test Results Summary${NC}"
    echo -e "${BLUE}========================${NC}"
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}🎉 All property-based tests passed successfully!${NC}"
        echo -e "${GREEN}✅ Mathematical properties validated${NC}"
        echo -e "${GREEN}✅ Functional programming patterns verified${NC}"
        echo -e "${GREEN}✅ DeFi protocol logic confirmed${NC}"
    else
        echo -e "${RED}❌ Some tests failed. Check logs for details.${NC}"
        echo -e "${YELLOW}📁 Test artifacts saved in: $TEST_RESULTS_DIR${NC}"
    fi
    
    # Artifact locations
    echo -e "\n${BLUE}📁 Test Artifacts${NC}"
    echo "Coverage Reports: $COVERAGE_DIR"
    echo "Test Reports: $REPORTS_DIR" 
    echo "Property Test Logs: $PROPERTY_TESTS_DIR"
    echo "Summary Report: $REPORTS_DIR/test-summary.md"
    
    # Performance Summary
    echo -e "\n${BLUE}⚡ Performance Summary${NC}"
    echo "Total Memory Usage: $(cat /proc/meminfo | grep MemAvailable)"
    echo "Test Execution Time: $(date)"
    
    return $exit_code
}

# Execute main function
if main; then
    echo -e "\n${GREEN}🏁 Property-based testing completed successfully!${NC}"
    exit 0
else
    echo -e "\n${RED}🚨 Property-based testing completed with failures!${NC}"
    exit 1
fi
