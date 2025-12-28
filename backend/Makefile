install:
	poetry install

lint:
	poetry run pylint --fail-under 9 backend

test:
	echo "testing..."

migrate:
	poetry run python backend/manage.py makemigrations
	poetry run python backend/manage.py migrate

run:
	poetry run python backend/manage.py runserver
