import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { Logger } from "./logger.js";
import { CommandRegistry } from "./commandRegistry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isBuilt = __dirname.includes("build");
const modulesDir = path.join(
  process.cwd(),
  isBuilt ? "build/modules" : "src/modules"
);
const moduleExt = isBuilt ? ".js" : ".ts";

export async function loadModules(registry: CommandRegistry) {
  if (!fs.existsSync(modulesDir)) {
    Logger.warn("No modules directory found.");
    return;
  }

  const modules = fs
    .readdirSync(modulesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  for (const moduleName of modules) {
    const modulePath = path.join(modulesDir, moduleName, `index${moduleExt}`);
    if (!fs.existsSync(modulePath)) continue;

    try {
      const mod = await import(modulePath);
      if (mod.KayModule?.register) {
        mod.KayModule.register(registry);
      } else {
        Logger.warn(`Skipping ${moduleName}: invalid module format.`);
      }
    } catch (err) {
      Logger.error(`Failed to load ${moduleName}: ${(err as Error).message}`);
    }
  }
}
