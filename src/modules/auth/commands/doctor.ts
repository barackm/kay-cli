import fs from "fs";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { Logger } from "../../../core/logger.js";
import { ConfigManager } from "../../../core/configManager.js";
import { JiraClient } from "../jiraClient.js";

export async function doctorCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  const issues: string[] = [];
  const fixes: string[] = [];

  Logger.info("Running diagnostic checks...");
  console.log("");

  const checks = [
    {
      name: "Configuration file access",
      check: () => {
        try {
          const config = ConfigManager.load();
          return { pass: true, message: "✓ Can read ~/.kay/config.json" };
        } catch (error) {
          issues.push("Cannot read configuration file");
          fixes.push(
            "Check file permissions for ~/.kay/config.json or run 'kay login' to create it"
          );
          return {
            pass: false,
            message: "✗ Cannot read ~/.kay/config.json",
            error: (error as Error).message,
          };
        }
      },
    },
    {
      name: "Authentication status",
      check: () => {
        const client = new JiraClient();
        if (!client.isAuthenticated()) {
          issues.push("Not authenticated");
          fixes.push("Run 'kay login' to authenticate");
          return { pass: false, message: "✗ Not authenticated" };
        }
        return { pass: true, message: "✓ Authenticated" };
      },
    },
    {
      name: "Base URL format",
      check: () => {
        const client = new JiraClient();
        if (!client.isAuthenticated()) {
          return { pass: false, message: "✗ Skipped (not authenticated)" };
        }

        const baseUrl = client.getBaseUrl();
        if (!baseUrl) {
          issues.push("Base URL not set");
          fixes.push("Run 'kay login' to set base URL");
          return { pass: false, message: "✗ Base URL not set" };
        }

        try {
          const url = new URL(baseUrl);
          if (!["http:", "https:"].includes(url.protocol)) {
            issues.push("Invalid URL protocol");
            fixes.push("Base URL must start with http:// or https://");
            return { pass: false, message: "✗ Invalid URL protocol" };
          }
          return { pass: true, message: `✓ Valid URL: ${baseUrl}` };
        } catch (error) {
          issues.push("Invalid URL format");
          fixes.push(`Fix base URL format in ~/.kay/config.json: ${baseUrl}`);
          return {
            pass: false,
            message: "✗ Invalid URL format",
            error: (error as Error).message,
          };
        }
      },
    },
    {
      name: "Token validity",
      check: async () => {
        const client = new JiraClient();
        if (!client.isAuthenticated()) {
          return { pass: false, message: "✗ Skipped (not authenticated)" };
        }

        try {
          const user = await client.getMyself();
          return {
            pass: true,
            message: `✓ Token valid (authenticated as ${user.displayName})`,
          };
        } catch (error) {
          const errorMsg = (error as Error).message;
          issues.push("Invalid or expired token");
          fixes.push(
            "Run 'kay auth:reauth' or 'kay login' to refresh credentials"
          );
          return {
            pass: false,
            message: "✗ Token invalid or expired",
            error: errorMsg,
          };
        }
      },
    },
    {
      name: "Network connectivity",
      check: async () => {
        const client = new JiraClient();
        if (!client.isAuthenticated()) {
          return { pass: false, message: "✗ Skipped (not authenticated)" };
        }

        const baseUrl = client.getBaseUrl();
        if (!baseUrl) {
          return { pass: false, message: "✗ Skipped (no base URL)" };
        }

        try {
          const url = new URL(baseUrl);
          const testUrl = `${url.origin}/rest/api/3/serverInfo`;
          const response = await fetch(testUrl, {
            method: "GET",
            signal: AbortSignal.timeout(5000),
          });

          if (response.ok) {
            return { pass: true, message: "✓ Can reach Jira server" };
          } else {
            issues.push("Cannot reach Jira server");
            fixes.push(
              `Check network connectivity and verify base URL: ${baseUrl}`
            );
            return {
              pass: false,
              message: `✗ Server returned ${response.status}`,
            };
          }
        } catch (error) {
          const errorMsg = (error as Error).message;
          issues.push("Network connectivity issue");
          fixes.push(
            "Check your internet connection, firewall settings, and DNS resolution"
          );
          return {
            pass: false,
            message: "✗ Cannot reach server",
            error: errorMsg.includes("timeout")
              ? "Connection timeout"
              : errorMsg,
          };
        }
      },
    },
  ];

  for (const { name, check } of checks) {
    const result = await check();
    console.log(
      `${pc.bold(name + ":")} ${
        result.pass ? pc.green(result.message) : pc.red(result.message)
      }`
    );
    if (!result.pass && "error" in result && result.error) {
      console.log(`  ${pc.gray(result.error)}`);
    }
  }

  console.log("");

  if (issues.length === 0) {
    Logger.success(
      "All checks passed! Your authentication is working correctly."
    );
  } else {
    Logger.warn(`Found ${issues.length} issue(s):`);
    issues.forEach((issue) => {
      console.log(`  ${pc.yellow("⚠")} ${issue}`);
    });

    console.log("");
    Logger.info("Suggested fixes:");
    fixes.forEach((fix, index) => {
      console.log(`  ${pc.cyan(`${index + 1}.`)} ${fix}`);
    });
    console.log("");
  }
}
