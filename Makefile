# Sane defaults
SHELL := /bin/bash
.ONESHELL:
.SHELLFLAGS := -eu -o pipefail -c
.DELETE_ON_ERROR:
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules

# ---------------------- COMMANDS ---------------------------
dev: # Start development server with hot reload
	@echo "Starting development server.."
	@mkdir -p logs
	bun run dev 2>&1 | tee logs/dev.log

format: # Format code with Biome
	@echo "Formatting code.."
	bun run format

lint: # Check code with Biome (formatting, linting, imports)
	@echo "Checking code.."
	bun run lint

check: # Check formatting and linting with Biome
	@echo "Checking formatting and linting.."
	bun run check

test-unit: # Run unit tests only
	@echo "Running unit tests.."
	bun run test:unit

test-coverage: # Run unit tests with coverage
	@echo "Running unit tests with coverage.."
	bun run test:coverage

test-integration: # Run integration tests with Playwright (use FILE=filename.spec.js to run specific file)
	@echo "Running integration tests.."
ifdef FILE
	@echo "Running specific test file: $(FILE)"
	bun run playwright test tests/integration/$(FILE)
else
	bun run test:integration
endif

test-integration-expensive: # Run expensive integration tests that use real APIs (tagged with @expensive)
	@echo "Running expensive integration tests with real API calls.."
	@echo "⚠️  These tests may cost money and require OPENROUTER_API_KEY"
	bun run playwright test --grep "@expensive"

test-all: # Run both unit and integration tests
	@echo "Running all tests.."
	bun run test:all

tail-logs: # Show last 20 lines of development server logs
	@echo "Last 20 lines of development server logs:"
	@tail -n 20 logs/dev.log 2>/dev/null || echo "No log file found. Run 'make dev' first."

install: # Install dependencies
	@echo "Installing dependencies.."
	bun install

# -----------------------------------------------------------
# CAUTION: If you have a file with the same name as make
# command, you need to add it to .PHONY below, otherwise it
# won't work. E.g. `make run` wouldn't work if you have
# `run` file in pwd.
.PHONY: help dev format lint check test-unit test-coverage test-integration test-integration-expensive test-all tail-logs install

# -----------------------------------------------------------
# -----       (Makefile helpers and decoration)      --------
# -----------------------------------------------------------

.DEFAULT_GOAL := help
# check https://stackoverflow.com/questions/4842424/list-of-ansi-color-escape-sequences
NC = \033[0m
ERR = \033[31;1m
TAB := '%-20s' # Increase if you have long commands

# tput colors
red := $(shell tput setaf 1)
green := $(shell tput setaf 2)
yellow := $(shell tput setaf 3)
blue := $(shell tput setaf 4)
cyan := $(shell tput setaf 6)
cyan80 := $(shell tput setaf 86)
grey500 := $(shell tput setaf 244)
grey300 := $(shell tput setaf 240)
bold := $(shell tput bold)
underline := $(shell tput smul)
reset := $(shell tput sgr0)

help:
	@printf '\n'
	@printf '    $(underline)Available make commands:$(reset)\n\n'
	@# Print commands with comments
	@grep -E '^([a-zA-Z0-9_-]+\.?)+:.+#.+$$' $(MAKEFILE_LIST) \
		| grep -v '^env-' \
		| grep -v '^arg-' \
		| sed 's/:.*#/: #/g' \
		| awk 'BEGIN {FS = "[: ]+#[ ]+"}; \
		{printf "    make $(bold)$(TAB)$(reset) # %s\n", \
			$$1, $$2}'
	@grep -E '^([a-zA-Z0-9_-]+\.?)+:( +\w+-\w+)*$$' $(MAKEFILE_LIST) \
		| grep -v help \
		| awk 'BEGIN {FS = ":"}; \
		{printf "    make $(bold)$(TAB)$(reset)\n", \
			$$1}' || true
	@echo -e ""