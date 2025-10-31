import pc from "picocolors";

export class Logger {
  static info(message: string) {
    console.log(pc.cyan("ℹ️  " + message));
  }

  static success(message: string) {
    console.log(pc.green("✅ " + message));
  }

  static warn(message: string) {
    console.log(pc.yellow("⚠️  " + message));
  }

  static error(message: string) {
    console.log(pc.red("❌ " + message));
  }
}
