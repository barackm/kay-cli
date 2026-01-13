import * as p from "@clack/prompts";
import pc from "picocolors";
import { Logger } from "../../../core/logger.js";
import { ServiceName, DeleteResponse } from "../types.js";
import { apiFetch } from "../../../core/apiClient.js";
import {
  getServiceDisplayName,
  validateService,
  SUPPORTED_SERVICES,
} from "../utils/service.js";
import { checkServiceConnectionStatus } from "../utils/connection.js";

export async function disconnectCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  try {
    const service = validateService(options.s || options.service);

    if (!service) {
      Logger.error("Missing required flag: -s, --service");
      console.log("");
      console.log("Usage: kay disconnect -s <service>");
      console.log("");
      console.log("Supported services:");
      SUPPORTED_SERVICES.forEach((s) => {
        console.log(`  • ${s}`);
      });
      process.exit(1);
    }

    const isConnected = await checkServiceConnectionStatus(service);
    if (!isConnected) {
      const serviceName = getServiceDisplayName(service);
      Logger.warn(`${serviceName} is not connected.`);
      console.log("");
      console.log(
        pc.gray("Run ") +
          pc.cyan("kay connections") +
          pc.gray(" to see which services are connected.")
      );
      console.log("");
      return;
    }

    const serviceName = getServiceDisplayName(service);

    const shouldDisconnect = await p.confirm({
      message: `Are you sure you want to disconnect ${serviceName}?`,
      initialValue: false,
    });

    if (p.isCancel(shouldDisconnect)) {
      p.cancel("Disconnect cancelled");
      process.exit(0);
    }

    if (shouldDisconnect !== true) {
      Logger.info("Disconnect cancelled.");
      return;
    }

    const s = p.spinner();
    s.start(`Disconnecting from ${serviceName}...`);

    try {
      const response = await apiFetch(`/mcp/servers/${service}`, {
        method: "DELETE",
      });

      s.stop();

      if (!response.ok) {
        throw new Error(
          `Disconnect failed: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as DeleteResponse;
      Logger.success(
        data.message || `${serviceName} disconnected successfully.`
      );
    } catch (error) {
      s.stop();
      throw error;
    }
  } catch (error) {
    p.cancel((error as Error).message);
    process.exit(1);
  }
}
