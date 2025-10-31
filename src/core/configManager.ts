import fs from "fs";
import os from "os";
import path from "path";

const CONFIG_DIR = path.join(os.homedir(), ".kay");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export class ConfigManager {
  static load(): Record<string, unknown> {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  }

  static save(config: Record<string, unknown>): void {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  }

  static get(key: string) {
    const config = this.load();
    return config[key];
  }

  static set(key: string, value: any) {
    const config = this.load();
    config[key] = value;
    this.save(config);
  }

  static delete(key: string) {
    const config = this.load();
    delete config[key];
    this.save(config);
  }
}
