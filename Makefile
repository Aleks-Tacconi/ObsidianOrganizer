backend-run:
	cd backend && poetry run python backend/app.py

backend-install:
	cd backend && poetry install

backend-test:
	cd backend && poetry run pytest

backend-lint:
	cd backend && poetry run pylint --fail-under 9 backend

frontend-run:
	cd frontend && npm run dev

frontend-install:
	cd frontend && rm -rf ./node_modules && npm install

frontend-lint:
	cd frontend && npm run lint

run:
	mprocs "make backend-run" "make frontend-run"
