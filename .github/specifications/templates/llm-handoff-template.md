# LLM Handoff Template

## Objective
Implement the approved specification package exactly as defined for a monolith-first architecture.

## Inputs
- Request Spec:
- Requirements Spec:
- Design Spec:
- Implementation Plan:

## Mandatory Architecture Constraints
- Monolith-first implementation unless explicitly changed by the spec.
- Backend stack: Python + FastAPI.
- Frontend stack: React + TypeScript + Vite.
- Vector persistence: ChromaDB.
- Relational persistence: PostgreSQL only when needed by approved requirements.
- Deployment compatibility: Supabase integration points must be preserved.
- Runtime and local/CI execution must be Docker-compatible.
- Layering must follow low-coupling boundaries:
  - controllers
  - services
  - infrastructure
  - web presentation
- Respect dependency direction and avoid cross-layer shortcuts.

## Mandatory Engineering Principles
- YAGNI: do not implement speculative features.
- KISS: prefer the simplest implementation that satisfies requirements.
- DRY: remove or avoid duplicated logic and contracts.

## Mandatory Delivery Constraints
- Preserve existing behavior outside scope.
- Keep changes minimal and traceable.
- Implement requirements in requirement ID order.
- Add tests mapped to each requirement.
- Include unit, integration, and end-to-end coverage for implemented flows.
- Do not introduce undocumented dependencies.

## Required Output Format
1. Summary of implemented requirement IDs
2. Files changed
3. Test evidence
4. Principle checks (YAGNI, KISS, DRY)
5. Known limitations

## Execution Steps
1. Parse requirements and build traceability map.
2. Implement design components by layer boundary.
3. Implement tests at unit, integration, and end-to-end levels.
4. Validate dockerized execution path for changed components.
5. Run validation checklist and report evidence.

## Validation Gate
- [ ] RQ IDs implemented
- [ ] Tests passing (unit, integration, e2e)
- [ ] Docker execution path validated
- [ ] No out-of-scope changes
- [ ] Layer boundaries respected
- [ ] YAGNI, KISS, DRY checks acknowledged
- [ ] Security and performance checks acknowledged