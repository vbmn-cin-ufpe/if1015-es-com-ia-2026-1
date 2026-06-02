# Design Spec 0007 - Authentication and Onboarding Sessions

## Metadata
- Spec ID: SPEC-0007-DES
- Parent: SPEC-0007-REQ
- Version: 1.0
- Status: draft

## Architecture Overview
Introduce authentication and user-scoped onboarding sessions in the monolith with secure access boundaries and persistent progress state.

## Backend Layer Components

### controllers
- auth_controller
  - signup
  - signin
  - signout
- session_controller
  - create_session
  - list_sessions
  - resume_session
  - close_session

### services
- auth_service
  - validates credentials and issues auth context
- access_guard_service
  - enforces protected endpoint access
- onboarding_session_service
  - handles session lifecycle and progress checkpoints
- session_progress_service
  - updates/restores progress state across features

### infrastructure
- auth_provider_adapter
  - token/session issuance and validation
- user_repository_adapter
  - user profile persistence
- onboarding_session_repository_adapter
  - session and checkpoint persistence
- secure_storage_adapter
  - secure storage abstraction for sensitive values

## Data Model
- user
  - id
  - email
  - created_at
  - status
- onboarding_session
  - id
  - user_id
  - repository_id
  - status
  - started_at
  - updated_at
- session_checkpoint
  - id
  - session_id
  - feature
  - checkpoint_payload
  - timestamp

## API Contracts
- POST /api/auth/signup
- POST /api/auth/signin
- POST /api/auth/signout
- POST /api/sessions
- GET /api/sessions
- POST /api/sessions/{session_id}/resume
- POST /api/sessions/{session_id}/close

## Security Design
- Auth required for onboarding endpoints.
- Token/session material never logged.
- Expiration and invalidation path for sessions/tokens.
- Basic brute-force safeguards for auth attempts.

## Frontend Web Presentation
- authentication screens (signin/signup)
- session list and resume action
- active session indicator in onboarding flows

## Error Handling
- Invalid credentials: consistent auth error response.
- Expired session: require re-authentication.
- Missing session: not found with actionable message.

## Testing Design
- Unit
  - auth validation logic
  - session state transition rules
- Integration
  - auth endpoints with protected routes
  - session lifecycle persistence
- End-to-end
  - sign in, create session, resume session, continue flow

## Principle Gates
- YAGNI: basic auth only in this increment.
- KISS: single user-session model.
- DRY: shared auth/session guards and response mappers.

## Rollout Plan
- Step 1: implement auth endpoints and guard.
- Step 2: implement session lifecycle APIs.
- Step 3: integrate progress checkpoints.
- Step 4: implement frontend auth/session flows.
- Step 5: add tests and validate dockerized execution.