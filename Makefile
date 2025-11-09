backend-run:
	cd backend && poetry run python backend/app.py

backend-install:
	cd backend && poetry install

frontend-run:
	cd frontend && npm run dev

frontend-install:
	cd frontend && rm -rf ./node_modules && npm install

run:
	mprocs "make backend-run" "make frontend-run"
