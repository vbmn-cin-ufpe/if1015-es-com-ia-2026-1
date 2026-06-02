# Design Spec 0001 - Monolith Foundation

## Metadata
- Spec ID: SPEC-0001-DES
- Parent: SPEC-0001-REQ
- Version: 1.0
- Status: draft

## Architecture Overview
Single deployable monolith with separated backend and frontend applications in one repository. The design minimizes complexity while preserving clear boundaries.

## Proposed Structure
- backend/
  - controllers/
  - services/
  - infrastructure/
  - main.py
- frontend/
  - web-presentation/
  - services/
  - infrastructure/
  - main.tsx
- docker/
- tests/
  - unit/
  - integration/
  - e2e/

## Layer Rules
- Controllers handle HTTP contracts and call services only.
- Services contain business logic and orchestrate use cases.
- Infrastructure handles external systems: database, vector DB, providers.
- Web presentation holds pages/components and calls frontend services.

## Technology Decisions
- Backend: Python + FastAPI
- Frontend: React + TypeScript + Vite
- Relational DB: PostgreSQL when needed
- Vector DB: ChromaDB
- Deploy baseline: Supabase-compatible integration points
- Runtime and local orchestration: Docker

## Data Design
- Operational data: PostgreSQL tables only when a concrete persistence need exists.
- Semantic retrieval data: Chroma collections and metadata.

## Testing Design
- Unit: isolated service and utility logic.
- Integration: API with DB/vector adapters.
- E2E: user journeys from web presentation to API flows.

## Principle Gates
Each new module/change must answer:
- YAGNI: Is this needed now for current milestone
- KISS: Is there a simpler equivalent implementation
- DRY: Does this duplicate existing behavior

## Rollout Plan
- Step 1: scaffold layered folders
- Step 2: add docker baseline
- Step 3: wire FastAPI and Vite skeletons
- Step 4: add Chroma and Postgres adapters
- Step 5: add test suites