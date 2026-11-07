const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
let getAuthToken: (() => Promise<string | null>) | null = null

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export function setAuthTokenGetter(getter: (() => Promise<string | null>) | null) {
  getAuthToken = getter
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const guestToken = headers.get('X-Guest-Token')
  const authToken = getAuthToken ? await getAuthToken() : null
  headers.set('Content-Type', 'application/json')
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`)
  if (guestToken) headers.set('X-Guest-Token', guestToken)
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  })
  const body = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(body?.error ?? `API request failed: ${response.status}`, response.status)
  }
  return body as T
}
