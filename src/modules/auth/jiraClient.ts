import { ConfigManager } from "../../core/configManager.js";

interface JiraCredentials {
  accessToken?: string;
  email?: string;
  apiToken?: string;
  refreshToken?: string;
  baseUrl: string;
  expiresAt?: number;
  authType: "basic" | "oauth";
}

interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
}

export class JiraClient {
  private credentials: JiraCredentials | null = null;

  constructor() {
    const creds = ConfigManager.get("jira") as JiraCredentials | undefined;
    if (
      creds &&
      creds.baseUrl &&
      (creds.accessToken || (creds.email && creds.apiToken))
    ) {
      this.credentials = creds;
    }
  }

  private getAuthHeader(): string {
    if (!this.credentials) {
      throw new Error("Not authenticated. Run 'kay login' first.");
    }
    if (
      this.credentials.authType === "basic" &&
      this.credentials.email &&
      this.credentials.apiToken
    ) {
      const auth = Buffer.from(
        `${this.credentials.email}:${this.credentials.apiToken}`
      ).toString("base64");
      return `Basic ${auth}`;
    }
    if (this.credentials.accessToken) {
      return `Bearer ${this.credentials.accessToken}`;
    }
    throw new Error("Invalid credentials");
  }

  async exchangeCodeForToken(
    code: string,
    redirectUri: string,
    clientId: string,
    codeVerifier: string,
    baseUrl: string
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  }> {
    const tokenUrl = new URL("/rest/oauth2/latest/token", baseUrl).toString();

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Token exchange failed: ${response.status} ${response.statusText} - ${error}`
      );
    }

    return (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };
  }

  async getMyself(): Promise<JiraUser> {
    if (!this.credentials) {
      throw new Error("Not authenticated. Run 'kay login' first.");
    }

    const apiUrl = new URL(
      "/rest/api/3/myself",
      this.credentials.baseUrl
    ).toString();

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: this.getAuthHeader(),
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          "Invalid or expired credentials. Run 'kay login' to re-authenticate."
        );
      }
      throw new Error(
        `Request failed: ${response.status} ${response.statusText}`
      );
    }

    return (await response.json()) as JiraUser;
  }

  saveCredentials(
    accessToken: string,
    baseUrl: string,
    refreshToken?: string,
    expiresIn?: number
  ): void {
    const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : undefined;

    this.credentials = {
      accessToken,
      refreshToken,
      baseUrl,
      expiresAt,
      authType: "oauth",
    };

    ConfigManager.set("jira", this.credentials);
  }

  saveCredentialsWithBasicAuth(
    email: string,
    apiToken: string,
    baseUrl: string
  ): void {
    this.credentials = {
      email,
      apiToken,
      baseUrl,
      authType: "basic",
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

  getBaseUrl(): string | null {
    return this.credentials?.baseUrl || null;
  }

  getCredentials(): JiraCredentials | null {
    return this.credentials;
  }
}
