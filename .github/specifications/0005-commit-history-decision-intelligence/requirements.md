# Requirements Spec 0005 - Commit History Decision Intelligence

## Metadata
- Spec ID: SPEC-0005-REQ
- Parent: SPEC-0005
- Version: 1.0
- Status: draft

## Requirement Catalog

### RQ-001 Commit ingestion
- Type: functional
- Priority: must
- Description: System must ingest commit metadata and file change sets for indexed repositories.
- Acceptance Test: Ingestion outputs commit_id, author/date metadata, message, and touched files.

### RQ-002 Decision signal extraction
- Type: functional
- Priority: must
- Description: System must extract decision signals and classify commits by decision category.
- Acceptance Test: Each analyzed commit receives category label and confidence score.

### RQ-003 Module linkage
- Type: functional
- Priority: must
- Description: System must map commits and decisions to impacted modules.
- Acceptance Test: Module query returns linked commit decisions.

### RQ-004 Timeline generation
- Type: functional
- Priority: must
- Description: System must generate ordered decision timeline per repository/module context.
- Acceptance Test: Timeline response is ordered and includes commit references.

### RQ-005 Why explanation endpoint
- Type: functional
- Priority: must
- Description: System must provide why explanations grounded in timeline and commit evidence.
- Acceptance Test: Why response includes explanation plus source commit identifiers.

### RQ-006 Web rationale presentation
- Type: functional
- Priority: should
- Description: Frontend should display timeline and why explanations with filters.
- Acceptance Test: User can select module and inspect timeline entries.

### RQ-007 Layer compliance
- Type: non-functional
- Priority: must
- Description: Controllers orchestrate services, services invoke infrastructure adapters only.
- Acceptance Test: No direct controller usage of git/parsing clients.

### RQ-008 Reproducibility baseline
- Type: non-functional
- Priority: should
- Description: With same repository snapshot and config, timeline output should be reproducible.
- Acceptance Test: Repeat generation yields equivalent ordered timeline.

### RQ-009 Test pyramid
- Type: non-functional
- Priority: must
- Description: Add unit, integration, and end-to-end tests for commit decision intelligence flow.
- Acceptance Test: Three test levels run successfully from root commands.

## Traceability Matrix
| Requirement | Source | Design Element | Test Case |
|---|---|---|---|
| RQ-001 | FR-001 | Commit ingestion service | Ingestion integration test |
| RQ-002 | FR-002 | Decision classifier service | Classifier unit test |
| RQ-003 | FR-003 | Module linkage service | Linkage integration test |
| RQ-004 | FR-003 | Timeline generator service | Timeline ordering test |
| RQ-005 | FR-004 | Why explanation service/controller | API contract test |
| RQ-006 | FR-005 | Web history presentation | UI interaction test |
| RQ-007 | NFR-002 | Layer rules | Architecture review/lint |
| RQ-008 | NFR-003 | Timeline config | Reproducibility test |
| RQ-009 | NFR-004 | Test suites | CI test run |