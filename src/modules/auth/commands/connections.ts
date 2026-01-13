import * as p from "@clack/prompts";
import pc from "picocolors";
import boxen from "boxen";
import { Logger } from "../../../core/logger.js";
import { ServiceName, ServerStatusResponse } from "../types.js";
import { apiFetch } from "../../../core/apiClient.js";
import { createTable } from "../../../core/table.js";
import { SUPPORTED_SERVICES, getServiceDisplayName } from "../utils/service.js";
import { authClient } from "../authClient.js";

function getStatusDisplay(status: boolean): string {
  return status ? pc.green("Connected") : pc.gray("Not connected");
}

function formatTools(tools: ServerStatusResponse["tools"]): string {
  if (!tools || tools.length === 0) {
    return pc.gray("-");
  }
  return pc.cyan(`${tools.length} tool${tools.length !== 1 ? "s" : ""}`);
}

export async function connectionsCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  try {
    const outputJson = options.json === true || options.json === "true";

    if (!authClient.isAuthenticated()) {
      Logger.warn("Not authenticated. Please run 'kay connect' to login.");
      console.log("");

      const headers = ["Service", "Status", "Tools"];
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

    const statuses: Record<string, ServerStatusResponse> = {};

    for (const service of SUPPORTED_SERVICES) {
      try {
        const response = await apiFetch(`/mcp/servers/${service}/status`);
        if (response.ok) {
          statuses[service] = (await response.json()) as ServerStatusResponse;
        }
      } catch {
        statuses[service] = {
          serverName: service,
          connected: false,
          tools: [],
        };
      }
    }

    s.stop();

    if (outputJson) {
      const result = SUPPORTED_SERVICES.map((service) => {
        const status = statuses[service];
        return {
          service,
          displayName: getServiceDisplayName(service),
          connected: status?.connected === true,
          tools: status?.tools || [],
        };
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log("");
    const headers = ["Service", "Status", "Tools"];
    const rows = SUPPORTED_SERVICES.map((service) => {
      const displayName = getServiceDisplayName(service);
      const status = statuses[service];
      const isConnected = status?.connected === true;
      const statusDisplay = getStatusDisplay(isConnected);
      const toolsDisplay = formatTools(status?.tools);
      return [displayName, statusDisplay, toolsDisplay];
    });

    const table = createTable(headers, rows, {
      colWidths: [20, 20, 40],
    });

    console.log(
      boxen(table, {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "cyan",
        title: pc.bold(pc.cyan("MCP Server Connections")),
      })
    );
    console.log("");
  } catch (error) {
    p.cancel((error as Error).message);
    process.exit(1);
  }
}
