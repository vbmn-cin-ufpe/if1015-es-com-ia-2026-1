# Spec Request 0006 - Onboarding Metrics and Evaluation

## Metadata
- Spec ID: SPEC-0006
- Feature Name: Onboarding metrics and utility evaluation
- Author: CodeCompass Team
- Date: 2026-05-17
- Status: draft

## Context
Core onboarding features are defined. The next increment should measure effectiveness and quality of outcomes.

## Problem Statement
Without objective metrics, the team cannot verify whether onboarding speed and answer usefulness are improving.

## Objectives
- Capture usage and outcome metrics for onboarding workflows.
- Evaluate response utility and correctness with structured feedback.
- Provide dashboards/endpoints for project-level insights.

## Non-Objectives
- Individual employee performance scoring.
- HR analytics or ranking of developers.
- External BI platform integration in this increment.

## Target Users
- Product/tech leads monitoring onboarding effectiveness.
- Developers and evaluators reviewing response quality.

## User Scenarios
1. Track onboarding progress
   - Given a developer uses chat/tours/history features
   - When events are recorded
   - Then aggregated metrics are available by repository and time window

2. Evaluate answer usefulness
   - Given a response is shown to the user
   - When the user rates usefulness/correctness
   - Then the score is stored and included in quality reports

## Functional Requirements
- FR-001: Record key onboarding events and timestamps.
- FR-002: Record explicit feedback for response usefulness/correctness.
- FR-003: Compute aggregate metrics (latency, success, usefulness rate, coverage).
- FR-004: Expose API endpoints for metrics query and evaluation reports.
- FR-005: Provide frontend views for metrics and quality trends.

## Non-Functional Requirements
- NFR-001: Keep implementation simple and incremental.
- NFR-002: Respect layered architecture boundaries.
- NFR-003: Ensure metric calculations are reproducible and auditable.
- NFR-004: Include unit, integration, and end-to-end tests.

## Acceptance Criteria
- [ ] Event and feedback data are captured for core onboarding flows.
- [ ] Aggregated metrics are queryable by repository and period.
- [ ] Evaluation reports show usefulness/correctness trend summaries.
- [ ] Unit, integration, and e2e tests cover ingestion, aggregation, and visualization.

## Open Questions
- Minimum feedback schema fields for MVP.
- Reporting granularity for daily vs weekly rollups.