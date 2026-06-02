import { http } from "../infrastructure/http";

export interface AuthResponse {
  user_id: string;
  email: string;
  token: string;
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

export async function signup(email: string, password: string): Promise<AuthResponse> {
  return http.post("/api/auth/signup", { email, password });
}

export async function signin(email: string, password: string): Promise<AuthResponse> {
  return http.post("/api/auth/signin", { email, password });
}

export async function signout(token: string): Promise<void> {
  await http.post("/api/auth/signout", {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createSession(
  token: string,
  repositoryId: string
): Promise<SessionInfo> {
  return http.post(
    "/api/sessions",
    { repository_id: repositoryId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function listSessions(token: string): Promise<SessionInfo[]> {
  return http.get("/api/sessions", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function resumeSession(
  token: string,
  sessionId: string
): Promise<SessionInfo> {
  return http.post(
    `/api/sessions/${sessionId}/resume`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function closeSession(
  token: string,
  sessionId: string
): Promise<SessionInfo> {
  return http.post(
    `/api/sessions/${sessionId}/close`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function saveCheckpoint(
  token: string,
  sessionId: string,
  feature: string,
  payload: Record<string, unknown>
): Promise<Checkpoint> {
  return http.post(
    `/api/sessions/${sessionId}/checkpoints`,
    { feature, checkpoint_payload: payload },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function getCheckpoints(
  token: string,
  sessionId: string
): Promise<Checkpoint[]> {
  return http.get(`/api/sessions/${sessionId}/checkpoints`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
