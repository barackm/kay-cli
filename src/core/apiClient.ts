import {
  loadSession,
  saveSession,
  clearSession,
  SessionData,
} from "./sessionManager.js";
import { ConfigManager } from "./configManager.js";

const BASE_URL = "http://localhost:4000";

export enum ErrorCode {
  TOKEN_MISSING = "TOKEN_MISSING",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  TOKEN_INVALID = "TOKEN_INVALID",
}

let refreshPromise: Promise<boolean> | null = null;

async function initSession(): Promise<SessionData> {
  const res = await fetch(`${BASE_URL}/session/init`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to initialize session: ${res.status} ${res.statusText}`
    );
  }

  const raw = (await res.json()) as Record<string, unknown>;
  const mapped: SessionData = {
    access_token: (raw.session_token as string) || (raw.token as string) || "",
    refresh_token: (raw.refresh_token as string) || "",
    expires_at: (raw.expires_at as string) || "",
    session_id: raw.session_id as string | undefined,
  };

  saveSession(mapped);

  if (mapped.session_id) {
    ConfigManager.set("session_id", mapped.session_id);
  }

  return mapped;
}

async function refreshSession(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const session = loadSession();
      if (!session?.refresh_token) {
        return false;
      }

      const res = await fetch(`${BASE_URL}/session/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });

      if (!res.ok) {
        return false;
      }

      const raw = (await res.json()) as Record<string, unknown>;
      const mapped: SessionData = {
        access_token:
          (raw.session_token as string) || (raw.token as string) || "",
        refresh_token: (raw.refresh_token as string) || "",
        expires_at: (raw.expires_at as string) || "",
        session_id: raw.session_id as string | undefined,
      };

      saveSession(mapped);

      // If session_id is returned, update ConfigManager
      if (mapped.session_id) {
        ConfigManager.set("session_id", mapped.session_id);
      }

      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export interface ApiError {
  code?: string;
  message?: string;
  error?: string;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<Response> {
  const MAX_RETRIES = 1; // Only allow one retry per request

  // Reload session to get latest token
  const session = loadSession();

  // Prepare headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Add Authorization header if we have a token
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  // Make the request
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Handle auth errors
  if (res.status === 401 || res.status === 403) {
    // Prevent infinite loops
    if (retryCount >= MAX_RETRIES) {
      clearSession();
      throw new Error(
        "⚠️  Authentication failed after retry. Please run 'kay connect' to reconnect."
      );
    }

    let body: ApiError = {};
    try {
      body = (await res.json().catch(() => ({}))) as ApiError;
    } catch {
      // If we can't parse the error, treat as generic auth error
    }

    const errorCode = (body.code || body.error || "") as ErrorCode | string;

    switch (errorCode) {
      case ErrorCode.TOKEN_MISSING:
        // Initialize new session
        try {
          const newSessionData = await initSession();

          // Reload session to get the new token before retry
          const newSession = loadSession();
          if (!newSession?.access_token) {
            clearSession();
            throw new Error(
              "Failed to initialize session. Please run 'kay connect' to authenticate."
            );
          }

          // Update path if it contains session_id query param
          // Use the session_id from ConfigManager (which was just updated by initSession)
          let updatedPath = path;
          if (path.includes("session_id=")) {
            const url = new URL(path, `http://dummy${BASE_URL}`);
            const currentSessionId = ConfigManager.get("session_id") as
              | string
              | null;

            if (currentSessionId) {
              // Use the session_id from ConfigManager (set by initSession)
              url.searchParams.set("session_id", currentSessionId);
            } else {
              // Remove session_id if none available - Bearer token should be sufficient
              url.searchParams.delete("session_id");
            }
            updatedPath = url.pathname + url.search;
          }

          // Retry the request once with new token
          return apiFetch(updatedPath, options, retryCount + 1);
        } catch (error) {
          clearSession();
          if (error instanceof Error) {
            // If it's our error about init failing, throw it as-is
            if (error.message.includes("Failed to initialize session")) {
              throw error;
            }
            // If it's an error from the retry (like auth failed after retry), throw it
            if (error.message.includes("Authentication failed after retry")) {
              throw error;
            }
          }
          throw new Error(
            "Failed to initialize session. Please run 'kay connect' to authenticate."
          );
        }

      case ErrorCode.TOKEN_EXPIRED:
        // Try to refresh the session
        const refreshed = await refreshSession();
        if (!refreshed) {
          clearSession();
          throw new Error(
            "⚠️  Your session has expired or been revoked. Please run 'kay connect' again."
          );
        }
        // Reload session to get the new token before retry
        const refreshedSession = loadSession();
        if (!refreshedSession?.access_token) {
          clearSession();
          throw new Error(
            "⚠️  Session refresh failed. Please run 'kay connect' again."
          );
        }

        // Update path if it contains session_id query param and refresh returned a new session_id
        // Note: refresh typically doesn't change session_id, but we handle it if it does
        let refreshedPath = path;
        if (refreshedSession.session_id && path.includes("session_id=")) {
          const currentSessionId = ConfigManager.get("session_id") as
            | string
            | null;
          if (
            currentSessionId &&
            currentSessionId !== refreshedSession.session_id
          ) {
            const url = new URL(path, `http://dummy${BASE_URL}`);
            url.searchParams.set("session_id", refreshedSession.session_id);
            refreshedPath = url.pathname + url.search;
          }
        }

        // Retry the request once after refresh
        return apiFetch(refreshedPath, options, retryCount + 1);

      case ErrorCode.TOKEN_INVALID:
        clearSession();
        throw new Error(
          "⚠️  Invalid or revoked session. Please run 'kay connect' to reconnect."
        );

      default:
        // Generic auth error - try to init if we have no token
        if (retryCount === 0 && !session?.access_token) {
          // If we have no token and got 401, try to init
          try {
            const newSessionData = await initSession();

            // Update path if needed
            let updatedPath = path;
            if (path.includes("session_id=")) {
              const url = new URL(path, `http://dummy${BASE_URL}`);
              if (newSessionData.session_id) {
                url.searchParams.set("session_id", newSessionData.session_id);
              } else {
                url.searchParams.delete("session_id");
              }
              updatedPath = url.pathname + url.search;
            }

            return apiFetch(updatedPath, options, retryCount + 1);
          } catch (initError) {
            // If init fails, throw the original error
            clearSession();
          }
        }
        clearSession();
        const errorMessage =
          body.message || body.error || "Authorization failed.";
        throw new Error(errorMessage);
    }
  }

  return res;
}
