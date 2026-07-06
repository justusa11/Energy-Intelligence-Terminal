# Developer shortcuts. Run `make help` for the list.
# On Windows, run these targets from Git Bash or WSL, or use the commands
# they wrap directly (see README Quick start).

BACKEND=backend
FRONTEND=frontend
PY=$(BACKEND)/.venv/Scripts/python.exe   # Windows venv path; use .venv/bin/python on macOS/Linux

.PHONY: help install install-backend install-frontend seed dev dev-backend dev-frontend test test-backend test-frontend clean

help:
	@echo "Targets:"
	@echo "  install          Install backend + frontend dependencies"
	@echo "  seed             Create tables and seed DE/US/JP sample data"
	@echo "  dev              Run backend (8000) and frontend (3000) together"
	@echo "  test             Backend pytest + frontend production build"
	@echo "  clean            Remove build artifacts and local SQLite DBs"

install: install-backend install-frontend

install-backend:
	cd $(BACKEND) && python -m venv .venv && $(PY) -m pip install -r requirements.txt

install-frontend:
	cd $(FRONTEND) && npm install

seed:
	cd $(BACKEND) && $(PY) -c "from app.db.init_db import init_db; init_db()"
	cd $(BACKEND) && $(PY) -m scripts.seed_sample_data --days 14

dev:
	@echo "Starting backend on :8000 and frontend on :3000 (Ctrl-C to stop)"
	cd $(BACKEND) && $(PY) -m uvicorn app.main:app --reload --port 8000 &
	cd $(FRONTEND) && npm run dev

dev-backend:
	cd $(BACKEND) && $(PY) -m uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd $(FRONTEND) && npm run dev

test: test-backend test-frontend

test-backend:
	cd $(BACKEND) && $(PY) -m pytest -q

test-frontend:
	cd $(FRONTEND) && npm run build

clean:
	cd $(BACKEND) && rm -f *.db test_contract.db verify.db
	cd $(FRONTEND) && rm -rf .next
