import { CommandRegistry } from "../../core/commandRegistry.js";
import { healthCommand } from "./commands/index.js";

export const KayModule = {
  register: (registry: CommandRegistry) => {
    registry.register({
      name: "health",
      description: "Check Kay backend service health status",
      options: [
        {
          name: "json",
          description: "Output in JSON format",
          type: "boolean",
        },
      ],
      action: healthCommand,
    });
  },
};

