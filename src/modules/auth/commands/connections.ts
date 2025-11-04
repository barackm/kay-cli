import * as p from "@clack/prompts";
import pc from "picocolors";
import { Logger } from "../../../core/logger.js";
import { ServiceName, ConnectionsStatusResponse } from "../types.js";
import { authClient } from "../authClient.js";
import { createTable } from "../../../core/table.js";

const BACKEND_URL = "http://localhost:4000";

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

export async function connectionsCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  try {
    const sessionId = authClient.getSessionId();
    const outputJson = options.json === true || options.json === "true";

    if (!sessionId) {
      Logger.warn(
        "No active session found. Connect a service first with 'kay connect -s <service>'."
      );
      console.log("");

      // Show all services as not connected when no session
      const headers = ["Service", "Status"];
      const rows = SUPPORTED_SERVICES.map((service) => {
        const displayName = getServiceDisplayName(service);
        const status = getStatusDisplay(false);
        return [displayName, status];
      });

      const table = createTable(headers, rows, {
        colWidths: [20, 20],
      });

      console.log(table);
      console.log("");
      return;
    }

    const s = p.spinner();
    s.start("Fetching connection status...");

    const response = await fetch(
      `${BACKEND_URL}/connections?session_id=${sessionId}`
    );

    s.stop();

    if (!response.ok) {
      throw new Error(
        `Failed to fetch connection status: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as ConnectionsStatusResponse;
    const connections = data.connections;

    if (outputJson) {
      const result = SUPPORTED_SERVICES.map((service) => ({
        service,
        displayName: getServiceDisplayName(service),
        connected: connections[service] === true,
      }));
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log("");
    console.log(pc.bold(pc.cyan("Service Connections")));
    console.log("");

    const headers = ["Service", "Status"];
    const rows = SUPPORTED_SERVICES.map((service) => {
      const displayName = getServiceDisplayName(service);
      const isConnected = connections[service] === true;
      const status = getStatusDisplay(isConnected);
      return [displayName, status];
    });

    const table = createTable(headers, rows, {
      colWidths: [20, 20],
    });

    console.log(table);
    console.log("");
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("fetch failed") ||
        error.message.includes("ECONNREFUSED"))
    ) {
      Logger.error(
        `Cannot connect to Kay backend at ${BACKEND_URL}. Make sure the backend is running.`
      );
    } else {
      p.cancel((error as Error).message);
    }
    process.exit(1);
  }
}
