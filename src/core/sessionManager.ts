import fs from "fs";
import os from "os";
import path from "path";

const SESSION_DIR = path.join(os.homedir(), ".kay");
const SESSION_FILE = path.join(SESSION_DIR, "session.json");

export interface SessionData {
  access_token: string;
}

export function loadSession(): SessionData | null {
  if (!fs.existsSync(SESSION_FILE)) {
    return null;
  }

  try {
    const content = fs.readFileSync(SESSION_FILE, "utf8");
    const data = JSON.parse(content) as SessionData;

    if (!data.access_token) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function saveSession(sessionData: SessionData): void {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
  fs.chmodSync(SESSION_FILE, 0o600);
}

export function clearSession(): void {
  if (fs.existsSync(SESSION_FILE)) {
    fs.unlinkSync(SESSION_FILE);
  }
}
