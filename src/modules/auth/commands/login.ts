import * as p from "@clack/prompts";
import { Logger } from "../../../core/logger.js";
import { JiraClient } from "../jiraClient.js";

export async function loginCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  const outputJson = options.json === true || options.json === "true";

  try {
    const client = new JiraClient();

    if (client.isAuthenticated() && !outputJson) {
      const existingUser = await client.getMyself().catch(() => null);
      const baseUrl = client.getBaseUrl();

      if (existingUser) {
        Logger.warn("You are already logged in.");
        Logger.info(
          `Currently authenticated as: ${existingUser.displayName} (${existingUser.emailAddress})`
        );
        if (baseUrl) {
          Logger.info(`Base URL: ${baseUrl}`);
        }

        const shouldLogout = await p.confirm({
          message:
            "Would you like to logout and login with different credentials?",
          initialValue: false,
        });

        if (p.isCancel(shouldLogout)) {
          p.cancel("Login cancelled");
          process.exit(0);
        }

        if (shouldLogout === true) {
          client.clearCredentials();
          Logger.info("Logged out. Proceeding with login...");
          console.log("");
        } else {
          Logger.info("Login cancelled. Using existing credentials.");
          return;
        }
      }
    }

    let baseUrl = (options["base-url"] || options.baseUrl) as
      | string
      | undefined;

    if (!baseUrl && !outputJson) {
      baseUrl = (await p.text({
        message: "Enter your Jira base URL",
        placeholder: "https://yourcompany.atlassian.net",
        validate: (value) => {
          if (!value || !value.startsWith("http")) {
            return "Please enter a valid URL starting with http:// or https://";
          }
          try {
            new URL(value);
          } catch {
            return "Please enter a valid URL";
          }
        },
      })) as string;
    }

    if (p.isCancel(baseUrl)) {
      p.cancel("Login cancelled");
      process.exit(0);
    }

    if (!baseUrl) {
      Logger.error("Base URL is required");
      process.exit(1);
    }

    baseUrl = baseUrl.replace(/\/$/, "");

    Logger.info("Please create an API token at:");
    Logger.info("https://id.atlassian.com/manage-profile/security/api-tokens");
    Logger.info("");

    const email = (await p.text({
      message: "Enter your Atlassian email",
      placeholder: "user@example.com",
      validate: (value) => {
        if (!value || !value.includes("@")) {
          return "Please enter a valid email address";
        }
      },
    })) as string;

    if (p.isCancel(email)) {
      p.cancel("Login cancelled");
      process.exit(0);
    }

    const apiToken = (await p.password({
      message: "Enter your API token",
      validate: (value) => {
        if (!value || value.length < 10) {
          return "API token is required";
        }
      },
    })) as string;

    if (p.isCancel(apiToken)) {
      p.cancel("Login cancelled");
      process.exit(0);
    }

    const s = p.spinner();
    s.start("Validating credentials...");

    const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");
    const apiUrl = new URL("/rest/api/3/myself", baseUrl).toString();

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      s.stop();
      if (response.status === 401) {
        throw new Error(
          "Invalid credentials. Please check your email and API token."
        );
      }
      if (response.status === 404) {
        throw new Error(`Jira instance not found at ${baseUrl}`);
      }
      throw new Error(
        `Authentication failed: ${response.status} ${response.statusText}`
      );
    }

    const user = (await response.json()) as {
      accountId: string;
      displayName: string;
      emailAddress: string;
    };

    s.stop();

    const newClient = new JiraClient();
    newClient.saveCredentialsWithBasicAuth(email, apiToken, baseUrl);

    if (outputJson) {
      console.log(
        JSON.stringify({
          success: true,
          email: user.emailAddress,
          accountId: user.accountId,
          displayName: user.displayName,
          baseUrl,
        })
      );
    } else {
      Logger.success(`Successfully authenticated as ${user.displayName}`);
      Logger.info(`Email: ${user.emailAddress}`);
      Logger.info(`Account ID: ${user.accountId}`);
      Logger.info(`Base URL: ${baseUrl}`);
    }
  } catch (error) {
    p.cancel((error as Error).message);
    process.exit(1);
  }
}
