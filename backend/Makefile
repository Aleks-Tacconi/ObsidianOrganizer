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
	LD_LIBRARY_PATH=/nix/store/4yq2x3vf2y2wwn5a343f6nbbv8g0cxk4-gcc-14.3.0-lib/lib:$$LD_LIBRARY_PATH poetry run python backend/manage.py runserver
