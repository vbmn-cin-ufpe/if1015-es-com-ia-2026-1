import { env } from "./env"
import { useAuthStore } from "../store/authStore"

function bearerHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = useAuthStore.getState().token
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

export async function httpGet<T>(path: string, options?: { headers?: Record<string, string> }): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    headers: bearerHeaders(options?.headers),
  })
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return (await response.json()) as T
}

export async function httpPost<T>(path: string, body: unknown, options?: { headers?: Record<string, string> }): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...bearerHeaders(options?.headers) },
    body: JSON.stringify(body)
  })
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return (await response.json()) as T
}

export async function httpDelete<T = unknown>(path: string, options?: { headers?: Record<string, string> }): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: "DELETE",
    headers: bearerHeaders(options?.headers),
  })
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return (await response.json()) as T
}

export async function httpPatch<T>(path: string, body: unknown, options?: { headers?: Record<string, string> }): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...bearerHeaders(options?.headers) },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return (await response.json()) as T
}

export const http = {
  get: httpGet,
  post: httpPost,
  delete: httpDelete,
  patch: httpPatch,
}