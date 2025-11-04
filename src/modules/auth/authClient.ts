import { ConfigManager } from "../../core/configManager.js";
import { RefreshTokenResponse } from "./types.js";

const BACKEND_URL = "http://localhost:4000";

interface SessionCredentials {
  session_id: string;
  token: string;
  refreshToken: string;
  accountId: string;
}

export class AuthClient {
  private credentials: SessionCredentials | null = null;

  constructor() {
    const config = ConfigManager.load();
    if (
      config.session_id &&
      config.token &&
      config.refresh_token &&
      config.account_id
    ) {
      this.credentials = {
        session_id: config.session_id as string,
        token: config.token as string,
        refreshToken: config.refresh_token as string,
        accountId: config.account_id as string,
      };
    }
  }

  getSessionId(): string | null {
    if (this.credentials?.session_id) {
      return this.credentials.session_id;
    }
    return ConfigManager.get("session_id") as string | null;
  }

  private getSessionToken(): string {
    if (!this.credentials) {
      throw new Error("Not authenticated. Connect a service first.");
    }
    return this.credentials.token;
  }

  private getRefreshToken(): string {
    if (!this.credentials) {
      throw new Error("Not authenticated. Connect a service first.");
    }
    return this.credentials.refreshToken;
  }

  async refreshToken(): Promise<boolean> {
    if (!this.credentials) {
      return false;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: this.getRefreshToken(),
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as RefreshTokenResponse;

      this.credentials = {
        ...this.credentials,
        token: data.token,
        refreshToken: data.refresh_token,
      };

      ConfigManager.set("token", data.token);
      ConfigManager.set("refresh_token", data.refresh_token);

      return true;
    } catch {
      return false;
    }
  }

  async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.getSessionToken()}`,
        Accept: "application/json",
      },
    });

    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${this.getSessionToken()}`,
            Accept: "application/json",
          },
        });
      } else {
        throw new Error(
          "Session expired and refresh failed. Please reconnect a service."
        );
      }
    }

    return response;
  }

  updateSessionId(sessionId: string): void {
    ConfigManager.set("session_id", sessionId);
    if (this.credentials) {
      this.credentials.session_id = sessionId;
    } else {
      // Initialize credentials with empty values if session_id is set but credentials don't exist yet
      this.credentials = {
        session_id: sessionId,
        token: "",
        refreshToken: "",
        accountId: "",
      };
    }
  }

  saveSession(
    sessionId: string,
    token: string,
    refreshToken: string,
    accountId: string
  ): void {
    this.credentials = {
      session_id: sessionId,
      token,
      refreshToken,
      accountId,
    };

    ConfigManager.set("session_id", sessionId);
    ConfigManager.set("token", token);
    ConfigManager.set("refresh_token", refreshToken);
    ConfigManager.set("account_id", accountId);
  }

  isAuthenticated(): boolean {
    return this.credentials !== null;
  }

  getCredentials(): SessionCredentials | null {
    return this.credentials;
  }
}

export const authClient = new AuthClient();
