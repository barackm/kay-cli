import { apiFetch } from "../../../core/apiClient.js";
import {
  ServiceName,
  ServerStatusResponse,
  ConnectRequest,
  ConnectResponse,
} from "../types.js";

export async function checkServiceConnectionStatus(
  service: ServiceName
): Promise<boolean> {
  try {
    const statusResponse = await apiFetch(`/mcp/servers/${service}/status`);

    if (statusResponse.ok) {
      const statusData = (await statusResponse.json()) as ServerStatusResponse;
      return statusData.connected === true;
    }
  } catch {
    return false;
  }

  return false;
}

export async function connectToServer(
  serverName: ServiceName,
  env?: Record<string, string>
): Promise<ConnectResponse> {
  const requestBody: ConnectRequest = env ? { env } : {};

  const connectResponse = await apiFetch(`/mcp/connect/${serverName}`, {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  if (!connectResponse.ok) {
    const errorData = (await connectResponse.json().catch(() => ({}))) as {
      error?: string;
    };
    const errorMessage =
      errorData.error ||
      `Failed to connect: ${connectResponse.status} ${connectResponse.statusText}`;
    throw new Error(errorMessage);
  }

  return (await connectResponse.json()) as ConnectResponse;
}

export async function getServerStatus(
  serverName: ServiceName
): Promise<ServerStatusResponse> {
  const response = await apiFetch(`/mcp/servers/${serverName}/status`);

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      errorData.error ||
        `Failed to get server status: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as ServerStatusResponse;
}
