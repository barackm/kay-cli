import { CommandRegistry } from "../../core/commandRegistry.js";
import {
  loginCommand,
  whoamiCommand,
  logoutCommand,
} from "./commands/index.js";

export const KayModule = {
  register: (registry: CommandRegistry) => {
    registry.register({
      name: "login",
      description: "Interactive browser-based login for Jira",
      options: [
        { name: "json", description: "Output in JSON format", type: "boolean" },
      ],
      action: loginCommand,
    });

    registry.register({
      name: "whoami",
      description: "Prints the currently authenticated Jira user",
      options: [
        { name: "json", description: "Output in JSON format", type: "boolean" },
      ],
      action: whoamiCommand,
    });

    registry.register({
      name: "logout",
      description: "Removes stored Jira credentials",
      action: logoutCommand,
    });
  },
};
