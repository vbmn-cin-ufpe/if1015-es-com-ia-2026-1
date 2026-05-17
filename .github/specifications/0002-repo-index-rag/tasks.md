# Tasks Spec 0002 - Repository Indexing and RAG Chat

## Metadata
- Plan ID: SPEC-0002-TASKS
- Parent: SPEC-0002-DES
- Owner: CodeCompass Team
- Status: ready

## Work Breakdown

### Phase 1 - API and Metadata Baseline
- [ ] TASK-001 Add repository index request endpoint in controllers.
- [ ] TASK-002 Implement repo service validation and job creation.
- [ ] TASK-003 Add repository/index status persistence in infrastructure adapters.

### Phase 2 - Ingestion and Vectorization
- [ ] TASK-004 Implement git fetch/clone adapter and Python file filtering.
- [ ] TASK-005 Implement chunking service with stable metadata schema.
- [ ] TASK-006 Implement embedding service and Chroma upsert path.
- [ ] TASK-007 Add indexing status transitions and failure handling.

### Phase 3 - Chat RAG
- [ ] TASK-008 Add chat ask endpoint in controllers.
- [ ] TASK-009 Implement retrieval service top-k query in Chroma.
- [ ] TASK-010 Implement chat service orchestration with llm client.
- [ ] TASK-011 Implement source-grounded response payload mapper.

### Phase 4 - Web Presentation
- [ ] TASK-012 Add repository submission UI flow.
- [ ] TASK-013 Add chat UI flow bound to repository context.
- [ ] TASK-014 Add API client services and request state handling.

### Phase 5 - Quality and Operations
- [ ] TASK-015 Add unit tests for services and mappers.
- [ ] TASK-016 Add integration tests for indexing and chat APIs.
- [ ] TASK-017 Add end-to-end test for full onboarding flow.
- [ ] TASK-018 Validate docker compose path for backend/frontend/dependencies.

## Definition of Done
- [ ] RQ-001 to RQ-009 mapped to implemented tasks.
- [ ] End-to-end flow works for one public Python repository.
- [ ] Chat response includes source references.
- [ ] Unit, integration, and e2e tests pass.
- [ ] Dockerized execution path validated.