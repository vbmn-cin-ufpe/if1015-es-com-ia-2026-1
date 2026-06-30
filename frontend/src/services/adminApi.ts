import { httpGet, httpPatch } from "../infrastructure/http";
import { useAuthStore } from "../store/authStore";

export interface UserSummary {
    user_id: string;
    email: string;
    role: string;
    plan: string;
    email_verified: boolean;
    repos_indexed_count: number;
    questions_asked_count: number;
    created_at?: string;
    deleted_at?: string;
}

export interface UserListResponse {
    total: number;
    users: UserSummary[];
}

export interface AdminStats {
    total_users: number;
    by_plan: Record<string, number>;
    by_role: Record<string, number>;
    total_repos_indexed: number;
    total_questions_asked: number;
}

export interface UpdateUserRequest {
    role?: string;
    plan?: string;
    email_verified?: boolean;
}

function authHeader(): Record<string, string> {
    const token = useAuthStore.getState().token;
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}

export async function listUsers(options?: {
    plan?: string;
    role?: string;
    includeDeleted?: boolean;
}): Promise<UserListResponse> {
    const params = new URLSearchParams();
    if (options?.plan) params.set("plan", options.plan);
    if (options?.role) params.set("role", options.role);
    if (options?.includeDeleted) params.set("include_deleted", "true");
    const qs = params.toString() ? `?${params}` : "";
    return httpGet<UserListResponse>(`/api/admin/users${qs}`, {
        headers: authHeader(),
    });
}

export async function getAdminUser(userId: string): Promise<UserSummary> {
    return httpGet<UserSummary>(`/api/admin/users/${userId}`, {
        headers: authHeader(),
    });
}

export async function updateAdminUser(
    userId: string,
    body: UpdateUserRequest,
): Promise<UserSummary> {
    const { env } = await import("../infrastructure/env");
    const resp = await fetch(`${env.apiBaseUrl}/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error(await resp.text());
    return resp.json();
}

export async function deleteAdminUser(
    userId: string,
): Promise<{ deleted: boolean; user_id: string }> {
    const { env } = await import("../infrastructure/env");
    const resp = await fetch(`${env.apiBaseUrl}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: authHeader(),
    });
    if (!resp.ok) throw new Error(await resp.text());
    return resp.json();
}

export async function resetUserPassword(
    userId: string,
): Promise<{ message: string }> {
    const { env } = await import("../infrastructure/env");
    const resp = await fetch(
        `${env.apiBaseUrl}/api/admin/users/${userId}/reset-password`,
        {
            method: "POST",
            headers: authHeader(),
        },
    );
    if (!resp.ok) throw new Error(await resp.text());
    return resp.json();
}

export async function getAdminStats(): Promise<AdminStats> {
    return httpGet<AdminStats>("/api/admin/stats", { headers: authHeader() });
}

// ── Repository health ─────────────────────────────────────────────────────────

export interface RepoHealthRecord {
    repository_id: string;
    repository_url: string;
    status: string;
    chunk_count: number;
    file_count: number;
    created_at?: string;
    updated_at?: string;
    error_message?: string;
}

export interface ReposHealthResponse {
    total: number;
    by_status: Record<string, number>;
    repositories: RepoHealthRecord[];
}

export async function getReposHealth(): Promise<ReposHealthResponse> {
    return httpGet<ReposHealthResponse>("/api/admin/repos/health", {
        headers: authHeader(),
    });
}

// ── Usage dashboard ───────────────────────────────────────────────────────────

export interface UsageDailyBucket {
    date: string;
    event_count: number;
    unique_repos: number;
}

export interface UsageSummary {
    total_events: number;
    total_sessions: number;
    by_event_type: Record<string, number>;
    daily_buckets: UsageDailyBucket[];
}

export async function getUsageDashboard(days = 30): Promise<UsageSummary> {
    return httpGet<UsageSummary>(`/api/admin/usage?days=${days}`, {
        headers: authHeader(),
    });
}

// ── LLM feedback evaluation ───────────────────────────────────────────────────

export interface FeedbackRecord {
    feedback_id: string;
    repository_id: string;
    response_id: string;
    usefulness_score: number;
    correctness_score: number;
    thumbs_up: boolean;
    comment: string;
    timestamp: string;
}

export interface LlmFeedbackResponse {
    total: number;
    positive: number;
    negative: number;
    positive_rate: number;
    avg_usefulness: number;
    avg_correctness: number;
    records: FeedbackRecord[];
}

export async function getLlmFeedback(days = 30): Promise<LlmFeedbackResponse> {
    return httpGet<LlmFeedbackResponse>(
        `/api/admin/llm-feedback?days=${days}`,
        { headers: authHeader() },
    );
}

// ── LLM Cost Monitor ─────────────────────────────────────────────────────────

export interface LlmCostRecord {
    id: string;
    user_id: string;
    endpoint: string;
    repository_id: string;
    provider: string;
    model: string;
    tokens_in: number;
    tokens_out: number;
    cost_usd: number;
    timestamp: string;
}

export interface LlmCostSummary {
    total_cost_usd: number;
    total_tokens_in: number;
    total_tokens_out: number;
    total_calls: number;
    by_provider: Record<string, number>;
    by_day: Record<string, number>;
    monthly_projection_usd: number;
    recent: LlmCostRecord[];
}

export async function getLlmCosts(days = 30): Promise<LlmCostSummary> {
    return httpGet<LlmCostSummary>(`/api/admin/llm-costs?days=${days}`, {
        headers: authHeader(),
    });
}

// ── Ingestion Queue ───────────────────────────────────────────────────────────

export interface IngestionQueueItem {
    repository_id: string;
    repository_url: string;
    status: string;
    progress_pct: number;
    current_step: string;
    created_at?: string;
    updated_at?: string;
    error_message?: string;
}

export interface IngestionQueueResponse {
    total: number;
    active: number;
    items: IngestionQueueItem[];
}

export async function getIngestionQueue(): Promise<IngestionQueueResponse> {
    return httpGet<IngestionQueueResponse>("/api/admin/ingestion-queue", {
        headers: authHeader(),
    });
}

// ── Plan Limits Management ────────────────────────────────────────────────────

export interface PlanLimit {
    plan: string;
    max_repos: number;
    max_questions: number;
    can_delete_repo: boolean;
}

export async function getPlanLimits(): Promise<PlanLimit[]> {
    return httpGet<PlanLimit[]>("/api/admin/plans", { headers: authHeader() });
}

export async function updatePlanLimit(
    plan: string,
    body: {
        max_repos: number;
        max_questions: number;
        can_delete_repo: boolean;
    },
): Promise<PlanLimit> {
    return httpPatch<PlanLimit>(`/api/admin/plans/${plan}`, body, {
        headers: authHeader(),
    });
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export interface AuditEntry {
    id: string;
    user_id: string;
    user_email: string;
    action: string;
    resource_type: string;
    resource_id: string;
    ip: string;
    extra: string;
    timestamp: string;
}

export interface AuditLogResponse {
    total: number;
    entries: AuditEntry[];
}

export async function getAuditLog(
    params: {
        user_id?: string;
        action?: string;
        resource_type?: string;
        days?: number;
        limit?: number;
    } = {},
): Promise<AuditLogResponse> {
    const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
        .join("&");
    return httpGet<AuditLogResponse>(
        `/api/admin/audit-log${qs ? "?" + qs : ""}`,
        { headers: authHeader() },
    );
}
