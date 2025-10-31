import { CommandRegistry } from "../../core/commandRegistry.js";
import {
  loginCommand,
  whoamiCommand,
  logoutCommand,
  statusCommand,
  reauthCommand,
  doctorCommand,
} from "./commands/index.js";

export const KayModule = {
  register: (registry: CommandRegistry) => {
    registry.register({
      name: "login",
      description: "Interactive browser-based login for Jira",
      action: loginCommand,
    });

    registry.register({
      name: "whoami",
      description: "Prints the currently authenticated Jira user",
      action: whoamiCommand,
    });

    registry.register({
      name: "logout",
      description: "Removes stored Jira credentials",
      action: logoutCommand,
    });

    registry.register({
      name: "auth:status",
      description: "Quick health check for Jira connection",
      action: statusCommand,
    });

    registry.register({
      name: "auth:reauth",
      description: "Re-run the login flow with pre-filled values",
      action: reauthCommand,
    });

    registry.register({
      name: "auth:doctor",
      description: "Troubleshooter that runs diagnostic checks",
      action: doctorCommand,
    });
  },
};
