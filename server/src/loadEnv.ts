import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Load env from the server package directory (not process.cwd()), so variables
 * work when the API is started from the monorepo root via npm workspaces.
 */
export function loadServerEnv(): void {
  const examplePath = path.join(serverRoot, ".env.example");
  const envPath = path.join(serverRoot, ".env");

  if (existsSync(examplePath)) {
    dotenv.config({ path: examplePath });
  }
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
  }
}
