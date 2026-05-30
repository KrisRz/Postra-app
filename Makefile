# Postra local dev
# Quick start:  make dev
# Full stack:   make dev-full

.PHONY: dev dev-full infra infra-full infra-tools infra-stop db-push db-seed dev-app dev-frontend dev-backend clean

# ── Quick workflows ──────────────────────────────────────────────

# Default: Postgres + Redis + Temporal → schema push → frontend + backend
dev: infra db-push dev-app

# Full: Postgres + Redis + Temporal + tools → schema push → seed → frontend + backend
dev-full: infra-full db-push db-seed dev-app

# ── Infrastructure ───────────────────────────────────────────────

# Core + Temporal (backend requires Temporal to start)
infra:
	docker compose -f docker-compose.dev.yaml --profile temporal up -d
	@echo "Postgres: localhost:5432  |  Redis: localhost:6379  |  Temporal: localhost:7233"

# Minimal: Postgres + Redis only (frontend-only dev, backend won't start)
infra-light:
	docker compose -f docker-compose.dev.yaml up -d
	@echo "Postgres: localhost:5432  |  Redis: localhost:6379"

# Core + Temporal + ES
infra-full:
	docker compose -f docker-compose.dev.yaml --profile temporal --profile tools up -d
	@echo "Postgres: localhost:5432  |  Redis: localhost:6379"
	@echo "pgAdmin:  localhost:8081  |  RedisInsight: localhost:5540"
	@echo "Temporal: localhost:7233  |  Temporal UI:  localhost:8080"

# Core + pgAdmin + RedisInsight (no Temporal)
infra-tools:
	docker compose -f docker-compose.dev.yaml --profile tools up -d

infra-stop:
	docker compose -f docker-compose.dev.yaml --profile temporal --profile tools down

# ── Database ─────────────────────────────────────────────────────

# Push Prisma schema to local DB
db-push:
	@echo "Waiting for Postgres..."
	@until docker exec postiz-postgres pg_isready -U postiz-local -d postiz-db-local > /dev/null 2>&1; do sleep 1; done
	pnpm prisma-db-push

# Seed admin user + org (idempotent)
db-seed:
	@echo "Waiting for Postgres..."
	@until docker exec postiz-postgres pg_isready -U postiz-local -d postiz-db-local > /dev/null 2>&1; do sleep 1; done
	pnpm db:seed

# ── App ──────────────────────────────────────────────────────────

# Frontend + backend (dev mode)
dev-app:
	pnpm dev-backend

dev-frontend:
	pnpm dev:frontend

dev-backend:
	pnpm dev:backend

# ── Cleanup ──────────────────────────────────────────────────────

# Nuke volumes and start fresh
clean: infra-stop
	docker compose -f docker-compose.dev.yaml --profile temporal --profile tools down -v
	@echo "Volumes removed. Run 'make dev' to start fresh."
