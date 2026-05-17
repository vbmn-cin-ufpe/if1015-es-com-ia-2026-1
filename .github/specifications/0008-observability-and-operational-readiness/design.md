# Design Spec 0008 - Observability and Operational Readiness

## Metadata
- Spec ID: SPEC-0008-DES
- Parent: SPEC-0008-REQ
- Version: 1.0
- Status: draft

## Architecture Overview
Implement an observability baseline in the monolith with structured telemetry and operational endpoints for reliable diagnosis and deployment readiness.

## Backend Layer Components

### controllers
- operational_controller
  - get_liveness
  - get_readiness
  - get_operational_summary

### services
- logging_service
  - standardizes structured log entries
- metrics_service
  - emits workflow metrics with standard dimensions
- readiness_service
  - checks dependency health and readiness state
- operational_summary_service
  - aggregates recent KPI and error signals
- alert_evaluation_service
  - evaluates baseline alert thresholds

### infrastructure
- telemetry_sink_adapter
  - abstracts metrics/log sink target
- dependency_probe_adapter
  - checks postgres/chroma/external provider connectivity
- schema_validation_adapter
  - validates telemetry naming and dimensions

## Telemetry Contract
- Log fields
  - timestamp
  - level
  - service
  - correlation_id
  - operation
  - stage
  - message
  - error_code(optional)
- Metric dimensions
  - repository_id(optional)
  - operation
  - status
  - environment

## API Contracts
- GET /api/ops/health/live
  - Response: status
- GET /api/ops/health/ready
  - Response: status, dependencies[]
- GET /api/ops/summary
  - Response: latency, throughput, error_rate, recent_errors

## Alert Baseline
- High error rate in core flows over rolling window.
- Sustained readiness failure for critical dependency.
- Latency p95 above threshold for chat/index operations.

## Frontend Web Presentation
- operational status section in admin/metrics view
- readiness indicator and recent errors list
- core KPI cards from operational summary API

## Error Handling
- Probe timeout: dependency marked unknown with warning state.
- Telemetry sink unavailable: fallback to local logging and degraded metric mode.
- Summary aggregation failure: return partial data with explicit status.

## Testing Design
- Unit
  - log schema formatting
  - alert threshold evaluation
- Integration
  - readiness checks with dependency probes
  - ops summary API contract
- End-to-end
  - simulate degraded dependency and verify readiness/summary behavior

## Principle Gates
- YAGNI: only baseline logs/metrics/health/alerts in this increment.
- KISS: single telemetry contract and minimal endpoints.
- DRY: shared telemetry helpers for all workflow services.

## Rollout Plan
- Step 1: implement structured logging and correlation id propagation.
- Step 2: implement metrics instrumentation for key flows.
- Step 3: add liveness/readiness and operational summary endpoints.
- Step 4: add baseline alert evaluation logic.
- Step 5: add tests and validate dockerized operations path.