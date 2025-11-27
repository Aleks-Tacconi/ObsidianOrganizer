install:
	cd backend && make install
	cd backend && make migrate
	cd frontend && make install

run:
	mprocs "cd frontend && make run" "cd backend && make run"
