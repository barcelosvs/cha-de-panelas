PY=python
PIP=pip
FRONT_DIR=frontend

.PHONY: dev backend frontend build test lint type

dev: ## roda backend + frontend
	$(PY) app.py &
	cd $(FRONT_DIR) && npm run dev

backend: ## roda somente backend
	$(PY) app.py

frontend: ## roda somente frontend
	cd $(FRONT_DIR) && npm run dev

build: ## build frontend
	cd $(FRONT_DIR) && npm run build

test: ## pytest
	$(PY) -m pytest -q

lint: ## ruff + eslint
	ruff check . || true
	cd $(FRONT_DIR) && npx eslint src || true

type: ## mypy
	mypy . || true

help:
	@grep -E '^[a-zA-Z_-]+:.*?##' Makefile | awk 'BEGIN {FS=":.*?##"}; {printf "\033[36m%-12s\033[0m %s\n", $$1, $$2}'
