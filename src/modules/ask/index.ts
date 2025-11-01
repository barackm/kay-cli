import { CommandRegistry } from "../../core/commandRegistry.js";
import { askCommand } from "./commands/index.js";

export const KayModule = {
  register: (registry: CommandRegistry) => {
    registry.register({
      name: "ask",
      description: "Ask Kay AI assistant a question",
      options: [
        {
          name: "interactive",
          description: "Enable interactive mode",
          type: "boolean",
        },
        {
          name: "confirm",
          description: "Enable confirm mode",
          type: "boolean",
        },
        {
          name: "json",
          description: "Output in JSON format",
          type: "boolean",
        },
      ],
      action: askCommand,
    });
  },
};
