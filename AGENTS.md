# AGENTS.md

## Purpose
- This document is for coding agents working in `ObsidianOrganizer`.
- Follow repository conventions before introducing new patterns.
- Keep edits scoped, minimal, and consistent with existing code.
- Prefer existing tooling (`make`, `poetry`, `npm`) over ad-hoc commands.

## Repository Layout
- `frontend/`: Vite + React + TypeScript UI.
- `backend/`: Django + DRF API.
- `.github/workflows/ci.yml`: CI checks (pylint, eslint, backend test target).
- `Makefile` (repo root): convenience commands for full-stack setup/run.

## Environment and Toolchain
- Node/NPM required for frontend.
- Python + Poetry required for backend.
- `make` is used heavily in root/frontend/backend workflows.
- `mprocs` is used by root `make run` to run frontend + backend together.
- Skills are available in `.agents/skills` use when beneficial to task

## Build, Lint, and Test Commands

### Root Commands
```sh
make install
make run
```

### Frontend Commands
```sh
cd frontend && make install
cd frontend && make run
cd frontend && make lint
cd frontend && npm run build
cd frontend && npm run preview
cd frontend && npm run orval:gen
```

### Backend Commands
```sh
cd backend && make install
cd backend && make migrate
cd backend && make run
cd backend && make lint
cd backend && make test
```

## Test Execution Notes (Important)
- `backend/Makefile` has a `test` target, but it currently only echoes `testing...`.
- CI runs `cd backend && make test` in the `pytest` job, so backend tests are not effectively enforced yet.
- `backend/tests/test_main.py` contains a pytest-style test, but `pytest` is not currently installed in the Poetry env.
- `backend/backend/api/tests.py` exists but currently contains no real tests.

## Running a Single Test

### Preferred now: Django test runner
```sh
cd backend && poetry run python backend/manage.py test
cd backend && poetry run python backend/manage.py test api.tests -v 2
cd backend && poetry run python backend/manage.py test api.tests.TestCaseName.test_method -v 2
```

### Pytest-style single test (requires adding pytest first)
```sh
cd backend && poetry run pytest tests/test_main.py::test_pytest -q
```

### Single-file lint checks
```sh
cd frontend && npx eslint src/Components/TagList/TagList.tsx
cd backend && poetry run pylint --fail-under 9 backend/api/views.py
```

## Frontend Style Guidelines (TypeScript/React)

### Imports
- Prefer grouping imports in this order: third-party, local runtime imports, type-only imports, styles.
- Use `import type { ... }` for TS-only types.
- Use relative imports (project currently does not use path aliases).
- Keep style imports like `./Component.css` near the top or after local imports; be consistent within a file.

### Formatting
- Match surrounding style in each file.
- Most app code uses 2-space indentation, semicolons, and double quotes.
- Keep component bodies readable; extract helpers instead of deeply nested inline logic.
- Keep JSX props formatted one-per-line when they become long.

### Types and Data Modeling
- TS is configured `strict: true`; do not introduce `any` unless unavoidable.
- Prefer `unknown` + narrowing for caught errors.
- Reuse generated API types from `frontend/src/Utils/types/api.schemas.ts`.
- API helper methods can return `undefined` on error; callers must guard `res?.data`.
- Keep payload fields aligned with backend serializer naming (many fields are snake_case, e.g. `primary_tag_id`).

### Naming
- React component files and component symbols use PascalCase.
- Hooks use `useXxx` naming (camelCase with `use` prefix).
- Utility functions/variables use camelCase.
- Keep existing folder naming conventions as-is (for example `Components/`, `Utils/`, `Pages/`).

### UI and State Patterns
- Prefer functional components and hooks.
- Keep state close to usage; lift state only when needed.
- Favor existing MUI patterns (`sx`, `Stack`, `Dialog`, `IconButton`) over introducing new UI libraries.
- Preserve optimistic UI updates where already used (for example note completion toggles).

### Error Handling
- Use the shared `frontend/src/Utils/api.ts` wrapper for HTTP calls.
- Log actionable error context; do not silently swallow failures.
- Guard optional responses before reading data.
- Avoid throwing uncaught errors from render paths.

## Backend Style Guidelines (Python/Django)

### Imports
- Follow standard Python import order: stdlib, third-party, local app imports.
- Keep one logical import group per block with blank lines between groups.

### Formatting
- Use 4-space indentation.
- Prefer double quotes, matching existing backend code.
- Keep functions focused; extract helpers for file parsing / data transforms.
- Avoid large view functions when logic can move to helpers/serializers/services.

### Types
- Add type hints to new functions and non-trivial local variables.
- Keep return types explicit on helper functions.
- Existing code uses `typing.List`; either `list[str]` or `List[str]` is acceptable, but be consistent within a file.

### Naming
- Models, serializers, and viewsets use PascalCase (`Note`, `NoteSerializer`, `NoteView`).
- Functions, variables, and module-level helpers use snake_case.
- URL route fragments are kebab-case in router registrations (e.g. `primary-tags`, `module-info`).

### Django/DRF Conventions
- Keep serializer field names and read/write behavior explicit (`*_id` write-only fields are used extensively).
- Preserve router-based API registration pattern in `backend/backend/api/urls.py`.
- Validate request payloads and return appropriate HTTP status codes with `JsonResponse` for function views.
- Keep file access constrained (existing code checks requested paths start with `VAULT`).

### Linting and Quality Gates
- Backend lint command is `poetry run pylint --fail-under 9 backend`.
- `.pylintrc` disables: `C0111`, `C0103`, `E1101`, `R0903`, `C0415`.
- Even with relaxed rules, keep new code clean and typed.

## Generated Code and Schema Sync
- Files under `frontend/src/Utils/types/**` are generated by Orval.
- Do not manually edit generated API files.
- If backend schema changes, regenerate frontend types:
  - `cd frontend && npm run orval:gen`
- ESLint currently ignores `src/Utils/types/**`; keep custom logic outside that tree.

## Cursor/Copilot Rules Check
- Checked `.cursor/rules/`: not present.
- Checked `.cursorrules`: not present.
- Checked `.github/copilot-instructions.md`: not present.
- If any of these files are added later, treat them as authoritative and update this document.

## Practical Pre-PR Checklist for Agents
- Run frontend lint: `cd frontend && make lint`.
- Run frontend build/type-check: `cd frontend && npm run build`.
- Run backend lint: `cd backend && make lint`.
- Run backend tests with a real command (Django test runner for now).
- If API shape changed, regenerate Orval types and verify frontend compiles.
