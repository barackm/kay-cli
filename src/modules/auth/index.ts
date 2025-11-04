import { CommandRegistry } from "../../core/commandRegistry.js";
import {
  connectCommand,
  disconnectCommand,
  connectionsCommand,
  whoamiCommand,
} from "./commands/index.js";

export const KayModule = {
  register: (registry: CommandRegistry) => {
    registry.register({
      name: "connect",
      description: "Connect to a service",
      options: [
        {
          name: "service",
          description:
            "Service to connect to (kyg, jira, confluence, bitbucket)",
          type: "string",
        },
        {
          name: "s",
          description: "Short form for service",
          type: "string",
        },
      ],
      action: connectCommand,
    });

    registry.register({
      name: "disconnect",
      description: "Disconnect from a service",
      options: [
        {
          name: "service",
          description: "Service to disconnect from",
          type: "string",
        },
        {
          name: "s",
          description: "Short form for service",
          type: "string",
        },
      ],
      action: disconnectCommand,
    });

    registry.register({
      name: "connections",
      description: "List all service connections and their status",
      options: [
        { name: "json", description: "Output in JSON format", type: "boolean" },
      ],
      action: connectionsCommand,
    });

    registry.register({
      name: "whoami",
      description: "Show currently authenticated user information",
      options: [
        {
          name: "service",
          description: "Service to show user info for",
          type: "string",
        },
        {
          name: "s",
          description: "Short form for service",
          type: "string",
        },
        { name: "json", description: "Output in JSON format", type: "boolean" },
      ],
      action: whoamiCommand,
    });
  },
};
