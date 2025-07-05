# Cypress E2E Tests

This directory contains end-to-end tests for the Seiron AI Portfolio Manager using Cypress.

## Test Structure

```
cypress/
├── e2e/                    # E2E test specs
│   ├── voice-flow.cy.ts    # Voice interaction and wallet connection flows
│   ├── voice-input.cy.ts   # Voice input and AI response tests
│   └── action-execution.cy.ts # Transaction execution tests
├── fixtures/               # Test data
│   ├── portfolio.json      # Mock portfolio data
│   └── voice-commands.json # Voice command templates
├── support/                # Support files and custom commands
│   ├── commands.ts         # Custom Cypress commands
│   ├── e2e.ts             # E2E support configuration
│   └── types.ts           # TypeScript type definitions
├── screenshots/           # Test failure screenshots (auto-generated)
└── videos/               # Test execution videos (auto-generated)
```

## Running Tests

### Local Development

```bash
# Install dependencies
npm install

# Open Cypress Test Runner (interactive mode)
npm run e2e:open

# Run tests in headless mode
npm run e2e:local
```

### Docker Environment

```bash
# Start all services and run tests
npm run e2e:test

# Start services in background
npm run e2e:up

# Run tests only (services must be running)
npm run e2e:run

# Stop services
npm run e2e:down

# View logs
npm run e2e:logs

# Clean up everything
npm run e2e:clean
```

## Test Coverage

### 1. Voice Flow Tests (`voice-flow.cy.ts`)
- Wallet connection and disconnection
- Price display switching to balance display
- Voice command processing
- Audio response generation
- Transaction preview and confirmation
- Error handling and recovery

### 2. Voice Input Tests (`voice-input.cy.ts`)
- "Show my portfolio" command with AI response
- Real-time voice visualization
- Audio streaming and playback controls
- Multi-language support
- Continuous conversation mode
- Permission handling

### 3. Action Execution Tests (`action-execution.cy.ts`)
- Supply action with `sak-execute` backend integration
- Withdraw from lending protocols
- Token swaps via DragonSwap
- Multi-step transactions (approval + action)
- Transaction status tracking
- Gas optimization

## Custom Commands

### Wallet Commands
- `cy.connectWallet(address?)` - Connect wallet with optional address
- `cy.disconnectWallet()` - Disconnect current wallet

### Voice Commands
- `cy.speakCommand(command)` - Simulate voice input
- `cy.waitForAnimation(duration?)` - Wait for animations

### Transaction Commands
- `cy.confirmTransaction(details?)` - Confirm transaction with optional validation

### API Mocking Commands
- `cy.mockElevenLabsAPI()` - Mock ElevenLabs TTS API
- `cy.mockOpenAIAPI(response?)` - Mock OpenAI chat API
- `cy.mockBackendAPI()` - Mock backend portfolio/execute APIs

## Environment Variables

Set these in your `.env` file or CI environment:

```bash
# API Keys (use test keys for E2E)
OPENAI_API_KEY=test-key
ELEVENLABS_API_KEY=test-key

# Wallet Configuration
E2E_TEST_WALLET=0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9
E2E_TEST_PRIVATE_KEY=test-private-key

# Test Configuration
E2E_CONCURRENT_USERS=10
E2E_LOAD_DURATION=300000
```

## Mocking Strategy

### MSW Server
The MSW (Mock Service Worker) server provides:
- ElevenLabs TTS API mocks (audio generation)
- OpenAI Chat API mocks (AI responses)
- Blockchain RPC mocks (wallet operations)

### Backend Mocks
- Portfolio data endpoints
- Transaction execution (`sak-execute`)
- Gas price estimation
- Transaction status polling

## CI/CD Integration

The E2E tests are designed to run in CI pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run E2E Tests
  run: |
    npm run e2e:up
    npm run e2e:run
    npm run e2e:down
  env:
    CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
```

## Debugging

### Screenshots and Videos
- Screenshots are automatically captured on test failures
- Videos record the entire test execution
- Find them in `test-results/e2e/cypress/`

### Interactive Debugging
```bash
# Open Cypress with browser DevTools
npm run e2e:open

# Enable debug logs
DEBUG=cypress:* npm run e2e:local
```

### Docker Logs
```bash
# View all service logs
npm run e2e:logs

# View specific service
docker logs e2e-frontend
docker logs e2e-backend
docker logs e2e-cypress
```

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Data Fixtures**: Use consistent test data from fixtures
3. **Explicit Waits**: Use `cy.wait()` for API calls, not arbitrary delays
4. **Error Scenarios**: Test both success and failure paths
5. **Accessibility**: Include keyboard navigation tests
6. **Performance**: Monitor test execution time

## Troubleshooting

### Common Issues

1. **Services not starting**: Check Docker daemon is running
2. **Port conflicts**: Ensure ports 3000, 3001, 8080, 8545 are free
3. **Flaky tests**: Increase timeouts or add explicit waits
4. **Memory issues**: Increase Docker memory allocation

### Reset Environment
```bash
# Complete cleanup and restart
npm run e2e:clean
docker system prune -f
npm run e2e:test
```