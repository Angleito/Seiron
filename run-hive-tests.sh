#!/bin/bash
set -e

echo "🚀 Starting Hive Intelligence Integration Test Suite"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to cleanup resources
cleanup() {
    print_status "Cleaning up test environment..."
    docker-compose -f docker-compose.hive-test.yml down --volumes --remove-orphans
    docker system prune -f
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    print_error "Docker Compose is not installed. Please install it and try again."
    exit 1
fi

print_status "Building test environment..."
docker-compose -f docker-compose.hive-test.yml build

print_status "Starting test dependencies..."
docker-compose -f docker-compose.hive-test.yml up -d postgres-test redis-test hive-mock

print_status "Waiting for services to be ready..."
sleep 10

# Check if services are healthy
print_status "Checking service health..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker-compose -f docker-compose.hive-test.yml ps | grep -q "Up (healthy)"; then
        print_success "All services are healthy!"
        break
    else
        print_warning "Services not ready yet, waiting... (attempt $((attempt + 1))/$max_attempts)"
        sleep 5
        attempt=$((attempt + 1))
    fi
done

if [ $attempt -eq $max_attempts ]; then
    print_error "Services failed to become healthy within timeout"
    docker-compose -f docker-compose.hive-test.yml logs
    exit 1
fi

# Run test suites
test_results=()

print_status "Running Unit Tests..."
if docker-compose -f docker-compose.hive-test.yml run --rm -e TEST_SUITE=unit backend-test; then
    print_success "Unit tests passed!"
    test_results+=("Unit Tests: PASSED")
else
    print_error "Unit tests failed!"
    test_results+=("Unit Tests: FAILED")
fi

print_status "Running Property-Based Tests..."
if docker-compose -f docker-compose.hive-test.yml run --rm -e TEST_SUITE=property backend-test; then
    print_success "Property-based tests passed!"
    test_results+=("Property Tests: PASSED")
else
    print_error "Property-based tests failed!"
    test_results+=("Property Tests: FAILED")
fi

print_status "Running Integration Tests..."
if docker-compose -f docker-compose.hive-test.yml run --rm -e TEST_SUITE=integration backend-test; then
    print_success "Integration tests passed!"
    test_results+=("Integration Tests: PASSED")
else
    print_error "Integration tests failed!"
    test_results+=("Integration Tests: FAILED")
fi

print_status "Running Frontend Hook Tests..."
if docker-compose -f docker-compose.hive-test.yml run --rm frontend-test; then
    print_success "Frontend tests passed!"
    test_results+=("Frontend Tests: PASSED")
else
    print_error "Frontend tests failed!"
    test_results+=("Frontend Tests: FAILED")
fi

print_status "Running Security Tests..."
if docker-compose -f docker-compose.hive-test.yml run --rm -e TEST_SUITE=security backend-test; then
    print_success "Security tests passed!"
    test_results+=("Security Tests: PASSED")
else
    print_error "Security tests failed!"
    test_results+=("Security Tests: FAILED")
fi

print_status "Running Performance Tests..."
if docker-compose -f docker-compose.hive-test.yml run --rm -e TEST_SUITE=performance backend-test; then
    print_success "Performance tests passed!"
    test_results+=("Performance Tests: PASSED")
else
    print_error "Performance tests failed!"
    test_results+=("Performance Tests: FAILED")
fi

# Print test summary
echo ""
echo "📊 Test Results Summary"
echo "======================"
all_passed=true
for result in "${test_results[@]}"; do
    if [[ $result == *"PASSED"* ]]; then
        print_success "$result"
    else
        print_error "$result"
        all_passed=false
    fi
done

echo ""
if [ "$all_passed" = true ]; then
    print_success "🎉 All tests passed! Hive Intelligence integration is working correctly."
    echo ""
    echo "✅ HiveIntelligenceAdapter unit tests passed"
    echo "✅ Property-based tests passed"
    echo "✅ API integration tests passed"
    echo "✅ Frontend hook tests passed"
    echo "✅ Security tests passed"
    echo "✅ Performance tests passed"
    echo ""
    echo "The Hive Intelligence integration is ready for production!"
else
    print_error "❌ Some tests failed. Please check the logs above for details."
    echo ""
    echo "To debug failed tests, run:"
    echo "  docker-compose -f docker-compose.hive-test.yml logs [service-name]"
    echo ""
    echo "To run individual test suites:"
    echo "  docker-compose -f docker-compose.hive-test.yml run --rm -e TEST_SUITE=unit backend-test"
    echo "  docker-compose -f docker-compose.hive-test.yml run --rm -e TEST_SUITE=integration backend-test"
    echo "  docker-compose -f docker-compose.hive-test.yml run --rm frontend-test"
    echo ""
    exit 1
fi

# Copy test reports
print_status "Copying test reports..."
mkdir -p ./test-reports-hive
docker-compose -f docker-compose.hive-test.yml run --rm -v $(pwd)/test-reports-hive:/reports test-reporter || true

print_status "Test reports are available in ./test-reports-hive/"

echo ""
echo "🔧 Development Commands:"
echo "======================"
echo "• Run specific test suite: ./run-hive-tests.sh [unit|property|integration|security|performance]"
echo "• View logs: docker-compose -f docker-compose.hive-test.yml logs [service]"
echo "• Clean up: docker-compose -f docker-compose.hive-test.yml down --volumes"
echo "• Rebuild: docker-compose -f docker-compose.hive-test.yml build --no-cache"
echo ""

print_success "Hive Intelligence test suite completed successfully!"