# Requirements Spec 0002 - Repository Indexing and RAG Chat

## Metadata
- Spec ID: SPEC-0002-REQ
- Parent: SPEC-0002
- Version: 1.0
- Status: draft

## Requirement Catalog

### RQ-001 Repository registration
- Type: functional
- Priority: must
- Description: System must receive a repository URL and create an indexing record.
- Acceptance Test: POST request creates repository/job metadata with initial status.

### RQ-002 Python-only ingestion
- Type: functional
- Priority: must
- Description: Ingestion must process Python files only in this scope.
- Acceptance Test: Non-Python files are ignored in chunk pipeline.

### RQ-003 Chunking and embedding
- Type: functional
- Priority: must
- Description: Parsed content must be split into chunks and embedded.
- Acceptance Test: Chunks receive vector representations and metadata.

### RQ-004 Vector persistence
- Type: functional
- Priority: must
- Description: Embedded chunks must be stored in ChromaDB by repository namespace.
- Acceptance Test: Retrieval query returns top-k chunks from stored vectors.

### RQ-005 Retrieval-augmented chat
- Type: functional
- Priority: must
- Description: Chat pipeline must retrieve context before generation.
- Acceptance Test: Chat response includes evidence of retrieved context IDs.

### RQ-006 Source-grounded response
- Type: functional
- Priority: must
- Description: Chat response must include source references with file path and snippet metadata.
- Acceptance Test: Response schema has answer plus ordered list of sources.

### RQ-007 Layer boundary compliance
- Type: non-functional
- Priority: must
- Description: Controllers must orchestrate services; services invoke infrastructure adapters only.
- Acceptance Test: No direct controller access to infrastructure clients.

### RQ-008 Test pyramid coverage
- Type: non-functional
- Priority: must
- Description: Implement unit, integration, and end-to-end tests for critical flow.
- Acceptance Test: Three test levels run successfully from root commands.

### RQ-009 Dockerized run path
- Type: non-functional
- Priority: must
- Description: Flow must run in Docker-based local environment.
- Acceptance Test: Services and dependencies start using compose configuration.

## Traceability Matrix
| Requirement | Source | Design Element | Test Case |
|---|---|---|---|
| RQ-001 | FR-001 | Repo controller/service | API create repo test |
| RQ-002 | FR-002 | Ingestion service | Ingestion filtering test |
| RQ-003 | FR-003 | Chunk+embedding service | Embedding pipeline test |
| RQ-004 | FR-003 | Chroma adapter | Chroma integration test |
| RQ-005 | FR-005 | Chat service orchestration | Chat integration test |
| RQ-006 | FR-006 | Response mapper | API response schema test |
| RQ-007 | NFR-002 | Layer rules | Architectural review/lint |
| RQ-008 | User constraints | Tests structure | CI test suite run |
| RQ-009 | User constraints | Docker compose | Compose smoke test |