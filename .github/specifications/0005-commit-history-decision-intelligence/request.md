# Spec Request 0005 - Commit History Decision Intelligence

## Metadata
- Spec ID: SPEC-0005
- Feature Name: Decision intelligence from commit history
- Author: CodeCompass Team
- Date: 2026-05-17
- Status: draft

## Context
After indexing, chat, guided tours, and dependency visualization, onboarding can improve by explaining historical decisions behind code changes.

## Problem Statement
Developers often understand what the code does but not why design choices were made. This context is hidden in commit history and hard to retrieve manually.

## Objectives
- Analyze commit history to extract decision signals.
- Link historical decisions to modules and repository areas.
- Expose historical rationale in API and web presentation.

## Non-Objectives
- Pull request thread analysis in this increment.
- Contributor performance analytics.
- Automated architecture governance scoring.

## Target Users
- New developers learning project rationale.
- Tech leads answering architecture history questions.

## User Scenarios
1. Decision timeline generation
   - Given an indexed repository with commit history
   - When the user requests historical insights for a module
   - Then the system returns a timeline of relevant decisions and change reasons

2. Ask why-question with history grounding
   - Given commit decision data is available
   - When the user asks why a module changed in a specific way
   - Then the system returns an explanation grounded in commits and affected files

## Functional Requirements
- FR-001: Extract commit metadata and changed files from repository history.
- FR-002: Classify commit intent signals and decision categories.
- FR-003: Build module-linked decision timeline artifacts.
- FR-004: Expose API endpoints for decision timeline and why explanations.
- FR-005: Present historical rationale in web UI with source references.

## Non-Functional Requirements
- NFR-001: Keep implementation simple and incremental.
- NFR-002: Respect layered architecture boundaries.
- NFR-003: Ensure reproducible timeline generation for same snapshot.
- NFR-004: Include unit, integration, and end-to-end tests.

## Acceptance Criteria
- [ ] Decision timeline can be generated for an indexed Python repository.
- [ ] Timeline entries contain commit references, affected modules, and rationale labels.
- [ ] Why endpoint returns grounded explanation with source commits.
- [ ] Unit, integration, and e2e tests cover primary flows.

## Open Questions
- Initial taxonomy for decision categories.
- Whether to summarize by commit or by grouped change episodes.