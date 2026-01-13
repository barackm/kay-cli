export interface ServerStatus {
  serverName: string;
  connected: boolean;
  tools: Array<{
    name: string;
    description?: string | null;
    inputSchema?: unknown | null;
  }>;
}
