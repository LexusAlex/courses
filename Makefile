.DEFAULT_GOAL := help

PNPM ?= pnpm
DOCKER ?= docker
HOST ?= 127.0.0.1
DEV_PORT ?= 4321
PREVIEW_PORT ?= 4322
COURSE ?= php
MODULE ?= basics
SLUG ?=
URL ?= https://lexusalex.ru/courses/

.PHONY: help install dev start scaffold build preview serve check test verify validate ci lesson e2e smoke \
        docker-config docker-build docker-up docker-down docker-logs docker-dev docker-dev-down

help:
	@echo "courses - Astro + Starlight"
	@echo "make install       Install locked dependencies"
	@echo "make dev           Start development server (localhost:4321)"
	@echo "make scaffold      Create missing RU/EN structure pages"
	@echo "make lesson COURSE=php MODULE=basics SLUG=variables  Create paired RU/EN drafts"
	@echo "make e2e           Run browser checks against the existing build"
	@echo "make smoke URL=https://lexusalex.ru/courses/  Check a deployed site (read only)"
	@echo "make build         Build static site into dist/"
	@echo "make preview       Preview the existing build (localhost:4322)"
	@echo "make serve         Build and preview production locally"
	@echo "make check         Check Astro and TypeScript"
	@echo "make test          Run automated tests"
	@echo "make verify        Verify links and navigation in dist/"
	@echo "make validate      Run check, test, build, verify in order"
	@echo "make docker-config Validate production and development Compose files"
	@echo "make docker-build  Build production image"
	@echo "make docker-up     Build and start production containers"
	@echo "make docker-down   Stop production containers (keep volumes)"
	@echo "make docker-logs   Follow production logs"
	@echo "make docker-dev    Build and start development containers"
	@echo "make docker-dev-down Stop development containers (keep volumes)"
	@echo "Overrides: make dev HOST=0.0.0.0 DEV_PORT=4323"

install:
	$(PNPM) install --frozen-lockfile

dev:
	$(PNPM) dev --host $(HOST) --port $(DEV_PORT)

start: dev

scaffold:
	$(PNPM) scaffold

build:
	$(PNPM) build

preview:
	$(PNPM) preview --host $(HOST) --port $(PREVIEW_PORT)

serve: build
	$(PNPM) preview --host $(HOST) --port $(PREVIEW_PORT)

check:
	$(PNPM) check

test:
	$(PNPM) test

lesson:
	$(PNPM) lesson --course "$(COURSE)" $(if $(MODULE),--module "$(MODULE)") --slug "$(SLUG)"

e2e:
	$(PNPM) test:e2e

smoke:
	$(PNPM) smoke --url "$(URL)"

verify:
	$(PNPM) verify

# One recipe preserves order even with make -j. No install or Docker side effects.
validate:
	$(PNPM) check
	$(PNPM) test
	$(PNPM) build
	$(PNPM) verify

ci: validate

docker-config:
	$(DOCKER) compose config --quiet
	$(DOCKER) compose -f compose.dev.yaml config --quiet

docker-build:
	$(DOCKER) compose build web

docker-up:
	$(DOCKER) compose up --detach --build web

docker-down:
	$(DOCKER) compose down

docker-logs:
	$(DOCKER) compose logs --follow web

docker-dev:
	$(DOCKER) compose -f compose.dev.yaml up --build dev

docker-dev-down:
	$(DOCKER) compose -f compose.dev.yaml down
