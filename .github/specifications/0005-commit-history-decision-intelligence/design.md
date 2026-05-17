# Design Spec 0005 - Commit History Decision Intelligence

## Metadata
- Spec ID: SPEC-0005-DES
- Parent: SPEC-0005-REQ
- Version: 1.0
- Status: draft

## Architecture Overview
Add commit history intelligence to the monolith using existing indexing context. The feature extracts historical change intent and exposes module-linked rationale timelines.

## Backend Layer Components

### controllers
- history_controller
  - get_timeline(repository_id, module_path, filters)
  - get_why_explanation(repository_id, module_path, question)

### services
- commit_ingestion_service
  - reads commit metadata and changed files
- decision_classification_service
  - classifies intent categories and confidence
- module_linkage_service
  - links commits to modules and impacted areas
- timeline_service
  - builds ordered timeline entries and filtering
- why_explanation_service
  - generates grounded explanations from timeline evidence

### infrastructure
- git_history_adapter
  - obtains commit log and file-level diffs
- decision_repository_adapter
  - persists analyzed decisions and timeline entries
- llm_client
  - optional synthesis for concise why explanations
- metadata_repository_adapter
  - repository snapshot/version coordination

## Data Model
- commit_decision
  - commit_id
  - repository_id
  - timestamp
  - category
  - confidence
  - summary
  - touched_modules
- decision_timeline_entry
  - id
  - repository_id
  - module_path
  - commit_id
  - position
  - rationale
  - references

## API Contracts
- GET /api/repos/{repository_id}/history/timeline
  - Query: module_path(optional), category(optional), limit
  - Response: ordered timeline entries
- POST /api/repos/{repository_id}/history/why
  - Request: module_path, question
  - Response: explanation, supporting_commits[]

## Error Handling
- Missing commit history: actionable response indicating unavailable history.
- Unsupported filters: validation error with accepted filter list.
- Incomplete analysis: partial timeline with warnings.

## Frontend Web Presentation
- history timeline view with category filters
- module-specific decision panel
- why-question input and response view with commit references

## Testing Design
- Unit
  - decision classification mapping
  - timeline ordering and filtering
- Integration
  - commit ingestion to timeline persistence flow
  - history API contract checks
- End-to-end
  - user opens timeline, filters by module, asks why question

## Principle Gates
- YAGNI: commit history only, no PR discussion analysis.
- KISS: single timeline model and category taxonomy v1.
- DRY: shared commit reference mapper across timeline and why responses.

## Rollout Plan
- Step 1: implement commit ingestion and decision classification.
- Step 2: implement linkage and timeline generation.
- Step 3: expose API endpoints and persistence.
- Step 4: implement frontend timeline and why interactions.
- Step 5: add tests and validate dockerized run path.