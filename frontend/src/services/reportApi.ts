import { httpGet } from "../infrastructure/http";

/**
 * Returns the API URL for the HTML report — open it in a new tab.
 * No fetch needed; the browser handles it directly.
 */
export function getReportUrl(repositoryId: string): string {
  return `/api/repos/${repositoryId}/report`;
}

/**
 * Fetch the report HTML as a string (alternative to opening in new tab).
 */
export async function fetchReport(repositoryId: string): Promise<string> {
  return httpGet<string>(`/api/repos/${repositoryId}/report`);
}
