# Requirements Spec 0006 - Onboarding Metrics and Evaluation

## Metadata
- Spec ID: SPEC-0006-REQ
- Parent: SPEC-0006
- Version: 1.0
- Status: draft

## Requirement Catalog

### RQ-001 Event tracking
- Type: functional
- Priority: must
- Description: System must capture onboarding events for chat, tours, dependency graph, and history flows.
- Acceptance Test: Event stream contains event type, timestamp, repository_id, session/user context.

### RQ-002 Feedback capture
- Type: functional
- Priority: must
- Description: System must capture usefulness and correctness feedback per response.
- Acceptance Test: Feedback submission persists score, optional comment, and response reference.

### RQ-003 Aggregation engine
- Type: functional
- Priority: must
- Description: System must compute aggregate metrics by repository and time window.
- Acceptance Test: Aggregation endpoint returns deterministic metric values for same dataset.

### RQ-004 Quality report generation
- Type: functional
- Priority: must
- Description: System must generate quality reports including usefulness/correctness rates and trend snapshots.
- Acceptance Test: Report payload includes current period metrics and previous period comparison.

### RQ-005 Metrics API
- Type: functional
- Priority: must
- Description: API must provide endpoints to query metrics and evaluation reports.
- Acceptance Test: Endpoints return stable schema and validated parameters.

### RQ-006 Web metrics presentation
- Type: functional
- Priority: should
- Description: Frontend should display core onboarding metrics and quality trends.
- Acceptance Test: UI renders report cards/charts and supports repository/date filters.

### RQ-007 Layer compliance
- Type: non-functional
- Priority: must
- Description: Controllers orchestrate services; services use infrastructure adapters only.
- Acceptance Test: No direct controller access to storage/analytics clients.

### RQ-008 Auditability and reproducibility
- Type: non-functional
- Priority: should
- Description: Metric calculations should be reproducible with traceable input events.
- Acceptance Test: Same input dataset yields same aggregated output and query trace metadata.

### RQ-009 Test pyramid
- Type: non-functional
- Priority: must
- Description: Add unit, integration, and end-to-end tests for metrics flow.
- Acceptance Test: Three test levels run successfully from root commands.

## Traceability Matrix
| Requirement | Source | Design Element | Test Case |
|---|---|---|---|
| RQ-001 | FR-001 | Event ingestion service | Event ingestion integration test |
| RQ-002 | FR-002 | Feedback service | Feedback API test |
| RQ-003 | FR-003 | Aggregation service | Aggregation determinism test |
| RQ-004 | FR-003 | Reporting service | Report payload test |
| RQ-005 | FR-004 | Metrics controllers | API contract test |
| RQ-006 | FR-005 | Web metrics dashboard | UI rendering/filter test |
| RQ-007 | NFR-002 | Layer rules | Architecture review/lint |
| RQ-008 | NFR-003 | Calculation trace metadata | Reproducibility test |
| RQ-009 | NFR-004 | Test suites | CI test run |