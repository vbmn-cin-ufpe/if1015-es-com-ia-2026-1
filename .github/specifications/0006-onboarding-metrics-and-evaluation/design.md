# Design Spec 0006 - Onboarding Metrics and Evaluation

## Metadata
- Spec ID: SPEC-0006-DES
- Parent: SPEC-0006-REQ
- Version: 1.0
- Status: draft

## Architecture Overview
Add a metrics and evaluation capability in the monolith to capture onboarding events, process quality signals, and expose actionable reports.

## Backend Layer Components

### controllers
- metrics_controller
  - get_metrics(repository_id, period, filters)
  - get_quality_report(repository_id, period)
- feedback_controller
  - submit_feedback(response_id, usefulness, correctness, comment)

### services
- event_ingestion_service
  - validates and records onboarding events
- feedback_service
  - validates and stores user feedback
- aggregation_service
  - computes rolled-up metrics from event/feedback data
- reporting_service
  - builds trend summaries and comparative snapshots

### infrastructure
- metrics_repository_adapter
  - stores raw events and aggregated views
- feedback_repository_adapter
  - stores response evaluations
- query_adapter
  - efficient filtered reads for report generation

## Data Model
- onboarding_event
  - id
  - repository_id
  - session_id
  - event_type
  - timestamp
  - metadata
- response_feedback
  - id
  - repository_id
  - response_id
  - usefulness_score
  - correctness_score
  - comment
  - timestamp
- metrics_snapshot
  - id
  - repository_id
  - period_start
  - period_end
  - metrics_payload

## API Contracts
- POST /api/feedback
  - Request: response_id, repository_id, usefulness_score, correctness_score, comment(optional)
  - Response: feedback_id, status
- GET /api/repos/{repository_id}/metrics
  - Query: from, to, group_by(optional)
  - Response: aggregate metrics payload
- GET /api/repos/{repository_id}/metrics/quality-report
  - Query: from, to
  - Response: quality rates, trends, comparison summary

## Metric Set (MVP)
- response_latency_p50/p95
- onboarding_flow_completion_rate
- answer_usefulness_rate
- answer_correctness_rate
- feedback_coverage_rate

## Error Handling
- Invalid score ranges: validation error.
- Missing repository context: not found.
- Empty period data: successful empty report payload.

## Frontend Web Presentation
- metrics dashboard page with repository/date filters
- cards for core KPIs
- trend chart section for usefulness/correctness over time
- feedback submission UI linked to assistant responses

## Testing Design
- Unit
  - metric calculations
  - trend comparison logic
- Integration
  - event + feedback ingestion to aggregated report flow
  - metrics API contract checks
- End-to-end
  - user submits feedback and sees updated trend/report data

## Principle Gates
- YAGNI: only core KPI set in MVP.
- KISS: single aggregation path and simple report schema.
- DRY: shared metric computation utilities reused across endpoints.

## Rollout Plan
- Step 1: implement event and feedback ingestion.
- Step 2: implement aggregation and reporting services.
- Step 3: expose metrics/report APIs.
- Step 4: implement frontend dashboard and feedback UI.
- Step 5: add tests and validate dockerized flow.