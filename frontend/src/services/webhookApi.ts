import { httpGet, httpPost, httpDelete } from "../infrastructure/http";
import { useAuthStore } from "../store/authStore";

function authHeader(): Record<string, string> {
    const token = useAuthStore.getState().token;
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}

export interface WebhookRecord {
    id: string;
    repository_id: string;
    repository_url: string;
    provider: string;
    active: boolean;
    created_at: string;
    last_triggered_at?: string | null;
}

export interface WebhookCreated extends WebhookRecord {
    secret: string;
}

export async function listWebhooks(): Promise<WebhookRecord[]> {
    return httpGet<WebhookRecord[]>("/api/admin/webhooks", {
        headers: authHeader(),
    });
}

export async function createWebhook(
    repository_id: string,
    repository_url: string,
    provider = "github",
): Promise<WebhookCreated> {
    return httpPost<WebhookCreated>(
        "/api/admin/webhooks",
        { repository_id, repository_url, provider },
        { headers: authHeader() },
    );
}

export async function deleteWebhook(webhookId: string): Promise<void> {
    await httpDelete(`/api/admin/webhooks/${webhookId}`, {
        headers: authHeader(),
    });
}

export function getWebhookUrl(webhookId: string): string {
    return `/api/webhooks/github/${webhookId}`;
}
