import { describe, expect, it } from "vitest";

import { getEnv, resetEnvCache } from "@/lib/env";

describe("env", () => {
  it("parses allowed GIF hosts from comma-separated input", () => {
    resetEnvCache();
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.BETTER_AUTH_SECRET = "x".repeat(32);
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    process.env.ALLOWED_GIF_HOSTS = "media.giphy.com, media.tenor.com";

    const env = getEnv();
    expect(env.ALLOWED_GIF_HOSTS).toEqual([
      "media.giphy.com",
      "media.tenor.com",
    ]);
  });

  it("defaults ENABLE_TEST_TOPUPS to false", () => {
    resetEnvCache();
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.BETTER_AUTH_SECRET = "x".repeat(32);
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    delete process.env.ENABLE_TEST_TOPUPS;

    const env = getEnv();
    expect(env.ENABLE_TEST_TOPUPS).toBe(false);
  });

  it("treats a blank optional cron secret as absent", () => {
    resetEnvCache();
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.BETTER_AUTH_SECRET = "x".repeat(32);
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    process.env.CRON_SECRET = "   ";

    expect(getEnv().CRON_SECRET).toBeUndefined();
  });

  it("treats blank optional Slack secrets as absent", () => {
    resetEnvCache();
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.BETTER_AUTH_SECRET = "x".repeat(32);
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    process.env.SLACK_SIGNING_SECRET = "   ";
    process.env.SLACK_BOT_TOKEN = "";

    const env = getEnv();
    expect(env.SLACK_SIGNING_SECRET).toBeUndefined();
    expect(env.SLACK_BOT_TOKEN).toBeUndefined();
  });

  it("parses Slack signing secret and bot token when set", () => {
    resetEnvCache();
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.BETTER_AUTH_SECRET = "x".repeat(32);
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    process.env.SLACK_SIGNING_SECRET = "slack-signing-secret";
    process.env.SLACK_BOT_TOKEN = "xoxb-test-bot-token";

    const env = getEnv();
    expect(env.SLACK_SIGNING_SECRET).toBe("slack-signing-secret");
    expect(env.SLACK_BOT_TOKEN).toBe("xoxb-test-bot-token");
  });
});
