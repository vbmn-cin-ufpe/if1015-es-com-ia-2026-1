import { httpGet, httpPost, httpDelete } from "../infrastructure/http";
import { useAuthStore } from "../store/authStore";

function authHeader() {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface WatchEntry {
  id: string;
  repository_id: string;
  module_path: string;
  created_at: string;
}

export interface WatchStatus {
  watching: boolean;
  entry?: WatchEntry;
}

export async function watchModule(
  repositoryId: string,
  modulePath = ""
): Promise<WatchEntry> {
  return httpPost<WatchEntry>(
    `/api/repos/${repositoryId}/watch`,
    { module_path: modulePath },
    { headers: authHeader() }
  );
}

export async function unwatchModule(
  repositoryId: string,
  modulePath = ""
): Promise<void> {
  await httpDelete(
    `/api/repos/${repositoryId}/watch?module_path=${encodeURIComponent(modulePath)}`,
    { headers: authHeader() }
  );
}

export async function getWatchStatus(
  repositoryId: string,
  modulePath = ""
): Promise<WatchStatus> {
  return httpGet<WatchStatus>(
    `/api/repos/${repositoryId}/watch/status?module_path=${encodeURIComponent(modulePath)}`,
    { headers: authHeader() }
  );
}

export async function getMyWatchlist(): Promise<WatchEntry[]> {
  return httpGet<WatchEntry[]>("/api/me/watchlist", { headers: authHeader() });
}
