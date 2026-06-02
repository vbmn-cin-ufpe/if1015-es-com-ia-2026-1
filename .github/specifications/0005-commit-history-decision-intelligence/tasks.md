# Tasks Spec 0005 - Commit History Decision Intelligence

## Metadata
- Plan ID: SPEC-0005-TASKS
- Parent: SPEC-0005-DES
- Owner: CodeCompass Team
- Status: ready

## Work Breakdown

### Phase 1 - Commit Ingestion and Classification
- [ ] TASK-001 Implement commit ingestion pipeline from git history.
- [ ] TASK-002 Implement touched-module extraction from file changes.
- [ ] TASK-003 Implement decision category classifier with confidence output.

### Phase 2 - Timeline and Why Services
- [ ] TASK-004 Implement module linkage and timeline entry generation.
- [ ] TASK-005 Implement timeline filtering/sorting service.
- [ ] TASK-006 Implement why explanation orchestration using timeline evidence.

### Phase 3 - Persistence and API
- [ ] TASK-007 Implement decision repository and timeline persistence adapters.
- [ ] TASK-008 Add timeline retrieval endpoint.
- [ ] TASK-009 Add why explanation endpoint.
- [ ] TASK-010 Implement request/response schema validation and error handling.

### Phase 4 - Web Presentation
- [ ] TASK-011 Add timeline view with module/category filters.
- [ ] TASK-012 Add why-question interaction view and evidence list.
- [ ] TASK-013 Integrate frontend services with history API endpoints.

### Phase 5 - Quality Gates
- [ ] TASK-014 Add unit tests for classifier and timeline ordering.
- [ ] TASK-015 Add integration tests for ingestion-to-timeline flow.
- [ ] TASK-016 Add e2e test for timeline + why-question flow.
- [ ] TASK-017 Validate dockerized execution path for history feature.

## Definition of Done
- [ ] RQ-001 to RQ-009 mapped to implemented tasks.
- [ ] Timeline generated with module-linked commit decisions.
- [ ] Why endpoint returns grounded explanations with commit references.
- [ ] Unit, integration, and e2e tests pass.