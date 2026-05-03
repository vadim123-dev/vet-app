.PHONY: setup dev test build lint

setup:
	git config core.hooksPath .githooks
	@echo "Git hooks activated. Commit format: [PREFIX] - message"

dev:
	docker compose up

build:
	docker compose build

test:
	docker compose -f docker-compose.test.yml up --abort-on-container-exit

lint:
	ruff check backend/
