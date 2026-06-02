# Spec Request 0002 - Repository Indexing and RAG Chat

## Metadata
- Spec ID: SPEC-0002
- Feature Name: Repository indexing and contextual chat via RAG
- Author: CodeCompass Team
- Date: 2026-05-17
- Status: draft

## Context
After defining the monolith foundation, the first product flow must demonstrate practical onboarding value: indexing a Python repository and answering developer questions with contextual retrieval.

## Problem Statement
New developers spend too much time locating relevant files and understanding module intent. Manual navigation creates delay and dependency on senior developers.

## Objectives
- Allow users to submit a Git repository URL for indexing.
- Build searchable semantic context from repository content.
- Provide chat answers grounded in retrieved repository chunks.

## Non-Objectives
- Multi-language indexing in this increment.
- Pull request deep analysis in this increment.
- Personalized onboarding journeys by role in this increment.

## Target Users
- New developers onboarding into a codebase.
- Tech leads supporting onboarding.

## User Scenarios
1. Index repository
   - Given a valid public repository URL
   - When the user starts indexing
   - Then the system stores semantic chunks and marks repository ready

2. Ask contextual question
   - Given an indexed repository
   - When the user asks a codebase question
   - Then the system returns an answer with contextual grounding

## Functional Requirements
- FR-001: Accept repository URL and create indexing job.
- FR-002: Clone/fetch repository and process Python files.
- FR-003: Generate embeddings and persist vectors in ChromaDB.
- FR-004: Store repository/job metadata in PostgreSQL when required.
- FR-005: Expose chat endpoint that performs retrieval before generation.
- FR-006: Return answer payload with references to retrieved sources.

## Non-Functional Requirements
- NFR-001: Follow YAGNI, KISS, DRY.
- NFR-002: Keep layer boundaries and low coupling.
- NFR-003: Containerized execution through Docker.
- NFR-004: Answers should return within practical MVP latency targets.

## Acceptance Criteria
- [ ] Repository indexing flow works end-to-end for a Python repo.
- [ ] Chat endpoint returns grounded responses from indexed content.
- [ ] Vector data persists in ChromaDB collections.
- [ ] Unit, integration, and e2e tests exist for this flow.

## Open Questions
- Which embedding provider/model will be used in MVP.
- Whether indexing runs sync or async by default.