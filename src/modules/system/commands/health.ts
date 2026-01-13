import * as p from "@clack/prompts";
import pc from "picocolors";
import { Logger } from "../../../core/logger.js";
import { apiFetch } from "../../../core/apiClient.js";
import { ServerStatus } from "../types.js";
import { createTable } from "../../../core/table.js";
import { SUPPORTED_SERVICES } from "../../auth/utils/service.js";
import { ServiceName } from "../../auth/types.js";
import { getServiceDisplayName } from "../../auth/utils/service.js";
import { authClient } from "../../auth/authClient.js";

function getStatusIcon(connected: boolean): string {
  return connected ? pc.green("●") : pc.red("○");
}

function getStatusColor(connected: boolean): (text: string) => string {
  return connected ? pc.green : pc.red;
}

export async function healthCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  const outputJson = options.json === true || options.json === "true";
  const serverName = options.server as string | undefined;

  try {
    if (!authClient.isAuthenticated()) {
      Logger.error("Not authenticated. Please run 'kay connect' to login.");
      process.exit(1);
    }

    const s = p.spinner();
    s.start("Checking server status...");

    try {
      if (serverName) {
        const normalized = serverName.toLowerCase() as ServiceName;
        if (!SUPPORTED_SERVICES.includes(normalized)) {
          throw new Error(
            `Invalid server name: ${serverName}. Supported: ${SUPPORTED_SERVICES.join(
              ", "
            )}`
          );
        }

        const response = await apiFetch(`/mcp/servers/${normalized}/status`);

        if (!response.ok) {
          throw new Error(
            `Failed to get server status: ${response.status} ${response.statusText}`
          );
        }

        const data = (await response.json()) as ServerStatus;
        s.stop();

        if (outputJson) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log("");
          console.log(
            pc.dim(`💚 MCP Server: ${getServiceDisplayName(normalized)}`)
          );
          console.log("");
          console.log(
            `  ${getStatusIcon(data.connected)} ${pc.dim(
              "Status:"
            )} ${getStatusColor(data.connected)(
              data.connected ? "Connected" : "Not Connected"
            )}`
          );
          console.log(
            `  ${pc.dim("Tools:")} ${pc.cyan(`${data.tools.length} available`)}`
          );
          console.log("");

          if (data.tools.length > 0) {
            const rows = data.tools.map((t) => [
              t.name,
              t.description || pc.gray("-"),
            ]);
            console.log(
              createTable(["Name", "Description"], rows, {
                colWidths: [30, 40],
              })
            );
            console.log("");
          }
        }
      } else {
        const statuses: Record<string, ServerStatus> = {};

        for (const service of SUPPORTED_SERVICES) {
          try {
            const response = await apiFetch(`/mcp/servers/${service}/status`);
            if (response.ok) {
              statuses[service] = (await response.json()) as ServerStatus;
            } else {
              statuses[service] = {
                serverName: service,
                connected: false,
                tools: [],
              };
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
          console.log(JSON.stringify(statuses, null, 2));
        } else {
          console.log("");
          console.log(pc.dim("💚 MCP Server Status:"));
          console.log("");

          const serviceRows: string[][] = [];

          for (const service of SUPPORTED_SERVICES) {
            const status = statuses[service];
            const displayName = getServiceDisplayName(service);
            const statusIcon = getStatusIcon(status.connected);
            const statusText = getStatusColor(status.connected)(
              status.connected ? "Connected" : "Not Connected"
            );
            const toolsCount = pc.cyan(`${status.tools.length} tools`);

            serviceRows.push([
              displayName,
              statusIcon + " " + statusText,
              toolsCount,
            ]);
          }

          console.log(
            createTable(["Server", "Status", "Tools"], serviceRows, {
              colWidths: [20, 25, 20],
            })
          );
          console.log("");

          for (const service of SUPPORTED_SERVICES) {
            const status = statuses[service];
            if (status.tools.length > 0) {
              console.log(
                pc.dim(`🔧 ${getServiceDisplayName(service)} Tools:`)
              );
              console.log("");
              const rows = status.tools.map((t) => [
                t.name,
                t.description || pc.gray("-"),
              ]);
              console.log(
                createTable(["Name", "Description"], rows, {
                  colWidths: [30, 40],
                })
              );
              console.log("");
            }
          }
        }
      }
    } catch (error) {
      s.stop();
      throw error;
    }
  } catch (error) {
    Logger.error((error as Error).message);
    process.exit(1);
  }
}
