Siga p# Tasks Spec 0007 - Authentication and Onboarding Sessions

## Metadata
- Plan ID: SPEC-0007-TASKS
- Parent: SPEC-0007-DES
- Owner: CodeCompass Team
- Status: ready

## Work Breakdown

### Phase 1 - Authentication Foundation
- [ ] TASK-001 Implement signup/signin/signout endpoints.
- [ ] TASK-002 Implement auth service and credential validation.
- [ ] TASK-003 Implement auth guard/middleware for protected routes.

### Phase 2 - Session Lifecycle
- [ ] TASK-004 Implement onboarding session create/list/resume/close services.
- [ ] TASK-005 Implement session state transition rules.
- [ ] TASK-006 Implement session persistence adapters.

### Phase 3 - Progress Persistence
- [ ] TASK-007 Implement session checkpoint persistence model.
- [ ] TASK-008 Integrate checkpoint updates in core onboarding features.
- [ ] TASK-009 Implement restore flow for resumed sessions.

### Phase 4 - Web Presentation
- [ ] TASK-010 Implement signin/signup pages.
- [ ] TASK-011 Implement session list and resume UX.
- [ ] TASK-012 Implement active session context in onboarding UI.

### Phase 5 - Quality Gates
- [ ] TASK-013 Add unit tests for auth and session rules.
- [ ] TASK-014 Add integration tests for protected endpoints and lifecycle.
- [ ] TASK-015 Add e2e test for login and session resume flow.
- [ ] TASK-016 Validate dockerized execution for auth/session feature.

## Definition of Done
- [ ] RQ-001 to RQ-009 mapped to implemented tasks.
- [ ] Authenticated users can create/resume/close onboarding sessions.
- [ ] Session checkpoints persist and restore correctly.
- [ ] Unit, integration, and e2e tests pass.