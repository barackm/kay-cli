import fs from "fs";
import os from "os";
import path from "path";

const SESSION_DIR = path.join(os.homedir(), ".kay");
const SESSION_FILE = path.join(SESSION_DIR, "session.json");

export interface SessionData {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  session_id?: string; // Optional: session_id if returned by backend
}

export function loadSession(): SessionData | null {
  if (!fs.existsSync(SESSION_FILE)) {
    return null;
  }

  try {
    const content = fs.readFileSync(SESSION_FILE, "utf8");
    const data = JSON.parse(content) as SessionData;
    
    // Validate required fields
    if (!data.access_token || !data.refresh_token || !data.expires_at) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function saveSession(sessionData: SessionData): void {
  // Ensure directory exists
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  // Write session file with 600 permissions (owner read/write only)
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
  fs.chmodSync(SESSION_FILE, 0o600);
}

export function clearSession(): void {
  if (fs.existsSync(SESSION_FILE)) {
    fs.unlinkSync(SESSION_FILE);
  }
}

export function isSessionExpired(session: SessionData | null): boolean {
  if (!session || !session.expires_at) {
    return true;
  }

  const expiresAt = new Date(session.expires_at);
  const now = new Date();
  
  return now >= expiresAt;
}

