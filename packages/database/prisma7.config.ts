import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

const nodeEnv = process.env.NODE_ENV ?? "development";
const envFile = path.resolve(import.meta.dirname, `../../.env.${nodeEnv}`);

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

export default defineConfig({
  schema: "prisma/",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
