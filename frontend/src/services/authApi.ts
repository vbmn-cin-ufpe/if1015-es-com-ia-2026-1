import { httpGet, httpPost } from "../infrastructure/http";

// ── Response types ─────────────────────────────────────────────────────────

export interface AuthResponse {
  user_id: string;
  email: string;
  token: string;
  role: string;
  plan: string;
  email_verified: boolean;
}

export interface MeResponse {
  user_id: string;
  email: string;
  role: string;
  plan: string;
  email_verified: boolean;
  repos_indexed_count: number;
  questions_asked_count: number;
}

export interface SessionInfo {
  id: string;
  user_id: string;
  repository_id: string;
  status: string;
  started_at: string;
  updated_at: string;
}

export interface Checkpoint {
  id: string;
  session_id: string;
  feature: string;
  checkpoint_payload: Record<string, unknown>;
  timestamp: string;
}

// ── Auth endpoints ──────────────────────────────────────────────────────────

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function signup(
  email: string,
  password: string,
  plan = "free",
): Promise<AuthResponse> {
  return httpPost("/api/auth/signup", { email, password, plan });
}

export async function signin(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return httpPost("/api/auth/signin", { email, password });
}

export async function signout(token: string): Promise<void> {
  await httpPost("/api/auth/signout", {}, { headers: authHeaders(token) });
}

export async function getMe(token: string): Promise<MeResponse> {
  return httpGet("/api/auth/me", { headers: authHeaders(token) });
}

export async function verifyEmail(token: string): Promise<{ verified: boolean; message: string }> {
  return httpGet(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
}

export async function resendVerification(email: string): Promise<void> {
  await httpPost("/api/auth/resend-verification", { email });
}

export async function forgotPassword(email: string): Promise<void> {
  await httpPost("/api/auth/forgot-password", { email });
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  await httpPost("/api/auth/reset-password", { email, code, new_password: newPassword });
}

// ── Session endpoints ───────────────────────────────────────────────────────

export async function createSession(token: string, repositoryId: string): Promise<SessionInfo> {
  return httpPost("/api/sessions", { repository_id: repositoryId }, { headers: authHeaders(token) });
}

export async function listSessions(token: string): Promise<SessionInfo[]> {
  return httpGet("/api/sessions", { headers: authHeaders(token) });
}

export async function resumeSession(token: string, sessionId: string): Promise<SessionInfo> {
  return httpPost(`/api/sessions/${sessionId}/resume`, {}, { headers: authHeaders(token) });
}

export async function closeSession(token: string, sessionId: string): Promise<SessionInfo> {
  return httpPost(`/api/sessions/${sessionId}/close`, {}, { headers: authHeaders(token) });
}

export async function saveCheckpoint(
  token: string,
  sessionId: string,
  feature: string,
  payload: Record<string, unknown>,
): Promise<Checkpoint> {
  return httpPost(
    `/api/sessions/${sessionId}/checkpoints`,
    { feature, checkpoint_payload: payload },
    { headers: authHeaders(token) },
  );
}

export async function getCheckpoints(token: string, sessionId: string): Promise<Checkpoint[]> {
  return httpGet(`/api/sessions/${sessionId}/checkpoints`, { headers: authHeaders(token) });
}
