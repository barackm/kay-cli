export interface ErrorResponse {
  error: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    email: string;
    firstName: string;
    lastName: string;
    userid: number;
  };
}

export interface UserResponse {
  user: {
    id: string;
    email: string;
    externalUserId: number;
    createdAt: string;
  } | null;
}

export enum ServiceName {
  JIRA = "jira",
  BITBUCKET = "bitbucket",
  CONFLUENCE = "confluence",
  KYG_KMESH = "kyg-kmesh",
}

export interface ServerStatusResponse {
  serverName: string;
  connected: boolean;
  tools: Array<{
    name: string;
    description?: string | null;
    inputSchema?: unknown | null;
  }>;
}

export interface ConnectRequest {
  env?: Record<string, string>;
}

export interface ConnectResponse {
  message: string;
}

export interface DeleteResponse {
  message: string;
}
