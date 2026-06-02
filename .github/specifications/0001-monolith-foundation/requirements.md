# Requirements Spec 0001 - Monolith Foundation

## Metadata
- Spec ID: SPEC-0001-REQ
- Parent: SPEC-0001
- Version: 1.0
- Status: draft

## Requirement Catalog

### RQ-001 Layered monolith structure
- Type: functional
- Priority: must
- Description: Organize backend and frontend into layers with low coupling.
- Rule: controllers -> services -> infrastructure, web presentation calling API only.
- Acceptance Test: Folder structure follows layered boundaries and imports respect direction.

### RQ-002 Backend stack
- Type: functional
- Priority: must
- Description: Backend service must be Python + FastAPI.
- Acceptance Test: API service boots via FastAPI entrypoint.

### RQ-003 Frontend stack
- Type: functional
- Priority: must
- Description: Web app must be React + TypeScript + Vite.
- Acceptance Test: Frontend app boots with Vite and compiles TypeScript.

### RQ-004 Data and vector persistence
- Type: functional
- Priority: must
- Description: Use ChromaDB for vector data and PostgreSQL only when relational storage is needed.
- Acceptance Test: Vector persistence path uses ChromaDB client.

### RQ-005 Containerization
- Type: functional
- Priority: must
- Description: Run local development and CI flows through Docker.
- Acceptance Test: Containers build and start with single compose command.

### RQ-006 Deployment baseline
- Type: functional
- Priority: should
- Description: Ensure architecture is compatible with Supabase usage in deployment strategy.
- Acceptance Test: Deployment variables and integration points are explicitly defined.

### RQ-007 Engineering principles
- Type: non-functional
- Priority: must
- Description: Decisions must follow YAGNI, KISS, and DRY.
- Acceptance Test: Design decisions include principle checks.

### RQ-008 Testing strategy
- Type: non-functional
- Priority: must
- Description: Include unit, integration, and end-to-end tests.
- Metric: Test suites exist and are runnable from project root.
- Acceptance Test: At least one suite per level is executable.

## Traceability Matrix
| Requirement | Source | Design Element | Test Case |
|---|---|---|---|
| RQ-001 | User constraints | Layer boundaries | Architecture lint/review |
| RQ-002 | User constraints | FastAPI app | Backend boot test |
| RQ-003 | User constraints | React TS Vite app | Frontend boot test |
| RQ-004 | User constraints | Chroma + Postgres adapters | Integration data tests |
| RQ-005 | User constraints | Docker compose | Compose up smoke test |
| RQ-006 | User constraints | Supabase integration points | Deploy config check |
| RQ-007 | User constraints | Decision checklist | PR checklist |
| RQ-008 | User constraints | Test pyramid | CI test run |