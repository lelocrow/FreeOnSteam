.PHONY: install dev lint typecheck test build check sync bootstrap deploy verify

install:
	npm ci

dev:
	npm run dev

lint:
	npm run lint

typecheck:
	npm run typecheck

test:
	npm test

build:
	npm run build

check:
	npm run check

sync:
	npm run sync

bootstrap:
	./scripts/bootstrap-gcp.sh

deploy:
	./scripts/deploy.sh

verify:
	./scripts/verify-deployment.sh
