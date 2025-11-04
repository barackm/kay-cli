import * as p from "@clack/prompts";
import pc from "picocolors";
import boxen from "boxen";
import { Logger } from "../../../core/logger.js";
import { authClient } from "../../auth/authClient.js";
import { HealthResponse } from "../types.js";
import { createTable } from "../../../core/table.js";

const BACKEND_URL = "http://localhost:4000";

function getStatusIcon(status: string): string {
  switch (status) {
    case "healthy":
      return pc.green("●");
    case "degraded":
      return pc.yellow("●");
    case "unhealthy":
      return pc.red("●");
    case "disabled":
      return pc.gray("○");
    default:
      return pc.gray("?");
  }
}

function getStatusColor(status: string): (text: string) => string {
  switch (status) {
    case "healthy":
      return pc.green;
    case "degraded":
      return pc.yellow;
    case "unhealthy":
      return pc.red;
    case "disabled":
      return pc.gray;
    default:
      return pc.white;
  }
}

export async function healthCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  const outputJson = options.json === true || options.json === "true";

  try {
    const s = p.spinner();
    s.start("Checking backend health...");

    let response: Response;

    if (authClient.isAuthenticated()) {
      response = await authClient.makeAuthenticatedRequest(
        `${BACKEND_URL}/health`
      );
    } else {
      response = await fetch(`${BACKEND_URL}/health`);
    }

    if (!response.ok) {
      throw new Error(
        `Health check failed: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as HealthResponse;
    s.stop();

    if (outputJson) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log("");
      console.log(
        boxen(
          pc.bold("Kay Backend Health Status") +
            "\n" +
            pc.gray(
              `Last checked: ${new Date(data.timestamp).toLocaleString()}`
            ),
          {
            padding: { left: 2, right: 2, top: 0, bottom: 0 },
            margin: { left: 2, right: 2 },
            borderColor:
              data.status === "healthy"
                ? "green"
                : data.status === "degraded"
                ? "yellow"
                : "red",
            borderStyle: "round",
          }
        )
      );

      console.log("");
      console.log(
        "  " +
          getStatusIcon(data.status) +
          " " +
          pc.bold("Overall Status: ") +
          getStatusColor(data.status)(data.status.toUpperCase())
      );
      console.log("");

      console.log(pc.bold("  Services:"));
      console.log("");

      const serviceRows: string[][] = [];

      // Database
      const dbStatus =
        getStatusIcon(data.services.database.status) +
        " " +
        getStatusColor(data.services.database.status)(
          data.services.database.status
        );
      const dbDetails = data.services.database.message || "-";
      serviceRows.push(["Database", dbStatus, dbDetails]);

      // OpenAI
      const openaiStatus =
        getStatusIcon(data.services.openai.status) +
        " " +
        getStatusColor(data.services.openai.status)(
          data.services.openai.status
        );
      const openaiDetails =
        [
          data.services.openai.configured
            ? pc.green("configured")
            : pc.red("not configured"),
          data.services.openai.message || "",
        ]
          .filter(Boolean)
          .join(" • ") || "-";
      serviceRows.push(["OpenAI", openaiStatus, openaiDetails]);

      // MCP Jira
      const mcpStatus =
        getStatusIcon(data.services.mcp_jira.status) +
        " " +
        getStatusColor(data.services.mcp_jira.status)(
          data.services.mcp_jira.status
        );
      const mcpDetails = [];
      if (data.services.mcp_jira.enabled !== undefined) {
        mcpDetails.push(
          data.services.mcp_jira.enabled
            ? pc.green("enabled")
            : pc.gray("disabled")
        );
      }
      if (data.services.mcp_jira.connected !== undefined) {
        mcpDetails.push(
          data.services.mcp_jira.connected
            ? pc.green("connected")
            : pc.red("not connected")
        );
      }
      if (data.services.mcp_jira.initialized !== undefined) {
        mcpDetails.push(
          data.services.mcp_jira.initialized
            ? pc.green("initialized")
            : pc.yellow("not initialized")
        );
      }
      if (data.services.mcp_jira.toolCount !== undefined) {
        mcpDetails.push(pc.cyan(`${data.services.mcp_jira.toolCount} tools`));
      }
      if (data.services.mcp_jira.message) {
        mcpDetails.push(pc.gray(data.services.mcp_jira.message));
      }
      serviceRows.push(["MCP Jira", mcpStatus, mcpDetails.join(" • ") || "-"]);

      const servicesTable = createTable(
        ["Service", "Status", "Details"],
        serviceRows,
        {
          colWidths: [15, 20, 40],
        }
      );

      console.log(servicesTable);
      console.log("");

      if (data.status === "healthy") {
        Logger.success("All systems operational");
      } else if (data.status === "degraded") {
        Logger.warn("Some services are experiencing issues");
      } else {
        Logger.error("Critical systems are down");
      }
    }
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
      Logger.error((error as Error).message);
    }
    process.exit(1);
  }
}
