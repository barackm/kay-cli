export interface ServiceHealth {
  status: "healthy" | "unhealthy" | "disabled";
  message?: string;
  configured?: boolean;
  enabled?: boolean;
  connected?: boolean;
  initialized?: boolean;
  toolCount?: number;
}

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    database: {
      status: "healthy" | "unhealthy";
      message?: string;
    };
    openai: {
      status: "healthy" | "unhealthy";
      configured: boolean;
      message?: string;
    };
    mcp_jira: {
      status: "healthy" | "unhealthy" | "disabled";
      enabled: boolean;
      connected?: boolean;
      initialized?: boolean;
      toolCount?: number;
      message?: string;
    };
  };
}

