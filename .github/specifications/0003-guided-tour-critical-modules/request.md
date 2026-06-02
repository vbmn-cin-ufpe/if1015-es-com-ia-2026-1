# Spec Request 0003 - Guided Tour for Critical Modules

## Metadata
- Spec ID: SPEC-0003
- Feature Name: Guided onboarding tour for critical modules
- Author: CodeCompass Team
- Date: 2026-05-17
- Status: draft

## Context
After repository indexing and contextual chat, the next onboarding accelerator is an automatic guided tour focused on critical modules.

## Problem Statement
New developers still struggle to understand where to start in large repositories. Chat helps with questions, but lacks a structured path across key modules.

## Objectives
- Identify critical modules using objective ranking signals.
- Generate a sequenced guided tour for onboarding.
- Expose tour consumption endpoints for web presentation.

## Non-Objectives
- Personalized tours by role in this increment.
- Multi-language complexity analyzers in this increment.
- Full architectural graph editing in UI.

## Target Users
- New developers onboarding in legacy codebases.
- Tech leads who want a baseline onboarding path.

## User Scenarios
1. Generate guided tour
   - Given an indexed repository
   - When the user requests a guided tour
   - Then the system returns ordered tour steps for critical modules

2. Navigate guided tour
   - Given a generated tour
   - When the user opens a tour step
   - Then the system provides summary, rationale, and relevant source references

## Functional Requirements
- FR-001: Compute module criticality score from complexity, churn, and coupling proxies.
- FR-002: Rank modules and select top-k for guided onboarding.
- FR-003: Generate step-by-step tour content with concise module summaries.
- FR-004: Persist tour metadata and steps for reuse.
- FR-005: Expose API endpoints to create and retrieve tours.

## Non-Functional Requirements
- NFR-001: Keep implementation simple and incremental.
- NFR-002: Respect layered architecture boundaries.
- NFR-003: Keep tour generation deterministic for same inputs where possible.
- NFR-004: Include tests at unit, integration, and e2e levels.

## Acceptance Criteria
- [ ] System creates guided tour for an indexed Python repository.
- [ ] Tour steps include module path, score rationale, and references.
- [ ] Tour retrieval endpoint returns persisted tour content.
- [ ] Unit, integration, and e2e tests cover the primary flow.

## Open Questions
- Exact weights for complexity, churn, and coupling in initial scoring.
- Whether to allow manual reordering of generated tour steps.