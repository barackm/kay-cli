import { loadSession, clearSession } from "./sessionManager.js";

const BASE_URL = "http://localhost:3000";

export interface ApiError {
  code?: string;
  message?: string;
  error?: string;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const session = loadSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 || res.status === 403) {
    clearSession();
    throw new Error(
      "⚠️  Authentication failed. Please run 'kay login' to authenticate."
    );
  }

  return res;
}
