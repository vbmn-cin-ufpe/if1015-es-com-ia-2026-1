# Spec Request 0001 - Monolith Foundation

## Metadata
- Spec ID: SPEC-0001
- Feature Name: Monolith foundation and baseline architecture
- Author: CodeCompass Team
- Date: 2026-05-17
- Status: draft

## Context
The project is in initial validation stage and must prioritize delivery speed with maintainability. The team wants a monolith-first architecture with low coupling and clear layers.

## Problem Statement
Without a clear baseline architecture, the project risks overengineering, inconsistent layering, and slow onboarding. A single specification is needed to standardize structure, stack, and testing strategy.

## Objectives
- Define a monolith architecture with explicit layers: controllers, services, infrastructure, and web presentation
- Lock baseline stack for backend, frontend, databases, deployment, and containerization
- Define testing baseline: unit, integration, and end-to-end

## Non-Objectives
- Full clean architecture or hexagonal architecture implementation
- Microservices split in MVP
- Multi-cloud abstraction

## Target Users
- Developers implementing MVP
- Team leads reviewing architecture decisions

## Functional Requirements
- FR-001: Backend must use Python with FastAPI
- FR-002: Frontend must use React + TypeScript + Vite
- FR-003: ChromaDB must be used for vector retrieval
- FR-004: PostgreSQL can be used when relational persistence is required
- FR-005: The project must run with Docker for local and CI execution
- FR-006: Deployment target must support Supabase usage

## Non-Functional Requirements
- NFR-001: Keep architecture simple and incremental with YAGNI
- NFR-002: Keep implementation simple and readable with KISS
- NFR-003: Avoid repetition in modules and workflows with DRY
- NFR-004: Keep module coupling low by enforcing layer boundaries

## Acceptance Criteria
- [ ] Layered folder structure approved by team
- [ ] Core stack declared and reflected in design spec
- [ ] Testing pyramid strategy defined and traceable to requirements
- [ ] Handoff document constrains LLM implementation to requested principles

## Open Questions
- Which relational entities need PostgreSQL in first milestone
- Which E2E runner will be used for frontend flow validation