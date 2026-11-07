# Docker Compose development commands
VITE_MODE ?= prev
FUNCTIONS_REGION ?= asia-northeast1
HOSTING_PORT ?= 5050
NGROK_PORT ?= 5173
FRONTEND_ENV_FILE = .env.$(VITE_MODE).local
PROJECT_ID = $(if $(wildcard $(FRONTEND_ENV_FILE)),$(shell awk -F= '/^FIREBASE_PROJECT_ID=/{print $$2; exit}' "$(FRONTEND_ENV_FILE)"),)
FUNCTIONS_ENV_FILE = functions/.env.$(VITE_MODE).local
COMPOSE = ENV_FILE=$(FRONTEND_ENV_FILE) FUNCTIONS_ENV_FILE=$(FUNCTIONS_ENV_FILE) VITE_MODE=$(VITE_MODE) HOSTING_PORT=$(HOSTING_PORT) docker compose --env-file $(FRONTEND_ENV_FILE)

.PHONY: install functions-build functions-watch emulators up ngrok ngrok-hosting down check

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

ngrok:
	@test -f "$(FRONTEND_ENV_FILE)" || (echo "Missing $(FRONTEND_ENV_FILE)" && exit 1)
	@test -n "$(PROJECT_ID)" || (echo "FIREBASE_PROJECT_ID is missing in $(FRONTEND_ENV_FILE)" && exit 1)
	@test -f "$(FUNCTIONS_ENV_FILE)" || (echo "Missing $(FUNCTIONS_ENV_FILE)" && exit 1)
	@command -v ngrok >/dev/null 2>&1 || (echo "ngrok command is required. Install ngrok first." && exit 1)
	@test -z "$$(pgrep -x ngrok 2>/dev/null || true)" || (echo "An ngrok process is already running. Stop it with Ctrl+C before running make ngrok." && exit 1)
	@set -e; \
	  trap '$(COMPOSE) down' INT TERM EXIT; \
	  $(COMPOSE) up --build -d; \
	  until test "$$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$(NGROK_PORT)/api/drawings/not-found" 2>/dev/null || true)" = "404"; do sleep 1; done; \
	  echo "ngrok is exposing http://127.0.0.1:$(NGROK_PORT)"; \
	  ngrok http $(NGROK_PORT)

ngrok-hosting:
	@$(MAKE) ngrok NGROK_PORT=$(HOSTING_PORT)

down:
	@$(COMPOSE) down

check:
	npm run typecheck
	npm run lint
	npm run build
	npm run functions:build
