# Test Runner Container for Comprehensive E2E Testing
FROM mcr.microsoft.com/playwright:v1.40.0-focal

# Install additional dependencies
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    postgresql-client \
    redis-tools \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 (Playwright image comes with Node 18)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Create app user for security
RUN groupadd -r testrunner && useradd -r -g testrunner testrunner

# Set working directory
WORKDIR /app

# Copy package.json for test runner
COPY package.json .

# Create package.json for test runner if it doesn't exist
RUN cat > package.json << 'EOF'
{
  "name": "seiron-test-runner",
  "version": "1.0.0",
  "description": "Comprehensive test orchestration for Seiron voice chat E2E testing",
  "scripts": {
    "test": "node src/test-orchestrator.js",
    "test:e2e": "playwright test --config=playwright.config.js",
    "test:integration": "jest --config=jest.integration.config.js",
    "test:performance": "node src/performance-test-runner.js",
    "test:voice": "node src/voice-test-runner.js",
    "health-check": "node src/health-check.js",
    "cleanup": "node src/cleanup.js"
  },
  "dependencies": {
    "@playwright/test": "^1.40.0",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "ws": "^8.14.2",
    "redis": "^4.6.10",
    "pg": "^8.11.3",
    "axios": "^1.6.0",
    "form-data": "^4.0.0",
    "puppeteer": "^21.5.0",
    "artillery": "^2.0.0",
    "lighthouse": "^11.4.0",
    "web-vitals": "^3.5.0"
  }
}
EOF

# Install dependencies
RUN npm install --production=false

# Create test directories
RUN mkdir -p \
    src \
    config \
    fixtures \
    reports \
    artifacts \
    screenshots \
    videos \
    logs

# Copy test orchestration source code
COPY src/ ./src/
COPY config/ ./config/
COPY fixtures/ ./fixtures/

# Create main test orchestrator
RUN cat > src/test-orchestrator.js << 'EOF'
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class TestOrchestrator {
    constructor() {
        this.testSuite = process.env.TEST_SUITE || 'full';
        this.parallelJobs = parseInt(process.env.PARALLEL_JOBS) || 4;
        this.testTimeout = parseInt(process.env.TEST_TIMEOUT) || 300000;
        this.resultsDir = '/app/reports';
        this.artifactsDir = '/app/artifacts';
    }

    async runHealthChecks() {
        console.log('🔍 Running health checks...');
        
        const services = [
            { name: 'Backend', url: process.env.BACKEND_URL },
            { name: 'Frontend', url: process.env.FRONTEND_URL },
            { name: 'ElevenLabs Mock', url: process.env.ELEVENLABS_MOCK_URL },
            { name: 'Audio Simulator', url: process.env.AUDIO_SIMULATOR_URL }
        ];

        for (const service of services) {
            try {
                const axios = require('axios');
                await axios.get(`${service.url}/health`, { timeout: 5000 });
                console.log(`✅ ${service.name} is healthy`);
            } catch (error) {
                console.error(`❌ ${service.name} health check failed:`, error.message);
                process.exit(1);
            }
        }
    }

    async runTestSuite() {
        console.log(`🚀 Starting test suite: ${this.testSuite}`);
        
        switch (this.testSuite) {
            case 'voice':
                await this.runVoiceTests();
                break;
            case 'e2e':
                await this.runE2ETests();
                break;
            case 'performance':
                await this.runPerformanceTests();
                break;
            case 'integration':
                await this.runIntegrationTests();
                break;
            case 'full':
            default:
                await this.runFullTestSuite();
                break;
        }
    }

    async runVoiceTests() {
        console.log('🎤 Running voice-specific tests...');
        return this.executePlaywrightTests('voice-*.spec.js');
    }

    async runE2ETests() {
        console.log('🌐 Running E2E tests...');
        return this.executePlaywrightTests('e2e-*.spec.js');
    }

    async runPerformanceTests() {
        console.log('⚡ Running performance tests...');
        return this.executeCommand('npm', ['run', 'test:performance']);
    }

    async runIntegrationTests() {
        console.log('🔗 Running integration tests...');
        return this.executeCommand('npm', ['run', 'test:integration']);
    }

    async runFullTestSuite() {
        console.log('🎯 Running full test suite...');
        await this.runIntegrationTests();
        await this.runVoiceTests();
        await this.runE2ETests();
        await this.runPerformanceTests();
    }

    async executePlaywrightTests(pattern) {
        return this.executeCommand('npx', [
            'playwright', 
            'test',
            '--grep',
            pattern,
            '--workers',
            this.parallelJobs.toString(),
            '--timeout',
            this.testTimeout.toString(),
            '--reporter=html,json',
            `--output-dir=${this.artifactsDir}`
        ]);
    }

    async executeCommand(command, args) {
        return new Promise((resolve, reject) => {
            const proc = spawn(command, args, {
                stdio: 'inherit',
                env: { ...process.env }
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Command failed with exit code ${code}`));
                }
            });

            proc.on('error', reject);
        });
    }

    async generateReport() {
        console.log('📊 Generating test report...');
        // Report generation logic would go here
        const report = {
            timestamp: new Date().toISOString(),
            testSuite: this.testSuite,
            results: 'Test execution completed'
        };
        
        await fs.writeFile(
            path.join(this.resultsDir, 'test-report.json'),
            JSON.stringify(report, null, 2)
        );
    }
}

async function main() {
    const orchestrator = new TestOrchestrator();
    
    try {
        await orchestrator.runHealthChecks();
        await orchestrator.runTestSuite();
        await orchestrator.generateReport();
        console.log('✅ All tests completed successfully!');
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = TestOrchestrator;
EOF

# Create Playwright configuration
RUN cat > playwright.config.js << 'EOF'
module.exports = {
    testDir: './e2e',
    timeout: 30000,
    expect: {
        timeout: 5000
    },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: [
        ['html', { outputFolder: 'artifacts/playwright-report' }],
        ['json', { outputFile: 'reports/test-results.json' }]
    ],
    use: {
        baseURL: process.env.FRONTEND_URL || 'http://frontend-test:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: process.env.ENABLE_VIDEO_RECORDING === 'true' ? 'retain-on-failure' : 'off'
    },
    projects: [
        {
            name: 'chromium',
            use: { ...require('@playwright/test').devices['Desktop Chrome'] }
        },
        {
            name: 'webkit',
            use: { ...require('@playwright/test').devices['Desktop Safari'] }
        }
    ],
    webServer: {
        command: 'echo "Services managed by docker-compose"',
        port: 3000,
        reuseExistingServer: true
    }
};
EOF

# Create performance test runner
RUN cat > src/performance-test-runner.js << 'EOF'
const { spawn } = require('child_process');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

class PerformanceTestRunner {
    constructor() {
        this.frontendUrl = process.env.FRONTEND_URL || 'http://frontend-test:3000';
        this.loadTestUsers = parseInt(process.env.LOAD_TEST_USERS) || 50;
        this.loadTestDuration = process.env.LOAD_TEST_DURATION || '60s';
    }

    async runLoadTests() {
        console.log('⚡ Running load tests with Artillery...');
        
        const artilleryConfig = {
            config: {
                target: this.frontendUrl,
                phases: [
                    { duration: this.loadTestDuration, arrivalRate: this.loadTestUsers }
                ]
            },
            scenarios: [
                {
                    name: 'Voice chat flow',
                    weight: 100,
                    flow: [
                        { get: { url: '/' } },
                        { get: { url: '/chat' } },
                        { post: { url: '/api/voice/synthesize', json: { text: 'Hello test' } } }
                    ]
                }
            ]
        };

        return new Promise((resolve, reject) => {
            const proc = spawn('npx', ['artillery', 'run', '-'], {
                stdio: ['pipe', 'inherit', 'inherit']
            });

            proc.stdin.write(JSON.stringify(artilleryConfig));
            proc.stdin.end();

            proc.on('close', (code) => {
                code === 0 ? resolve() : reject(new Error(`Load test failed: ${code}`));
            });
        });
    }

    async runLighthouseAudit() {
        console.log('🏮 Running Lighthouse performance audit...');
        
        const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
        const options = { logLevel: 'info', output: 'json', onlyCategories: ['performance'] };
        
        try {
            const runnerResult = await lighthouse(this.frontendUrl, options);
            const reportJson = runnerResult.report;
            
            console.log('Lighthouse audit completed');
            return JSON.parse(reportJson);
        } finally {
            await chrome.kill();
        }
    }
}

module.exports = PerformanceTestRunner;

if (require.main === module) {
    const runner = new PerformanceTestRunner();
    runner.runLoadTests()
        .then(() => runner.runLighthouseAudit())
        .then(() => console.log('✅ Performance tests completed'))
        .catch(error => {
            console.error('❌ Performance tests failed:', error);
            process.exit(1);
        });
}
EOF

# Create health check script
RUN cat > src/health-check.js << 'EOF'
const axios = require('axios');

async function healthCheck() {
    const services = [
        { name: 'Backend', url: process.env.BACKEND_URL + '/health' },
        { name: 'Frontend', url: process.env.FRONTEND_URL },
        { name: 'ElevenLabs Mock', url: process.env.ELEVENLABS_MOCK_URL + '/health' },
        { name: 'Audio Simulator', url: process.env.AUDIO_SIMULATOR_URL + '/health' }
    ];

    let allHealthy = true;

    for (const service of services) {
        try {
            const response = await axios.get(service.url, { timeout: 5000 });
            console.log(`✅ ${service.name}: OK (${response.status})`);
        } catch (error) {
            console.error(`❌ ${service.name}: FAILED - ${error.message}`);
            allHealthy = false;
        }
    }

    process.exit(allHealthy ? 0 : 1);
}

healthCheck();
EOF

# Set permissions
RUN chown -R testrunner:testrunner /app
USER testrunner

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node src/health-check.js

# Default command
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "test"]