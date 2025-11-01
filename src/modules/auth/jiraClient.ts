import { ConfigManager } from "../../core/configManager.js";
import { MeResponse, RefreshTokenResponse } from "./types.js";

const BACKEND_URL = "http://localhost:4000";

interface SessionCredentials {
  token: string;
  refreshToken: string;
  accountId: string;
}

export class JiraClient {
  private credentials: SessionCredentials | null = null;

  constructor() {
    const creds = ConfigManager.get("jira") as SessionCredentials | undefined;
    if (creds && creds.token && creds.refreshToken) {
      this.credentials = creds;
    }
  }

  private getSessionToken(): string {
    if (!this.credentials) {
      throw new Error("Not authenticated. Run 'kay login' first.");
    }
    return this.credentials.token;
  }

  private getRefreshToken(): string {
    if (!this.credentials) {
      throw new Error("Not authenticated. Run 'kay login' first.");
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
        token: data.token,
        refreshToken: data.refresh_token,
        accountId: this.credentials.accountId,
      };

      ConfigManager.set("jira", this.credentials);
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
          "Session expired and refresh failed. Run 'kay login' to re-authenticate."
        );
      }
    }

    return response;
  }

  async getMyself(): Promise<MeResponse> {
    if (!this.credentials) {
      throw new Error("Not authenticated. Run 'kay login' first.");
    }

    const response = await this.makeAuthenticatedRequest(
      `${BACKEND_URL}/auth/me`
    );

    if (!response.ok) {
      throw new Error(
        `Request failed: ${response.status} ${response.statusText}`
      );
    }

    return (await response.json()) as MeResponse;
  }

  saveSession(token: string, refreshToken: string, accountId: string): void {
    this.credentials = {
      token,
      refreshToken,
      accountId,
    };

    ConfigManager.set("jira", this.credentials);
  }

  clearCredentials(): void {
    this.credentials = null;
    ConfigManager.delete("jira");
  }

  isAuthenticated(): boolean {
    return this.credentials !== null;
  }

  getAccountId(): string | null {
    return this.credentials?.accountId || null;
  }

  getCredentials(): SessionCredentials | null {
    return this.credentials;
  }
}
