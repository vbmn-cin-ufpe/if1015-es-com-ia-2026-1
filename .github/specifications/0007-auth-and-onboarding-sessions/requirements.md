# Requirements Spec 0007 - Authentication and Onboarding Sessions

## Metadata
- Spec ID: SPEC-0007-REQ
- Parent: SPEC-0007
- Version: 1.0
- Status: draft

## Requirement Catalog

### RQ-001 User authentication
- Type: functional
- Priority: must
- Description: System must provide basic signup/signin/signout capabilities.
- Acceptance Test: Valid users can authenticate and receive session/token context.

### RQ-002 Protected access
- Type: functional
- Priority: must
- Description: Onboarding APIs must require authenticated access.
- Acceptance Test: Unauthenticated requests to protected endpoints are rejected.

### RQ-003 Session creation
- Type: functional
- Priority: must
- Description: System must create onboarding sessions scoped to user and repository.
- Acceptance Test: Session create endpoint returns session_id and initial status.

### RQ-004 Session lifecycle
- Type: functional
- Priority: must
- Description: System must support list, resume, and close operations for sessions.
- Acceptance Test: Session status transitions are valid and queryable.

### RQ-005 Session progress persistence
- Type: functional
- Priority: must
- Description: System must persist progress checkpoints across onboarding flows.
- Acceptance Test: Reopened session restores latest checkpoint state.

### RQ-006 Web session UX
- Type: functional
- Priority: should
- Description: Frontend should provide auth screens and session management views.
- Acceptance Test: User can sign in and resume an existing session from UI.

### RQ-007 Layer compliance
- Type: non-functional
- Priority: must
- Description: Controllers orchestrate services; services depend on infrastructure adapters only.
- Acceptance Test: No direct controller access to auth/storage clients.

### RQ-008 Security baseline
- Type: non-functional
- Priority: must
- Description: Session/token handling must follow secure defaults.
- Acceptance Test: Sensitive tokens are not exposed in logs or unsafe storage.

### RQ-009 Test pyramid
- Type: non-functional
- Priority: must
- Description: Add unit, integration, and end-to-end tests for auth/session flows.
- Acceptance Test: Three test levels run successfully from root commands.

## Traceability Matrix
| Requirement | Source | Design Element | Test Case |
|---|---|---|---|
| RQ-001 | FR-001 | Auth service/controller | Auth API test |
| RQ-002 | FR-002 | Auth middleware/guards | Protected route test |
| RQ-003 | FR-003 | Session service | Session create test |
| RQ-004 | FR-005 | Session lifecycle service | State transition test |
| RQ-005 | FR-004 | Session repository adapter | Resume checkpoint test |
| RQ-006 | FR-005 | Web auth/session screens | UI auth/session test |
| RQ-007 | NFR-002 | Layer rules | Architecture review/lint |
| RQ-008 | NFR-003 | Token/session security controls | Security handling test |
| RQ-009 | NFR-004 | Test suites | CI test run |