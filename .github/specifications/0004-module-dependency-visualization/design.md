# Design Spec 0004 - Module Dependency Visualization

## Metadata
- Spec ID: SPEC-0004-DES
- Parent: SPEC-0004-REQ
- Version: 1.0
- Status: draft

## Architecture Overview
Implement dependency graph generation and visualization in the existing monolith layers, reusing repository artifacts from indexing.

## Backend Layer Components

### controllers
- dependency_graph_controller
  - get_graph(repository_id, snapshot_id)
  - get_module_details(repository_id, module_path)

### services
- dependency_extractor_service
  - parses imports and module relations
- graph_assembler_service
  - normalizes nodes/edges and computes metadata
- graph_service
  - orchestrates generation, retrieval, and caching decisions

### infrastructure
- parser_adapter
  - AST-based extraction for Python imports
- graph_repository_adapter
  - persist/retrieve graph snapshots
- metadata_repository_adapter
  - repository snapshot and version context

## Frontend Web Presentation
- dependency graph page in web presentation layer
- graph canvas component for node/edge rendering
- side panel for selected module details
- search and filter controls for graph refinement

## Data Contracts
- GraphNode
  - id
  - label
  - module_path
  - metrics
- GraphEdge
  - id
  - source
  - target
  - type
- GraphPayload
  - repository_id
  - snapshot_id
  - nodes[]
  - edges[]

## API Contracts
- GET /api/repos/{repository_id}/dependency-graph
  - Query: snapshot_id(optional)
  - Response: GraphPayload
- GET /api/repos/{repository_id}/modules/{module_path}/dependencies
  - Response: module metadata + inbound/outbound dependencies

## Error Handling
- Repository not indexed: return actionable error.
- Snapshot unavailable: return not found with guidance.
- Parse failures: partial graph with warnings when safe.

## Testing Design
- Unit
  - import parsing normalization
  - graph assembler schema and dedup rules
- Integration
  - extraction + persistence + retrieval flow
  - API contract validation
- End-to-end
  - load graph in UI, search module, inspect dependencies

## Principle Gates
- YAGNI: only static import-based dependency graph in this increment.
- KISS: single graph payload format.
- DRY: shared node/edge mappers reused by API and UI.

## Rollout Plan
- Step 1: implement extractor and assembler services.
- Step 2: implement graph API endpoints and persistence.
- Step 3: implement web visualization page and interactions.
- Step 4: add tests and validate dockerized flow.