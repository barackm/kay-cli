import * as p from "@clack/prompts";
import pc from "picocolors";
import { Logger } from "../../../core/logger.js";
import { ServiceName, ServiceConnectionInfo } from "../types.js";
import { apiFetch } from "../../../core/apiClient.js";
import { ConfigManager } from "../../../core/configManager.js";

const SUPPORTED_SERVICES: ServiceName[] = [
  ServiceName.KYG,
  ServiceName.JIRA,
  ServiceName.CONFLUENCE,
  ServiceName.BITBUCKET,
];

function validateService(service: string | boolean | undefined): ServiceName | null {
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

function getServiceDisplayName(service: ServiceName): string {
  const names: Record<ServiceName, string> = {
    [ServiceName.KYG]: "KYG Trade",
    [ServiceName.JIRA]: "Jira",
    [ServiceName.CONFLUENCE]: "Confluence",
    [ServiceName.BITBUCKET]: "Bitbucket",
  };
  return names[service] || service;
}

function displayUserInfo(service: ServiceName, connectionInfo: ServiceConnectionInfo): void {
  const serviceName = getServiceDisplayName(service);
  console.log("");
  console.log(pc.bold(pc.cyan(`${serviceName} User Information`)));
  console.log("");

  if (!connectionInfo.connected) {
    console.log(pc.gray(`${serviceName} is not connected.`));
    console.log("");
    return;
  }

  if (!connectionInfo.user) {
    console.log(pc.gray(`No user information available for ${serviceName}.`));
    console.log("");
    return;
  }

  const user = connectionInfo.user;

  if (user.name) {
    console.log(`  ${pc.bold("Name:")}     ${user.name}`);
  }
  if (user.display_name && user.display_name !== user.name) {
    console.log(`  ${pc.bold("Display Name:")} ${user.display_name}`);
  }
  if (user.email) {
    console.log(`  ${pc.bold("Email:")}    ${user.email}`);
  }
  if (user.username) {
    console.log(`  ${pc.bold("Username:")} ${user.username}`);
  }
  if (user.account_type) {
    console.log(`  ${pc.bold("Type:")}     ${user.account_type}`);
  }
  if (user.account_status) {
    console.log(`  ${pc.bold("Status:")}   ${user.account_status}`);
  }
  if (user.account_id) {
    console.log(`  ${pc.bold("Account ID:")} ${user.account_id}`);
  }

  if (connectionInfo.metadata) {
    console.log("");
    if (connectionInfo.metadata.url) {
      console.log(`  ${pc.bold("URL:")}      ${connectionInfo.metadata.url}`);
    }
    if (connectionInfo.metadata.workspace_id) {
      console.log(`  ${pc.bold("Workspace ID:")} ${connectionInfo.metadata.workspace_id}`);
    }
  }

  console.log("");
}

export async function whoamiCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  const outputJson = options.json === true || options.json === "true";
  const service = validateService(options.s || options.service);

  try {
    const sessionId = ConfigManager.get("session_id") as string | null;

    if (!sessionId) {
      Logger.error("No active session found. Connect a service first with 'kay connect -s <service>'.");
      process.exit(1);
    }

    if (service) {
      // Show user info for specific service
      const s = p.spinner();
      s.start(`Fetching ${getServiceDisplayName(service)} user information...`);

      const response = await apiFetch(`/connections/${service}?session_id=${sessionId}`);

      s.stop();

      if (!response.ok) {
        throw new Error(
          `Failed to fetch user information: ${response.status} ${response.statusText}`
        );
      }

      const connectionInfo = (await response.json()) as ServiceConnectionInfo;

      if (outputJson) {
        console.log(JSON.stringify(connectionInfo, null, 2));
        return;
      }

      displayUserInfo(service, connectionInfo);
    } else {
      // Show user info for all connected services
      const s = p.spinner();
      s.start("Fetching connections information...");

      const response = await apiFetch(`/connections?session_id=${sessionId}`);

      s.stop();

      if (!response.ok) {
        throw new Error(
          `Failed to fetch connections: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as { connections: Record<string, ServiceConnectionInfo> };
      const connections = data.connections;

      if (outputJson) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      const connectedServices = SUPPORTED_SERVICES.filter(
        (s) => connections[s]?.connected === true
      );

      if (connectedServices.length === 0) {
        console.log("");
        console.log(pc.gray("No connected services found."));
        console.log("");
        return;
      }

      for (const svc of connectedServices) {
        displayUserInfo(svc, connections[svc]);
      }
    }
  } catch (error) {
    // Error handling is done by apiFetch
    p.cancel((error as Error).message);
    process.exit(1);
  }
}

