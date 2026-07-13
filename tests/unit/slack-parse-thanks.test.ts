import { describe, expect, it } from "vitest";

import {
  buildSlashIdempotencyKey,
  parseThanksCommand,
} from "@/lib/slack/parse-thanks";

describe("parseThanksCommand", () => {
  it("parses encoded Slack mentions, points, message, and hashtags", () => {
    const result = parseThanksCommand(
      "<@U111|alice> <@U222> +10 for being awesome people #teamwork #kudos",
    );

    expect(result).toEqual({
      ok: true,
      data: {
        recipients: [
          { kind: "slack_id", value: "U111" },
          { kind: "slack_id", value: "U222" },
        ],
        pointsPerRecipient: 10,
        text: "for being awesome people",
        hashtags: ["teamwork", "kudos"],
      },
    });
  });

  it("parses plain @handle mentions when Slack does not encode them", () => {
    const result = parseThanksCommand(
      "@jon-eric.cook +10 for the new PR",
    );

    expect(result).toEqual({
      ok: true,
      data: {
        recipients: [{ kind: "handle", value: "jon-eric.cook" }],
        pointsPerRecipient: 10,
        text: "for the new PR",
        hashtags: [],
      },
    });
  });

  it("accepts a bare points number without +", () => {
    const result = parseThanksCommand("<@U111> 5 great help #ops");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.pointsPerRecipient).toBe(5);
      expect(result.data.text).toBe("great help");
      expect(result.data.hashtags).toEqual(["ops"]);
    }
  });

  it("deduplicates mentioned recipients", () => {
    const result = parseThanksCommand("<@U111> <@U111> +1 nice work");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.recipients).toEqual([
        { kind: "slack_id", value: "U111" },
      ]);
    }
  });

  it("rejects empty text", () => {
    const result = parseThanksCommand("   ");
    expect(result.ok).toBe(false);
  });

  it("rejects missing mentions", () => {
    const result = parseThanksCommand("+10 for nothing");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/Mention at least one/i);
    }
  });

  it("rejects missing points", () => {
    const result = parseThanksCommand("<@U111> for being awesome");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/points/i);
    }
  });

  it("rejects missing message text", () => {
    const result = parseThanksCommand("<@U111> +10 #teamwork");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/message/i);
    }
  });
});

describe("buildSlashIdempotencyKey", () => {
  it("is stable for the same slash payload", () => {
    const a = buildSlashIdempotencyKey({
      teamId: "T1",
      userId: "U1",
      channelId: "C1",
      command: "/thanks",
      text: "<@U2> +1 hello",
    });
    const b = buildSlashIdempotencyKey({
      teamId: "T1",
      userId: "U1",
      channelId: "C1",
      command: "/thanks",
      text: "<@U2> +1 hello",
    });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it("changes when the command text changes", () => {
    const a = buildSlashIdempotencyKey({
      teamId: "T1",
      userId: "U1",
      channelId: "C1",
      command: "/thanks",
      text: "<@U2> +1 hello",
    });
    const b = buildSlashIdempotencyKey({
      teamId: "T1",
      userId: "U1",
      channelId: "C1",
      command: "/thanks",
      text: "<@U2> +2 hello",
    });
    expect(a).not.toBe(b);
  });
});
