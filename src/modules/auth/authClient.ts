import { ConfigManager } from "../../core/configManager.js";
import { saveSession, loadSession } from "../../core/sessionManager.js";
import { LoginRequest, LoginResponse } from "./types.js";

const BACKEND_URL = "http://localhost:3000";

export class AuthClient {
  async login(email: string, password: string): Promise<LoginResponse> {
    const requestBody: LoginRequest = { email, password };

    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(errorData.error || "Login failed");
    }

    const data = (await response.json()) as LoginResponse;

    saveSession({ access_token: data.token });

    return data;
  }

  isAuthenticated(): boolean {
    const session = loadSession();
    return session !== null && !!session.access_token;
  }

  getToken(): string | null {
    const session = loadSession();
    return session?.access_token || null;
  }
}

export const authClient = new AuthClient();
