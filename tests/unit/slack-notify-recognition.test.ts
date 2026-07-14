import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetEnvCache } from "@/lib/env";

// The Slack SDK is imported transitively through `notify-recognition`. Any
// unexpected call would try to hit the real Slack API, which would fail loudly
// in unit tests \u2014 so we stub the client factory to catch that mistake.
vi.mock("@/lib/slack/client", () => ({
  getSlackClient: vi.fn(() => {
    throw new Error(
      "getSlackClient should not be called when SLACK_BOT_TOKEN is unset.",
    );
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(async () => {
        throw new Error(
          "prisma.user.findMany should not be called when the feature is disabled or the recipient list is empty.",
        );
      }),
    },
  },
}));

describe("notifyRecognitionRecipients", () => {
  const originalToken = process.env.SLACK_BOT_TOKEN;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalAuthSecret = process.env.BETTER_AUTH_SECRET;

  beforeEach(() => {
    resetEnvCache();
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.BETTER_AUTH_SECRET = "x".repeat(32);
  });

  afterEach(() => {
    resetEnvCache();
    if (originalToken === undefined) {
      delete process.env.SLACK_BOT_TOKEN;
    } else {
      process.env.SLACK_BOT_TOKEN = originalToken;
    }
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
    if (originalAuthSecret === undefined) {
      delete process.env.BETTER_AUTH_SECRET;
    } else {
      process.env.BETTER_AUTH_SECRET = originalAuthSecret;
    }
  });

  it("is a silent no-op when SLACK_BOT_TOKEN is unset", async () => {
    delete process.env.SLACK_BOT_TOKEN;

    const { notifyRecognitionRecipients } = await import(
      "@/lib/slack/notify-recognition"
    );

    await expect(
      notifyRecognitionRecipients({
        senderName: "Alice",
        pointsPerRecipient: 5,
        recognitionText: "great work",
        recognitionId: "rec_1",
        recipientIds: ["user_1", "user_2"],
      }),
    ).resolves.toBeUndefined();
  });

  it("is a silent no-op when the recipient list is empty (token set)", async () => {
    process.env.SLACK_BOT_TOKEN = "xoxb-test-token-abcdef";

    const { notifyRecognitionRecipients } = await import(
      "@/lib/slack/notify-recognition"
    );

    await expect(
      notifyRecognitionRecipients({
        senderName: "Alice",
        pointsPerRecipient: 5,
        recognitionText: null,
        recognitionId: "rec_1",
        recipientIds: [],
      }),
    ).resolves.toBeUndefined();
  });
});
