# Design Spec 0003 - Guided Tour for Critical Modules

## Metadata
- Spec ID: SPEC-0003-DES
- Parent: SPEC-0003-REQ
- Version: 1.0
- Status: draft

## Architecture Overview
Implement guided tour generation in the existing monolith with strict layer boundaries. Reuse indexed repository artifacts from SPEC-0002.

## Backend Layer Components

### controllers
- tour_controller
  - create_tour(repository_id, config)
  - get_tour(tour_id)
  - list_tours(repository_id)

### services
- metrics_service
  - collects complexity, churn, and coupling proxies per module
- scoring_service
  - computes weighted criticality score
- ranking_service
  - sorts modules and selects top-k
- tour_generation_service
  - generates ordered steps with rationale and references
- tour_service
  - orchestrates end-to-end creation and retrieval

### infrastructure
- complexity_adapter
  - static analysis metrics extraction
- git_history_adapter
  - churn extraction from commits
- dependency_adapter
  - coupling proxy extraction
- tour_repository_adapter
  - persist and query tour entities
- llm_client
  - optional concise summary generation for each step

## Data Model
- tour
  - id
  - repository_id
  - created_at
  - config
- tour_step
  - id
  - tour_id
  - position
  - module_path
  - score
  - rationale
  - references

## Scoring Design
- score = w_complexity * normalized_complexity + w_churn * normalized_churn + w_coupling * normalized_coupling
- default weights are configuration-driven and persisted with the tour.
- missing metrics use safe defaults and explicit flags in rationale.

## API Contracts
- POST /api/tours/create
  - Request: repository_id, top_k, weights
  - Response: tour_id, status, steps_count
- GET /api/tours/{tour_id}
  - Response: tour metadata + ordered steps
- GET /api/repos/{repository_id}/tours
  - Response: list of tours with timestamps and configs

## Error Handling
- Repository not indexed: reject create request with actionable message.
- Metrics extraction failure: mark module with partial scoring and continue when safe.
- Persistence failure: fail request and return stable error payload.

## Frontend Web Presentation
- onboarding tour page listing generated tours
- step-by-step viewer with rationale and source links
- controls for top-k and score weights

## Testing Design
- Unit
  - score normalization and weighted scoring
  - ranking determinism and top-k selection
- Integration
  - metrics extraction to persisted tour flow
  - tour retrieval contracts
- End-to-end
  - generate tour from indexed repository and navigate steps in UI

## Principle Gates
- YAGNI: no role-based personalization in this increment.
- KISS: one scoring formula with config weights.
- DRY: shared module metadata and reference mappers reused across steps.

## Rollout Plan
- Step 1: implement metrics and scoring services.
- Step 2: implement ranking and tour generation service.
- Step 3: add persistence and API endpoints.
- Step 4: integrate web presentation flow.
- Step 5: add and validate unit/integration/e2e tests.