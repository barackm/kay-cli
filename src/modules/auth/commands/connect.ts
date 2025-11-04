import * as p from "@clack/prompts";
import open from "open";
import pc from "picocolors";
import { Logger } from "../../../core/logger.js";
import { ConfigManager } from "../../../core/configManager.js";
import {
  ServiceName,
  ConnectResponse,
  StatusResponse,
  ConnectionsStatusResponse,
} from "../types.js";
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

const POLL_INTERVAL = 2000;
const MAX_POLL_ATTEMPTS = 150;

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

async function connectKayWithCredentials(service: ServiceName): Promise<void> {
  try {
    Logger.info(`Connecting to ${service}...`);
    console.log("");

    // Prompt for email and password
    const email = await p.text({
      message: "Email",
      placeholder: "your@email.com",
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return "Email is required";
        }
        if (!value.includes("@")) {
          return "Please enter a valid email address";
        }
      },
    });

    if (p.isCancel(email)) {
      p.cancel("Connection cancelled");
      process.exit(0);
    }

    const password = await p.password({
      message: "Password",
      mask: "*",
      validate: (value) => {
        if (!value || value.length === 0) {
          return "Password is required";
        }
      },
    });

    if (p.isCancel(password)) {
      p.cancel("Connection cancelled");
      process.exit(0);
    }

    const s = p.spinner();
    s.start("Authenticating...");

    const sessionId = ConfigManager.get("session_id") as string | null;
    const requestBody = {
      email: email.trim(),
      password: password,
      ...(sessionId ? { session_id: sessionId } : {}),
    };

    const connectResponse = await apiFetch(
      `/connections/connect?service=${service}`,
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      }
    );

    s.stop();

    if (!connectResponse.ok) {
      const errorData = await connectResponse.json().catch(() => ({}));
      const errorMessage =
        (errorData as { error?: string; message?: string }).error ||
        (errorData as { error?: string; message?: string }).message ||
        `Failed to connect: ${connectResponse.status} ${connectResponse.statusText}`;
      throw new Error(errorMessage);
    }

    const connectData = (await connectResponse.json()) as ConnectResponse;

    // Always update session_id from response
    if (connectData.session_id) {
      ConfigManager.set("session_id", connectData.session_id);
    }

    // Check if session was reset
    if (connectData.session_reset === true) {
      Logger.warn("⚠️  Session was reset. New session created.");
      console.log("");
    }

    // For email/password auth, if we get a successful response, we're done
    // Tokens will be handled automatically by apiFetch
    if (!connectData.authorization_url || !connectData.state) {
      Logger.success(
        `${getServiceDisplayName(service)} connected successfully.`
      );
      return;
    }

    Logger.info("Please authorize in your browser.");
    Logger.info("If the browser doesn't open, visit:");
    Logger.info(connectData.authorization_url);
    console.log("");

    await open(connectData.authorization_url);

    // Poll for completion
    const spinner = p.spinner();
    spinner.start("Waiting for authorization...");

    let attempts = 0;
    while (attempts < MAX_POLL_ATTEMPTS) {
      try {
        const statusResponse = await apiFetch(
          `/auth/status/${connectData.state}`
        );

        if (!statusResponse.ok) {
          if (statusResponse.status === 400) {
            spinner.stop();
            throw new Error("Invalid or expired state parameter");
          }
          throw new Error(
            `Status check failed: ${statusResponse.status} ${statusResponse.statusText}`
          );
        }

        const statusData = (await statusResponse.json()) as StatusResponse;

        if ("status" in statusData && statusData.status === "completed") {
          spinner.stop();

          // Tokens are handled automatically by apiFetch
          // Update session_id if provided
          if (connectData.session_id) {
            ConfigManager.set("session_id", connectData.session_id);
          }

          Logger.success(
            `${getServiceDisplayName(service)} connected successfully.`
          );
          return;
        }

        if ("status" in statusData && statusData.status === "pending") {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
          attempts++;
          continue;
        }

        spinner.stop();
        const status = (statusData as any).status || "unknown";
        throw new Error(`Unexpected status: ${status}`);
      } catch (error) {
        // Error handling is done by apiFetch
        spinner.stop();
        throw error;
      }
    }

    spinner.stop();
    throw new Error(
      "Connection timeout (5 minutes). Please try again or check if you completed the authorization flow."
    );
  } catch (error) {
    p.cancel((error as Error).message);
    process.exit(1);
  }
}

export async function connectCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  try {
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

    // Check if service is already connected
    const sessionId = ConfigManager.get("session_id") as string | null;
    if (sessionId) {
      try {
        const statusResponse = await apiFetch(
          `/connections?session_id=${sessionId}`
        );

        if (statusResponse.ok) {
          const statusData =
            (await statusResponse.json()) as ConnectionsStatusResponse;
          const connections = statusData.connections;
          const isConnected = connections[service]?.connected === true;

          if (isConnected) {
            const serviceName = getServiceDisplayName(service);
            Logger.warn(`${serviceName} is already connected.`);
            console.log("");
            console.log(
              pc.gray("Run ") +
                pc.cyan("kay connections") +
                pc.gray(" to see which services are not connected.")
            );
            console.log("");
            return;
          }
        }
      } catch (error) {
        // If we can't check connection status, continue with connection attempt
        // This handles cases where backend is not available or network issues
      }
    }

    const hadSessionId = !!sessionId;

    // For Kay service, use email/password authentication
    if (service === ServiceName.KYG) {
      return await connectKayWithCredentials(service);
    }

    Logger.info(`Connecting to ${service}...`);

    const requestBody = sessionId ? { session_id: sessionId } : {};

    const connectResponse = await apiFetch(
      `/connections/connect?service=${service}`,
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      }
    );

    if (!connectResponse.ok) {
      throw new Error(
        `Failed to initiate connection: ${connectResponse.status} ${connectResponse.statusText}`
      );
    }

    const connectData = (await connectResponse.json()) as ConnectResponse;

    // Always update session_id from response (backend may have created a new one)
    if (connectData.session_id) {
      ConfigManager.set("session_id", connectData.session_id);
    }

    // Check if session was reset and show warning
    const sessionWasReset = connectData.session_reset === true;
    if (sessionWasReset) {
      Logger.warn("⚠️  Session was reset. New session created.");
      console.log("");
    }

    // For OAuth flow, we need authorization_url and state
    if (!connectData.authorization_url || !connectData.state) {
      throw new Error(
        "Invalid response from backend: missing authorization URL or state"
      );
    }

    Logger.info("Please authorize in your browser.");
    Logger.info("If the browser doesn't open, visit:");
    Logger.info(connectData.authorization_url);
    console.log("");

    await open(connectData.authorization_url);

    // Poll for completion if:
    // - This is the first connection (no session_id before), OR
    // - Session was reset (treating as new connection)
    const shouldPoll = !hadSessionId || sessionWasReset;

    if (shouldPoll) {
      const s = p.spinner();
      s.start("Waiting for authorization...");

      let attempts = 0;

      while (attempts < MAX_POLL_ATTEMPTS) {
        try {
          const statusResponse = await fetch(
            `/auth/status/${connectData.state}`
          );

          if (!statusResponse.ok) {
            if (statusResponse.status === 400) {
              s.stop();
              throw new Error("Invalid or expired state parameter");
            }
            throw new Error(
              `Status check failed: ${statusResponse.status} ${statusResponse.statusText}`
            );
          }

          const statusData = (await statusResponse.json()) as StatusResponse;

          if ("status" in statusData && statusData.status === "completed") {
            s.stop();

            // Tokens are handled automatically by apiFetch
            // Update session_id if provided
            if (connectData.session_id) {
              ConfigManager.set("session_id", connectData.session_id);
            }

            const serviceName = getServiceDisplayName(service);
            Logger.success(`${serviceName} connected successfully.`);
            return;
          }

          if ("status" in statusData && statusData.status === "pending") {
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
            attempts++;
            continue;
          }

          s.stop();
          const status = (statusData as any).status || "unknown";
          throw new Error(`Unexpected status: ${status}`);
        } catch (error) {
          if (
            error instanceof Error &&
            (error.message.includes("fetch failed") ||
              error.message.includes("ECONNREFUSED"))
          ) {
            s.stop();
            throw new Error(
              `Cannot connect to Kay backend. Make sure the backend is running.`
            );
          }
          throw error;
        }
      }

      s.stop();
      throw new Error(
        "Connection timeout (5 minutes). Please try again or check if you completed the authorization flow."
      );
    } else {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
      Logger.success(`${serviceName} connected successfully.`);
    }
  } catch (error) {
    p.cancel((error as Error).message);
    process.exit(1);
  }
}
