# Requirements Spec 0003 - Guided Tour for Critical Modules

## Metadata
- Spec ID: SPEC-0003-REQ
- Parent: SPEC-0003
- Version: 1.0
- Status: draft

## Requirement Catalog

### RQ-001 Criticality scoring input
- Type: functional
- Priority: must
- Description: System must compute module-level criticality using at least complexity, churn, and coupling proxies.
- Acceptance Test: Scoring output includes each factor and final score.

### RQ-002 Module ranking
- Type: functional
- Priority: must
- Description: System must rank modules by criticality score and return top-k.
- Acceptance Test: Ranking endpoint/service returns sorted module list with stable schema.

### RQ-003 Tour generation
- Type: functional
- Priority: must
- Description: System must generate ordered tour steps from ranked modules.
- Acceptance Test: Generated tour contains ordered steps with module identifier and summary.

### RQ-004 Tour persistence
- Type: functional
- Priority: must
- Description: Tour and step metadata must be persisted for retrieval.
- Acceptance Test: Persisted tour can be fetched by tour_id.

### RQ-005 Tour retrieval API
- Type: functional
- Priority: must
- Description: API must expose endpoints to create tour and retrieve tour details.
- Acceptance Test: HTTP endpoints return expected schema and status codes.

### RQ-006 Source-grounded step content
- Type: functional
- Priority: must
- Description: Each tour step must include rationale and source references.
- Acceptance Test: Step response includes file paths and contextual references.

### RQ-007 Layer compliance
- Type: non-functional
- Priority: must
- Description: Controllers orchestrate services, services use infrastructure adapters only.
- Acceptance Test: No controller calls directly into data/vector clients.

### RQ-008 Determinism baseline
- Type: non-functional
- Priority: should
- Description: Given same repository snapshot and config, ranking should be reproducible.
- Acceptance Test: Repeated scoring run yields same ordered top-k list.

### RQ-009 Test pyramid
- Type: non-functional
- Priority: must
- Description: Add unit, integration, and end-to-end tests for guided tour flow.
- Acceptance Test: All three test levels run from root commands.

## Traceability Matrix
| Requirement | Source | Design Element | Test Case |
|---|---|---|---|
| RQ-001 | FR-001 | Scoring service | Scoring unit test |
| RQ-002 | FR-002 | Ranking service | Ranking unit/integration test |
| RQ-003 | FR-003 | Tour generator service | Tour generation integration test |
| RQ-004 | FR-004 | Tour repository adapter | Persistence integration test |
| RQ-005 | FR-005 | Tour controllers | API contract test |
| RQ-006 | FR-003 | Step response mapper | Response schema test |
| RQ-007 | NFR-002 | Layer rules | Architecture review/lint |
| RQ-008 | NFR-003 | Scoring config | Reproducibility test |
| RQ-009 | NFR-004 | Test suites | CI test run |