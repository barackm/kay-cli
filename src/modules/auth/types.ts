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
  token: string;
  refresh_token: string;
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
  authorization_url?: string;
  state?: string;
  message: string;
  session_reset?: boolean;
  connected?: boolean;
  // For email/password authentication (Kay service)
  token?: string;
  refresh_token?: string;
  account_id?: string;
}

export interface ConnectionsStatusResponse {
  connections: Record<string, boolean>;
}

export interface DisconnectResponse {
  service: ServiceName;
  connected: boolean;
  message: string;
}
