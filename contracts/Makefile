# Sei Data Logger Makefile
# Optimized for Sei blockchain development

# Default target
.DEFAULT_GOAL := help

# Variables
FOUNDRY_PROFILE ?= default
RPC_URL ?= https://evm-rpc-testnet.sei-apis.com
ETHERSCAN_API_KEY ?= $(SEI_ETHERSCAN_API_KEY)
PRIVATE_KEY ?= $(PRIVATE_KEY)

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
PURPLE := \033[0;35m
CYAN := \033[0;36m
WHITE := \033[0;37m
RESET := \033[0m

# Help target
help: ## Display this help message
	@echo "$(CYAN)Sei Data Logger - Smart Contract Operations$(RESET)"
	@echo ""
	@echo "$(YELLOW)Available targets:$(RESET)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Installation and setup
install: ## Install dependencies
	@echo "$(BLUE)Installing Foundry dependencies...$(RESET)"
	forge install foundry-rs/forge-std --no-commit
	forge install OpenZeppelin/openzeppelin-contracts --no-commit
	forge install transmissions11/solmate --no-commit
	@echo "$(GREEN)Dependencies installed successfully!$(RESET)"

update: ## Update dependencies
	@echo "$(BLUE)Updating dependencies...$(RESET)"
	forge update
	@echo "$(GREEN)Dependencies updated successfully!$(RESET)"

# Building
build: ## Build the contracts
	@echo "$(BLUE)Building contracts...$(RESET)"
	forge build --optimize --optimizer-runs 1000000
	@echo "$(GREEN)Build completed successfully!$(RESET)"

clean: ## Clean build artifacts
	@echo "$(BLUE)Cleaning build artifacts...$(RESET)"
	forge clean
	rm -rf broadcast/ cache/ out/
	@echo "$(GREEN)Clean completed successfully!$(RESET)"

# Testing
test: ## Run all tests
	@echo "$(BLUE)Running all tests...$(RESET)"
	forge test -vv
	@echo "$(GREEN)All tests completed!$(RESET)"

test-verbose: ## Run tests with verbose output
	@echo "$(BLUE)Running tests with verbose output...$(RESET)"
	forge test -vvv

test-gas: ## Run tests with gas reporting
	@echo "$(BLUE)Running tests with gas reporting...$(RESET)"
	forge test --gas-report

test-coverage: ## Run tests with coverage reporting
	@echo "$(BLUE)Running coverage analysis...$(RESET)"
	forge coverage --report lcov
	genhtml lcov.info --output-directory coverage --title "Sei Data Logger Coverage"
	@echo "$(GREEN)Coverage report generated in coverage/index.html$(RESET)"

test-fuzz: ## Run fuzz tests
	@echo "$(BLUE)Running fuzz tests...$(RESET)"
	forge test --fuzz-runs 10000

test-invariant: ## Run invariant tests
	@echo "$(BLUE)Running invariant tests...$(RESET)"
	forge test --invariant-runs 1000

# Deployment
deploy-local: ## Deploy to local network
	@echo "$(BLUE)Deploying to local network...$(RESET)"
	forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
	@echo "$(GREEN)Local deployment completed!$(RESET)"

deploy-testnet: ## Deploy to Sei testnet
	@echo "$(BLUE)Deploying to Sei testnet...$(RESET)"
	@if [ -z "$(PRIVATE_KEY)" ]; then \
		echo "$(RED)Error: PRIVATE_KEY environment variable not set$(RESET)"; \
		exit 1; \
	fi
	forge script script/Deploy.s.sol --rpc-url https://evm-rpc-testnet.sei-apis.com --broadcast --verify --private-key $(PRIVATE_KEY)
	@echo "$(GREEN)Testnet deployment completed!$(RESET)"

deploy-mainnet: ## Deploy to Sei mainnet
	@echo "$(YELLOW)⚠️  Deploying to Sei MAINNET...$(RESET)"
	@echo "$(RED)This will use real SEI tokens. Are you sure? [y/N]$(RESET)"
	@read -r confirm && [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ] || exit 1
	@if [ -z "$(PRIVATE_KEY)" ]; then \
		echo "$(RED)Error: PRIVATE_KEY environment variable not set$(RESET)"; \
		exit 1; \
	fi
	forge script script/Deploy.s.sol --rpc-url https://evm-rpc.sei-apis.com --broadcast --verify --private-key $(PRIVATE_KEY)
	@echo "$(GREEN)Mainnet deployment completed!$(RESET)"

# Verification
verify: ## Verify contracts on explorer
	@echo "$(BLUE)Verifying contracts...$(RESET)"
	@if [ -z "$(CONTRACT_ADDRESS)" ]; then \
		echo "$(RED)Error: CONTRACT_ADDRESS environment variable not set$(RESET)"; \
		exit 1; \
	fi
	forge verify-contract $(CONTRACT_ADDRESS) src/DataLogger.sol:DataLogger --etherscan-api-key $(ETHERSCAN_API_KEY) --rpc-url $(RPC_URL)
	@echo "$(GREEN)Contract verification completed!$(RESET)"

# Code quality
lint: ## Run linter
	@echo "$(BLUE)Running linter...$(RESET)"
	forge fmt --check
	@echo "$(GREEN)Linting completed!$(RESET)"

format: ## Format code
	@echo "$(BLUE)Formatting code...$(RESET)"
	forge fmt
	@echo "$(GREEN)Code formatting completed!$(RESET)"

# Documentation
docs: ## Generate documentation
	@echo "$(BLUE)Generating documentation...$(RESET)"
	forge doc --build
	@echo "$(GREEN)Documentation generated in docs/$(RESET)"

docs-serve: ## Serve documentation locally
	@echo "$(BLUE)Starting documentation server...$(RESET)"
	forge doc --serve --port 4000
	@echo "$(GREEN)Documentation available at http://localhost:4000$(RESET)"

# Analysis
analyze: ## Run static analysis
	@echo "$(BLUE)Running static analysis...$(RESET)"
	@command -v slither >/dev/null 2>&1 || { echo "$(RED)Slither not installed. Install with: pip install slither-analyzer$(RESET)"; exit 1; }
	slither src/
	@echo "$(GREEN)Static analysis completed!$(RESET)"

size: ## Show contract sizes
	@echo "$(BLUE)Analyzing contract sizes...$(RESET)"
	forge build --sizes
	@echo "$(GREEN)Contract size analysis completed!$(RESET)"

# Sei-specific operations
sei-faucet: ## Request testnet tokens from faucet
	@echo "$(BLUE)Requesting SEI testnet tokens...$(RESET)"
	@if [ -z "$(WALLET_ADDRESS)" ]; then \
		echo "$(RED)Error: WALLET_ADDRESS environment variable not set$(RESET)"; \
		exit 1; \
	fi
	curl -X POST "https://faucet.sei-apis.com/token" \
		-H "Content-Type: application/json" \
		-d '{"address":"$(WALLET_ADDRESS)"}'
	@echo "$(GREEN)Faucet request completed!$(RESET)"

sei-balance: ## Check SEI balance
	@echo "$(BLUE)Checking SEI balance...$(RESET)"
	@if [ -z "$(WALLET_ADDRESS)" ]; then \
		echo "$(RED)Error: WALLET_ADDRESS environment variable not set$(RESET)"; \
		exit 1; \
	fi
	cast balance $(WALLET_ADDRESS) --rpc-url $(RPC_URL)

# Performance testing
benchmark: ## Run performance benchmarks
	@echo "$(BLUE)Running performance benchmarks...$(RESET)"
	forge test --gas-report --json > gas-report.json
	@echo "$(GREEN)Benchmark completed! Report saved to gas-report.json$(RESET)"

profile: ## Profile gas usage
	@echo "$(BLUE)Profiling gas usage...$(RESET)"
	forge test --gas-report --json | jq '.tests[] | select(.gasUsed > 100000) | {name: .name, gas: .gasUsed}'
	@echo "$(GREEN)Gas profiling completed!$(RESET)"

# Development workflow
dev: ## Complete development workflow (clean, build, test)
	@echo "$(CYAN)Starting development workflow...$(RESET)"
	@$(MAKE) clean
	@$(MAKE) build
	@$(MAKE) test
	@$(MAKE) lint
	@echo "$(GREEN)Development workflow completed successfully!$(RESET)"

ci: ## CI pipeline (build, test, coverage)
	@echo "$(CYAN)Running CI pipeline...$(RESET)"
	@$(MAKE) build
	@$(MAKE) test-gas
	@$(MAKE) test-coverage
	@$(MAKE) lint
	@echo "$(GREEN)CI pipeline completed successfully!$(RESET)"

# Utility targets
env-check: ## Check environment variables
	@echo "$(BLUE)Checking environment variables...$(RESET)"
	@echo "PRIVATE_KEY: $(if $(PRIVATE_KEY),$(GREEN)✓ Set$(RESET),$(RED)✗ Not set$(RESET))"
	@echo "RPC_URL: $(CYAN)$(RPC_URL)$(RESET)"
	@echo "ETHERSCAN_API_KEY: $(if $(ETHERSCAN_API_KEY),$(GREEN)✓ Set$(RESET),$(RED)✗ Not set$(RESET))"

setup-env: ## Setup environment template
	@echo "$(BLUE)Creating .env template...$(RESET)"
	@echo "# Sei Data Logger Environment Variables" > .env.template
	@echo "PRIVATE_KEY=your_private_key_here" >> .env.template
	@echo "SEI_ETHERSCAN_API_KEY=your_etherscan_api_key_here" >> .env.template
	@echo "WALLET_ADDRESS=your_wallet_address_here" >> .env.template
	@echo "$(GREEN).env.template created! Copy to .env and fill in your values$(RESET)"

# Phony targets
.PHONY: help install update build clean test test-verbose test-gas test-coverage test-fuzz test-invariant deploy-local deploy-testnet deploy-mainnet verify lint format docs docs-serve analyze size sei-faucet sei-balance benchmark profile dev ci env-check setup-env