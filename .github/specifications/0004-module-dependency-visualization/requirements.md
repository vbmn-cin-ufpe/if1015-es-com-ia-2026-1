# Requirements Spec 0004 - Module Dependency Visualization

## Metadata
- Spec ID: SPEC-0004-REQ
- Parent: SPEC-0004
- Version: 1.0
- Status: draft

## Requirement Catalog

### RQ-001 Dependency extraction
- Type: functional
- Priority: must
- Description: System must extract module-level dependencies from Python repository artifacts.
- Acceptance Test: Extractor outputs normalized edges source_module -> target_module.

### RQ-002 Graph assembly
- Type: functional
- Priority: must
- Description: System must build graph payload with nodes, edges, and module metadata.
- Acceptance Test: Graph payload validates against defined schema.

### RQ-003 Graph persistence
- Type: functional
- Priority: should
- Description: System should persist graph snapshots keyed by repository and index version.
- Acceptance Test: Snapshot can be fetched without recomputation.

### RQ-004 Graph API
- Type: functional
- Priority: must
- Description: API must provide endpoints to retrieve graph and module detail data.
- Acceptance Test: Endpoints return consistent schema and status codes.

### RQ-005 Interactive visualization
- Type: functional
- Priority: must
- Description: Frontend must render dependency graph and support node selection.
- Acceptance Test: Selecting a node shows inbound/outbound dependencies and metadata.

### RQ-006 Search and filter
- Type: functional
- Priority: should
- Description: Frontend should allow searching modules and filtering edges.
- Acceptance Test: Search/filter operations update visible subgraph deterministically.

### RQ-007 Layer compliance
- Type: non-functional
- Priority: must
- Description: Controllers orchestrate services; services depend on infrastructure adapters.
- Acceptance Test: No direct controller access to parser/database clients.

### RQ-008 Determinism baseline
- Type: non-functional
- Priority: should
- Description: Given same repository snapshot, generated graph must be reproducible.
- Acceptance Test: Repeat generation yields equivalent node/edge set.

### RQ-009 Test pyramid
- Type: non-functional
- Priority: must
- Description: Add unit, integration, and end-to-end tests for dependency graph flow.
- Acceptance Test: Three test levels run via root commands.

## Traceability Matrix
| Requirement | Source | Design Element | Test Case |
|---|---|---|---|
| RQ-001 | FR-001 | Dependency extractor service | Extractor unit test |
| RQ-002 | FR-001 | Graph assembler service | Schema validation test |
| RQ-003 | FR-002 | Graph repository adapter | Snapshot persistence test |
| RQ-004 | FR-003 | Graph controllers | API contract test |
| RQ-005 | FR-004 | Web graph presentation | UI interaction test |
| RQ-006 | FR-004 | Search/filter component | UI state test |
| RQ-007 | NFR-002 | Layer rules | Architecture review/lint |
| RQ-008 | NFR-003 | Graph generation config | Reproducibility test |
| RQ-009 | NFR-004 | Test suites | CI test run |