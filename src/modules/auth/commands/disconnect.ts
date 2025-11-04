import * as p from "@clack/prompts";
import pc from "picocolors";
import { Logger } from "../../../core/logger.js";
import {
  ServiceName,
  DisconnectResponse,
  ConnectionsStatusResponse,
} from "../types.js";
import { ConfigManager } from "../../../core/configManager.js";
import { apiFetch } from "../../../core/apiClient.js";

function getServiceDisplayName(service: ServiceName): string {
  const names: Record<ServiceName, string> = {
    [ServiceName.KYG]: "KYG Trade",
    [ServiceName.JIRA]: "Jira",
    [ServiceName.CONFLUENCE]: "Confluence",
    [ServiceName.BITBUCKET]: "Bitbucket",
  };
  return names[service] || service;
}


const SUPPORTED_SERVICES: ServiceName[] = [
  ServiceName.KYG,
  ServiceName.JIRA,
  ServiceName.CONFLUENCE,
  ServiceName.BITBUCKET,
];

function validateService(
  service: string | boolean | undefined
): ServiceName | null {
  if (!service || service === true) {
    return null;
  }

  const normalized = service.toLowerCase();
  const serviceEnum = Object.values(ServiceName).find(
    (s) => s === normalized
  ) as ServiceName | undefined;

  if (serviceEnum && SUPPORTED_SERVICES.includes(serviceEnum)) {
    return serviceEnum;
  }

  return null;
}

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

    const sessionId = ConfigManager.get("session_id") as string | null;

    if (!sessionId) {
      Logger.warn("No session found. Please connect a service first.");
      return;
    }

    // Check if service is actually connected
    try {
      const statusResponse = await apiFetch(
        `/connections?session_id=${sessionId}`
      );

      if (statusResponse.ok) {
        const statusData =
          (await statusResponse.json()) as ConnectionsStatusResponse;
        const connections = statusData.connections;
        const isConnected = connections[service]?.connected === true;

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
      }
    } catch (error) {
      // If we can't check connection status, continue with disconnect attempt
      // This handles cases where backend is not available or network issues
      // The backend will handle the validation anyway
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
    s.start(`Disconnecting from ${service}...`);

    try {
      const response = await apiFetch(
        `/connections/disconnect?service=${service}`,
        {
          method: "POST",
          body: JSON.stringify({ session_id: sessionId }),
        }
      );

      s.stop();

      if (!response.ok) {
        throw new Error(
          `Disconnect failed: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as DisconnectResponse;
      Logger.success(
        data.message || `${serviceName} disconnected successfully.`
      );
    } catch (error) {
      s.stop();
      // Error handling is done by apiFetch
      throw error;
    }
  } catch (error) {
    p.cancel((error as Error).message);
    process.exit(1);
  }
}
