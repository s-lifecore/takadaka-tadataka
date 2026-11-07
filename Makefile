# Docker Compose development commands
VITE_MODE ?= prev
FUNCTIONS_REGION ?= asia-northeast1
FRONTEND_ENV_FILE = .env.$(VITE_MODE).local
PROJECT_ID = $(if $(wildcard $(FRONTEND_ENV_FILE)),$(shell awk -F= '/^FIREBASE_PROJECT_ID=/{print $$2; exit}' "$(FRONTEND_ENV_FILE)"),)
FUNCTIONS_ENV_FILE = functions/.env.$(VITE_MODE).local
COMPOSE = ENV_FILE=$(FRONTEND_ENV_FILE) FUNCTIONS_ENV_FILE=$(FUNCTIONS_ENV_FILE) VITE_MODE=$(VITE_MODE) docker compose --env-file $(FRONTEND_ENV_FILE)

.PHONY: install functions-build functions-watch emulators up down check

install:
	npm ci
	npm ci --prefix functions

functions-build:
	npm run build --prefix functions

functions-watch:
	npm run build --prefix functions -- --watch

emulators:
	@test -f "$(FRONTEND_ENV_FILE)" || (echo "Missing $(FRONTEND_ENV_FILE)" && exit 1)
	@test -n "$(PROJECT_ID)" || (echo "FIREBASE_PROJECT_ID is missing in $(FRONTEND_ENV_FILE)" && exit 1)
	@test -f "$(FUNCTIONS_ENV_FILE)" || (echo "Missing $(FUNCTIONS_ENV_FILE)" && exit 1)
	@$(COMPOSE) up --build firebase-emulator

up:
	@test -f "$(FRONTEND_ENV_FILE)" || (echo "Missing $(FRONTEND_ENV_FILE)" && exit 1)
	@test -n "$(PROJECT_ID)" || (echo "FIREBASE_PROJECT_ID is missing in $(FRONTEND_ENV_FILE)" && exit 1)
	@test -f "$(FUNCTIONS_ENV_FILE)" || (echo "Missing $(FUNCTIONS_ENV_FILE)" && exit 1)
	@$(COMPOSE) up --build

down:
	@$(COMPOSE) down

check:
	npm run typecheck
	npm run lint
	npm run build
	npm run functions:build
