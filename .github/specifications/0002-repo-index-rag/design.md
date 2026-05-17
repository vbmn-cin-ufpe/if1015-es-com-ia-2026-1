# Design Spec 0002 - Repository Indexing and RAG Chat

## Metadata
- Spec ID: SPEC-0002-DES
- Parent: SPEC-0002-REQ
- Version: 1.0
- Status: draft

## Architecture Overview
Implement indexing and RAG chat inside the monolith baseline with strict layer separation and minimal complexity.

## Backend Layer Components

### controllers
- repo_controller: create repository indexing job and query status.
- chat_controller: receive question and return grounded response.

### services
- repo_service: validate URL and orchestrate indexing.
- ingestion_service: clone/fetch repository and select Python files.
- chunking_service: split code into chunks with metadata.
- embedding_service: generate vectors for chunks.
- retrieval_service: query ChromaDB for relevant chunks.
- chat_service: orchestrate retrieval + generation + response mapping.

### infrastructure
- git_client: repository cloning/fetch operations.
- chroma_adapter: upsert/query vector data.
- postgres_adapter: repository and indexing metadata storage.
- llm_client: answer generation from prompt and retrieved context.

## Frontend Web Presentation Components
- pages for repository submission and chat interaction.
- services for API calls to backend endpoints.
- infrastructure for HTTP client and runtime config.

## Data Flow
1. User submits repository URL.
2. repo_controller calls repo_service.
3. repo_service triggers ingestion/chunk/embedding pipeline.
4. Vectorized chunks are written to ChromaDB namespace.
5. Metadata is updated in PostgreSQL if relational persistence is used.
6. User asks question in chat.
7. chat_service retrieves top-k chunks from ChromaDB.
8. llm_client generates answer using retrieved context.
9. chat_controller returns answer plus source references.

## API Contracts
- POST /api/repos/index
  - Request: repository_url
  - Response: repository_id, job_status
- GET /api/repos/{repository_id}/status
  - Response: repository_id, index_status, stats
- POST /api/chat/ask
  - Request: repository_id, question
  - Response: answer, sources[]

## Error Handling
- Invalid URL: validation error.
- Clone failure: indexing status failed with reason.
- Embedding/chroma failure: retry policy with bounded attempts.
- Missing index: chat request rejected with actionable message.

## Testing Design
- Unit: URL validation, chunking logic, response mapping.
- Integration: indexing pipeline with Chroma and metadata storage.
- E2E: submit repository then ask question and validate sources.

## Principle Gates
- YAGNI: Python-only ingestion in this increment.
- KISS: single indexing pipeline without workflow engine.
- DRY: shared chunk metadata mapper and response schema mapper.

## Rollout Plan
- Step 1: implement indexing endpoint and metadata status.
- Step 2: implement chunk/embedding/chroma path.
- Step 3: implement chat retrieval and source-grounded response.
- Step 4: wire frontend flow for indexing and chat.
- Step 5: add test suites and docker run path checks.