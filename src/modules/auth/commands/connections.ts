import * as p from "@clack/prompts";
import pc from "picocolors";
import { Logger } from "../../../core/logger.js";
import {
  ServiceName,
  ConnectionsStatusResponse,
  ServiceConnectionInfo,
} from "../types.js";
import { ConfigManager } from "../../../core/configManager.js";
import { apiFetch } from "../../../core/apiClient.js";
import { createTable } from "../../../core/table.js";

const SUPPORTED_SERVICES: ServiceName[] = [
  ServiceName.KYG,
  ServiceName.JIRA,
  ServiceName.CONFLUENCE,
  ServiceName.BITBUCKET,
];

function getServiceDisplayName(service: ServiceName): string {
  const names: Record<ServiceName, string> = {
    [ServiceName.KYG]: "KYG Trade",
    [ServiceName.JIRA]: "Jira",
    [ServiceName.CONFLUENCE]: "Confluence",
    [ServiceName.BITBUCKET]: "Bitbucket",
  };
  return names[service] || service;
}

function getStatusDisplay(status: boolean): string {
  return status ? pc.green("Connected") : pc.gray("Not connected");
}

function formatUserInfo(user?: ServiceConnectionInfo["user"]): string {
  if (!user) {
    return pc.gray("-");
  }

  const parts: string[] = [];
  if (user.name) parts.push(user.name);
  if (user.email && user.email !== user.name) parts.push(`(${user.email})`);

  return parts.length > 0 ? parts.join(" ") : pc.gray("-");
}

export async function connectionsCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  try {
    const sessionId = ConfigManager.get("session_id") as string | null;
    const outputJson = options.json === true || options.json === "true";

    if (!sessionId) {
      Logger.warn(
        "No active session found. Connect a service first with 'kay connect -s <service>'."
      );
      console.log("");

      // Show all services as not connected when no session
      const headers = ["Service", "Status", "User"];
      const rows = SUPPORTED_SERVICES.map((service) => {
        const displayName = getServiceDisplayName(service);
        const status = getStatusDisplay(false);
        return [displayName, status, pc.gray("-")];
      });

      const table = createTable(headers, rows, {
        colWidths: [20, 20, 40],
      });

      console.log(table);
      console.log("");
      return;
    }

    const s = p.spinner();
    s.start("Fetching connection status...");

    const response = await apiFetch(`/connections?session_id=${sessionId}`);

    s.stop();

    if (!response.ok) {
      throw new Error(
        `Failed to fetch connection status: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as ConnectionsStatusResponse;
    const connections = data.connections;

    if (outputJson) {
      const result = SUPPORTED_SERVICES.map((service) => {
        const conn = connections[service];
        return {
          service,
          displayName: getServiceDisplayName(service),
          connected: conn?.connected === true,
          user: conn?.user,
          metadata: conn?.metadata,
        };
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log("");
    console.log(pc.bold(pc.cyan("Service Connections")));
    console.log("");

    const headers = ["Service", "Status", "User"];
    const rows = SUPPORTED_SERVICES.map((service) => {
      const displayName = getServiceDisplayName(service);
      const conn = connections[service];
      const isConnected = conn?.connected === true;
      const status = getStatusDisplay(isConnected);
      const userInfo = formatUserInfo(conn?.user);
      return [displayName, status, userInfo];
    });

    const table = createTable(headers, rows, {
      colWidths: [20, 20, 40],
    });

    console.log(table);
    console.log("");
  } catch (error) {
    // Error handling is done by apiFetch
    p.cancel((error as Error).message);
    process.exit(1);
  }
}
