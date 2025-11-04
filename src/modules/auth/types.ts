export interface UserResource {
  id: string;
  url: string;
  name: string;
  scopes: string[];
  avatarUrl: string;
}

export interface MeResponse {
  message: string;
  data: {
    account_id: string;
    name: string;
    email: string;
    picture: string;
    account_type: string;
    account_status: string;
    resources: UserResource[];
  };
}

export interface LogoutResponse {
  message: string;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}

export interface LoginInitResponse {
  message: string;
  authorization_url: string;
  state: string;
}

export interface StatusPendingResponse {
  status: "pending";
  message: string;
}

export interface StatusCompletedResponse {
  status: "completed";
  account_id: string;
  message: string;
}

export type StatusResponse = StatusPendingResponse | StatusCompletedResponse;

export interface RefreshTokenResponse {
  token: string;
  refresh_token: string;
  message: string;
}

export enum ServiceName {
  KYG = "kyg",
  JIRA = "jira",
  CONFLUENCE = "confluence",
  BITBUCKET = "bitbucket",
}

export interface ConnectResponse {
  service: ServiceName;
  session_id: string;
  authorization_url: string;
  state: string;
  message: string;
  session_reset?: boolean;
}

export interface ServiceConnectionInfo {
  connected: boolean;
  user?: {
    account_id?: string;
    name?: string;
    email?: string;
    username?: string;
    display_name?: string;
    picture?: string;
    avatar_url?: string;
    account_type?: string;
    account_status?: string;
    [key: string]: unknown;
  };
  metadata?: {
    url?: string;
    workspace_id?: string;
    [key: string]: unknown;
  };
}

export interface ConnectionsStatusResponse {
  connections: Record<string, ServiceConnectionInfo>;
}

export interface DisconnectResponse {
  service: ServiceName;
  connected: boolean;
  message: string;
}
