import * as p from "@clack/prompts";
import pc from "picocolors";
import { Logger } from "../../../core/logger.js";
import { ServiceName } from "../types.js";
import {
  SUPPORTED_SERVICES,
  validateService,
  getServiceDisplayName,
} from "../utils/service.js";
import {
  checkServiceConnectionStatus,
  connectToServer,
} from "../utils/connection.js";
import { connectWithCredentials } from "../utils/credentials.js";
import { authClient } from "../authClient.js";

export async function connectCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  try {
    if (!authClient.isAuthenticated()) {
      Logger.error("Not authenticated. Please run 'kay login' first.");
      console.log("");
      process.exit(1);
    }

    const service = validateService(options.s || options.service);

    if (!service) {
      Logger.error("Missing required flag: -s, --service");
      console.log("");
      console.log("Usage: kay connect -s <service>");
      console.log("");
      console.log("Supported services:");
      SUPPORTED_SERVICES.forEach((s) => {
        console.log(`  • ${s}`);
      });
      process.exit(1);
    }

    const isConnected = await checkServiceConnectionStatus(service);
    if (isConnected) {
      const serviceName = getServiceDisplayName(service);
      Logger.warn(`${serviceName} is already connected.`);
      console.log("");
      console.log(
        pc.gray("Run ") +
          pc.cyan("kay connections") +
          pc.gray(" to see which services are connected.")
      );
      console.log("");
      return;
    }

    await connectWithCredentials(service);
  } catch (error) {
    p.cancel((error as Error).message);
    process.exit(1);
  }
}
