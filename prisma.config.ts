import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// prisma.config.ts disables Prisma's automatic .env loading.
loadEnv({ path: ".env" });
// Explicit shell or CI environment variables must win over local development
// settings so migrations can target preview and production databases safely.
loadEnv({ path: ".env.local" });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
