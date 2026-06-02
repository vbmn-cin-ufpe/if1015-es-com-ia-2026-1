# Tasks Spec 0003 - Guided Tour for Critical Modules

## Metadata
- Plan ID: SPEC-0003-TASKS
- Parent: SPEC-0003-DES
- Owner: CodeCompass Team
- Status: ready

## Work Breakdown

### Phase 1 - Metrics and Scoring
- [ ] TASK-001 Implement complexity metrics extraction adapter.
- [ ] TASK-002 Implement churn extraction adapter from git history.
- [ ] TASK-003 Implement coupling proxy extraction adapter.
- [ ] TASK-004 Implement normalized weighted scoring service.

### Phase 2 - Ranking and Tour Generation
- [ ] TASK-005 Implement module ranking and top-k selection service.
- [ ] TASK-006 Implement tour generation service with ordered steps.
- [ ] TASK-007 Implement step rationale and source reference mapper.

### Phase 3 - Persistence and API
- [ ] TASK-008 Implement tour repository adapter and schemas.
- [ ] TASK-009 Add create/list/get tour endpoints in controller layer.
- [ ] TASK-010 Wire tour service orchestration and error handling.

### Phase 4 - Web Presentation
- [ ] TASK-011 Add tours list screen for repository context.
- [ ] TASK-012 Add step-by-step tour viewer with references.
- [ ] TASK-013 Add UI controls for top-k and score weights.

### Phase 5 - Quality Gates
- [ ] TASK-014 Add unit tests for scoring and ranking determinism.
- [ ] TASK-015 Add integration tests for generation and persistence.
- [ ] TASK-016 Add e2e test for generate-and-navigate flow.
- [ ] TASK-017 Validate dockerized execution for the full flow.

## Definition of Done
- [ ] RQ-001 to RQ-009 mapped to implemented tasks.
- [ ] Guided tour generated from one indexed Python repository.
- [ ] Tour steps contain rationale and source references.
- [ ] Unit, integration, and e2e tests pass.