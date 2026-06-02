import { env } from "./env"

export async function httpGet<T>(path: string, options?: { headers?: Record<string, string> }): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    headers: options?.headers,
  })
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return (await response.json()) as T
}

export async function httpPost<T>(path: string, body: unknown, options?: { headers?: Record<string, string> }): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(body)
  })
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return (await response.json()) as T
}

export const http = {
  get: httpGet,
  post: httpPost,
}