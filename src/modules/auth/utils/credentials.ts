import * as p from "@clack/prompts";
import { Logger } from "../../../core/logger.js";
import { ServiceName } from "../types.js";
import { getServiceDisplayName } from "./service.js";
import { connectToServer } from "./connection.js";
import { promptEmail, promptPassword } from "./prompts.js";

function getRequiredEnvVars(service: ServiceName): string[] {
  switch (service) {
    case ServiceName.JIRA:
      return ["JIRA_HOST", "JIRA_EMAIL", "JIRA_API_TOKEN"];
    case ServiceName.BITBUCKET:
      return ["BITBUCKET_TOKEN"];
    case ServiceName.CONFLUENCE:
      return ["CONFLUENCE_URL", "CONFLUENCE_USERNAME", "CONFLUENCE_API_TOKEN"];
    case ServiceName.KYG_KMESH:
      return ["API_BASE_URL", "BEARER_TOKEN"];
    default:
      return [];
  }
}

function getEnvVarPrompt(envVar: string): string {
  const prompts: Record<string, string> = {
    JIRA_HOST: "Jira host (e.g., your-instance.atlassian.net)",
    JIRA_EMAIL: "Jira email",
    JIRA_API_TOKEN: "Jira API token",
    BITBUCKET_TOKEN: "Bitbucket API token",
    CONFLUENCE_URL: "Confluence URL",
    CONFLUENCE_USERNAME: "Confluence username",
    CONFLUENCE_API_TOKEN: "Confluence API token",
    API_BASE_URL: "API base URL",
    BEARER_TOKEN: "Bearer token",
  };
  return prompts[envVar] || envVar;
}

export async function connectWithCredentials(
  service: ServiceName
): Promise<void> {
  Logger.info(`Connecting to ${getServiceDisplayName(service)}...`);
  console.log("");

  const requiredVars = getRequiredEnvVars(service);
  const env: Record<string, string> = {};

  for (const envVar of requiredVars) {
    const value = await promptPassword(getEnvVarPrompt(envVar));
    env[envVar] = value;
  }

  if (service === ServiceName.JIRA && env.JIRA_HOST) {
    env.JIRA_BASE_URL = env.JIRA_HOST;
  }

  const spinner = p.spinner();
  spinner.start("Connecting...");

  try {
    const result = await connectToServer(service, env);
    spinner.stop();
    Logger.success(
      result.message ||
        `${getServiceDisplayName(service)} connected successfully.`
    );
  } catch (error) {
    spinner.stop();
    throw error;
  }
}
