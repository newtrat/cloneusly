import { z } from "zod";

const optionalSecret = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().min(16).optional(),
);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  TEST_DATABASE_URL: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  COMPANY_TIME_ZONE: z.string().min(1).default("America/Los_Angeles"),
  CRON_SECRET: optionalSecret,
  ENABLE_TEST_TOPUPS: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  MAX_TEST_TOPUP_POINTS: z.coerce.number().int().positive().default(1000),
  ALLOWED_GIF_HOSTS: z
    .string()
    .default("media.giphy.com,media.tenor.com")
    .transform((v) =>
      v
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean),
    ),
  SEED_USER_PASSWORD: z.string().min(8).optional(),
  SLACK_SIGNING_SECRET: optionalSecret,
  SLACK_BOT_TOKEN: optionalSecret,
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration: ${parsed.error.message}`,
    );
  }
  cached = parsed.data;
  return cached;
}

export function resetEnvCache(): void {
  cached = null;
}
